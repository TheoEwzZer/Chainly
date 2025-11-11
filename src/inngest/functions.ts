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

export const executeWorkflow = inngest.createFunction(
  { id: "execute-workflow" },
  { event: "workflow/execute.workflow" },
  async ({ event, step }) => {
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

    let context: WorkflowContext = event.data.initialData || {};

    for (const node of sortedNodes) {
      const executor: NodeExecutor = getExecutor(node.type);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        context,
        step,
      });
    }

    return { workflowId, result: context };
  }
);
