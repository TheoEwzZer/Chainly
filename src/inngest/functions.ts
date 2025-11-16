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
} from "@/generated/prisma/client";
import type { Jsonify } from "inngest/types";
import { topologicalSort } from "./utils";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { webhookTriggerChannel } from "./channels/webhook-trigger";
import { geminiChannel } from "./channels/gemini";
import { anthropicChannel } from "./channels/anthropic";
import { openaiChannel } from "./channels/openai";
import { discordChannel } from "./channels/discord";

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
      geminiChannel(),
      anthropicChannel(),
      openaiChannel(),
      discordChannel(),
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

    await step.run("create-execution", async (): Promise<Execution> => {
      return await prisma.execution.create({
        data: { workflowId, inngestEventId },
      });
    });

    const sortedNodes: Jsonify<Node>[] = await step.run(
      "prepare-workflow",
      async (): Promise<Node[]> => {
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
          return topologicalSort(workflow.nodes, workflow.connections);
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

    for (const node of sortedNodes) {
      const executor: NodeExecutor = getExecutor(node.type);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        context,
        step,
        publish,
        userId,
      });
    }

    await step.run("update-execution", async (): Promise<Execution> => {
      return await prisma.execution.update({
        where: { inngestEventId, workflowId },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context as Prisma.InputJsonValue,
        },
      });
    });

    return { workflowId, result: context };
  }
);
