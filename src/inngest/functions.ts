import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/lib/db";
import {
  ExecutionStatus,
  type Connection,
  type Execution,
  type Node,
  type Workflow,
  Prisma,
  type ExecutionStep,
} from "@/generated/prisma/client";
import type { Jsonify } from "inngest/types";
import { topologicalSort, hasFailedPredecessor } from "./utils";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { webhookTriggerChannel } from "./channels/webhook-trigger";
import { githubTriggerChannel } from "./channels/github-trigger";
import { geminiChannel } from "./channels/gemini";
import { anthropicChannel } from "./channels/anthropic";
import { openaiChannel } from "./channels/openai";
import { discordChannel } from "./channels/discord";
import { googleCalendarChannel } from "./channels/google-calendar";
import { scheduleTriggerChannel } from "./channels/schedule-trigger";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: process.env.NODE_ENV === "production" ? 3 : 0,
    timeouts: { start: "10s" },
    onFailure: async ({ event }) => {
      return prisma.execution.update({
        where: { inngestEventId: event.data.event.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        },
      });
    },
  },
  {
    event: "workflow/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      googleFormTriggerChannel(),
      webhookTriggerChannel(),
      githubTriggerChannel(),
      scheduleTriggerChannel(),
      geminiChannel(),
      anthropicChannel(),
      openaiChannel(),
      discordChannel(),
      googleCalendarChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const inngestEventId: string | undefined = event.id;
    const { workflowId } = event.data as { workflowId: string };

    if (!inngestEventId) {
      throw new NonRetriableError("Inngest event ID is required");
    }

    if (!workflowId) {
      throw new NonRetriableError("Workflow ID is required");
    }

    const executionRecord = await step.run(
      "create-execution",
      async (): Promise<Execution> => {
        return await prisma.execution.create({
          data: { workflowId, inngestEventId },
        });
      }
    );

    const triggerNodeId: string | undefined = (
      event.data as { triggerNodeId?: string }
    ).triggerNodeId;

    const {
      sortedNodes,
      connections,
    }: { sortedNodes: Jsonify<Node>[]; connections: Jsonify<Connection>[] } =
      await step.run(
        "prepare-workflow",
        async (): Promise<{
          sortedNodes: Node[];
          connections: Connection[];
        }> => {
          const workflow: {
            nodes: Node[];
            connections: Connection[];
          } & Workflow = await prisma.workflow.findUniqueOrThrow({
            where: { id: workflowId },
            include: {
              nodes: true,
              connections: true,
            },
          });

          try {
            return {
              sortedNodes: topologicalSort(
                workflow.nodes,
                workflow.connections,
                triggerNodeId
              ),
              connections: workflow.connections,
            };
          } catch (error) {
            if (error instanceof Error && error.message.includes("Cyclic")) {
              throw new NonRetriableError(
                "Cyclic dependency detected in workflow"
              );
            }
            throw error;
          }
        }
      );

    const userId: string = await step.run(
      "find-user-id",
      async (): Promise<string> => {
        const workflow: { userId: string } =
          await prisma.workflow.findUniqueOrThrow({
            where: { id: workflowId },
            select: {
              userId: true,
            },
          });
        return workflow.userId;
      }
    );

    if (!userId) {
      throw new NonRetriableError("User ID not found");
    }

    let context: WorkflowContext = event.data.initialData || {};
    const failedNodeIds: Set<string> = new Set();
    let hasAnyNodeFailed: boolean = false;

    for (const [order, node] of sortedNodes.entries()) {
      const currentContext: WorkflowContext = context;

      const shouldSkip: boolean = hasFailedPredecessor(
        node.id,
        connections as unknown as Connection[],
        failedNodeIds
      );

      if (shouldSkip) {
        await prisma.executionStep.upsert({
          where: {
            executionId_order: {
              executionId: executionRecord.id,
              order,
            },
          },
          create: {
            executionId: executionRecord.id,
            nodeId: node.id,
            nodeType: node.type,
            order,
            status: ExecutionStatus.FAILED,
            input: currentContext as Prisma.InputJsonValue,
            error: "Skipped due to failed predecessor",
            completedAt: new Date(),
          },
          update: {
            nodeId: node.id,
            nodeType: node.type,
            status: ExecutionStatus.FAILED,
            input: currentContext as Prisma.InputJsonValue,
            output: Prisma.JsonNull,
            error: "Skipped due to failed predecessor",
            errorStack: null,
            completedAt: new Date(),
            startedAt: new Date(),
          },
        });
        failedNodeIds.add(node.id);
        continue;
      }

      const stepRecord: ExecutionStep = await prisma.executionStep.upsert({
        where: {
          executionId_order: {
            executionId: executionRecord.id,
            order,
          },
        },
        create: {
          executionId: executionRecord.id,
          nodeId: node.id,
          nodeType: node.type,
          order,
          status: ExecutionStatus.RUNNING,
          input: currentContext as Prisma.InputJsonValue,
        },
        update: {
          nodeId: node.id,
          nodeType: node.type,
          status: ExecutionStatus.RUNNING,
          input: currentContext as Prisma.InputJsonValue,
          output: Prisma.JsonNull,
          error: null,
          errorStack: null,
          completedAt: null,
          startedAt: new Date(),
        },
      });

      const executor: NodeExecutor = getExecutor(node.type);
      try {
        const result: WorkflowContext = await executor({
          data: node.data as Record<string, unknown>,
          nodeId: node.id,
          context: currentContext,
          step,
          publish,
          userId,
        });

        await prisma.executionStep.update({
          where: { id: stepRecord.id },
          data: {
            status: ExecutionStatus.SUCCESS,
            completedAt: new Date(),
            output: result as Prisma.InputJsonValue,
          },
        });

        context = result;
      } catch (error) {
        hasAnyNodeFailed = true;
        failedNodeIds.add(node.id);

        await prisma.executionStep.update({
          where: { id: stepRecord.id },
          data: {
            status: ExecutionStatus.FAILED,
            completedAt: new Date(),
            error: error instanceof Error ? error.message : "Unknown error",
            errorStack:
              error instanceof Error ? error.stack : "No stack trace available",
          },
        });
      }
    }

    await step.run("update-execution", async (): Promise<Execution> => {
      return await prisma.execution.update({
        where: { inngestEventId, workflowId },
        data: {
          status: hasAnyNodeFailed
            ? ExecutionStatus.FAILED
            : ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context as Prisma.InputJsonValue,
          error: hasAnyNodeFailed
            ? "One or more nodes failed during execution"
            : null,
        },
      });
    });

    return { workflowId, result: context };
  }
);
