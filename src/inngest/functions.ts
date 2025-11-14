import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/lib/db";
import type { Connection, Node, Workflow } from "@/generated/prisma/client";
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
import { geminiChannel } from "./channels/gemini";
import { anthropicChannel } from "./channels/anthropic";
import { openaiChannel } from "./channels/openai";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 1,
    timeouts: { start: "10s" },
  },
  {
    event: "workflow/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      googleFormTriggerChannel(),
      geminiChannel(),
      anthropicChannel(),
      openaiChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const { workflowId } = event.data;

    if (!workflowId) {
      throw new NonRetriableError("Workflow ID is required");
    }

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

    return { workflowId, result: context };
  }
);
