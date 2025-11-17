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
import { humanApprovalChannel } from "./channels/human-approval";
import { loopChannel } from "./channels/loop";
import { PauseExecutionError } from "@/features/executions/components/human-approval/executor";
import { NodeType } from "@/generated/prisma/enums";

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
      humanApprovalChannel(),
      loopChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const inngestEventId: string | undefined = event.id;
    const eventData = event.data as {
      workflowId: string;
      triggerNodeId?: string;
      resumeFromNodeId?: string;
      executionId?: string;
      initialData?: WorkflowContext;
    };
    const { workflowId } = eventData;

    if (!inngestEventId) {
      throw new NonRetriableError("Inngest event ID is required");
    }

    if (!workflowId) {
      throw new NonRetriableError("Workflow ID is required");
    }

    const executionRecord = await step.run(
      "get-or-create-execution",
      async () => {
        if (eventData.executionId) {
          const existing: Execution | null = await prisma.execution.findUnique({
            where: { id: eventData.executionId },
          });
          if (existing) {
            return existing;
          }
        }
        return await prisma.execution.create({
          data: { workflowId, inngestEventId },
        });
      }
    );

    const triggerNodeId: string | undefined = eventData.triggerNodeId;
    const resumeFromNodeId: string | undefined = eventData.resumeFromNodeId;

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

    let context: WorkflowContext = eventData.initialData || {};
    const failedNodeIds: Set<string> = new Set();
    const executedInLoopNodeIds: Set<string> = new Set();
    let hasAnyNodeFailed: boolean = false;

    let startIndex: number = 0;
    if (resumeFromNodeId) {
      const resumeIndex: number = sortedNodes.findIndex(
        (n: Jsonify<Node>): boolean => n.id === resumeFromNodeId
      );
      if (resumeIndex !== -1) {
        startIndex = resumeIndex + 1;
      }
    }

    for (
      let orderIndex: number = startIndex;
      orderIndex < sortedNodes.length;
      orderIndex++
    ) {
      const executionCheck: { status: ExecutionStatus } | null = await step.run(
        `check-execution-status-${orderIndex}`,
        async () => {
          return await prisma.execution.findUnique({
            where: { id: executionRecord.id },
            select: { status: true },
          });
        }
      );

      if (executionCheck?.status !== ExecutionStatus.RUNNING) {
        return {
          workflowId,
          result: context,
          cancelled: executionCheck?.status === ExecutionStatus.FAILED,
        };
      }

      const node = sortedNodes[orderIndex];
      const order: number = orderIndex;
      const currentContext: WorkflowContext = context;

      if (executedInLoopNodeIds.has(node.id)) {
        continue;
      }

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
          executionId: executionRecord.id,
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

        if (node.type === NodeType.LOOP) {
          const loopVariableName: string | undefined = (
            node.data as { variableName?: string }
          )?.variableName;
          if (loopVariableName && result[loopVariableName]) {
            const loopData = result[loopVariableName] as any;
            if (loopData._loopMetadata) {
              const loopMetadata = loopData._loopMetadata;
              const items = loopData.items || [];
              const { itemVariableName } = loopMetadata;

              const loopConnectedNodeIds: string[] = (
                connections as unknown as Connection[]
              )
                .filter(
                  (conn: Connection): boolean => conn.fromNodeId === node.id
                )
                .map((conn: Connection): string => conn.toNodeId);

              if (loopConnectedNodeIds.length > 0 && items.length > 0) {
                const loopResults: unknown[] = [];

                const loopScopeNodes: Jsonify<Node>[] = [];
                const processedNodeIds = new Set<string>();

                const collectLoopScopeNodes = (nodeId: string) => {
                  if (processedNodeIds.has(nodeId)) return;
                  processedNodeIds.add(nodeId);

                  const currentNode = sortedNodes.find(
                    (n: Jsonify<Node>): boolean => n.id === nodeId
                  );

                  if (
                    currentNode &&
                    !loopScopeNodes.some(
                      (n: Jsonify<Node>): boolean => n.id === currentNode.id
                    )
                  ) {
                    loopScopeNodes.push(currentNode);
                  }

                  const connectedNodes: string[] = (
                    connections as unknown as Connection[]
                  )
                    .filter(
                      (conn: Connection): boolean => conn.fromNodeId === nodeId
                    )
                    .map((conn: Connection): string => conn.toNodeId);

                  for (const connectedNodeId of connectedNodes) {
                    collectLoopScopeNodes(connectedNodeId);
                  }
                };

                for (const connectedNodeId of loopConnectedNodeIds) {
                  collectLoopScopeNodes(connectedNodeId);
                }

                for (const loopScopeNode of loopScopeNodes) {
                  executedInLoopNodeIds.add(loopScopeNode.id);
                }

                const sortedLoopScopeNodes = [...loopScopeNodes].sort(
                  (a, b) => {
                    const orderA: number = sortedNodes.findIndex(
                      (n: Jsonify<Node>): boolean => n.id === a.id
                    );
                    const orderB: number = sortedNodes.findIndex(
                      (n: Jsonify<Node>): boolean => n.id === b.id
                    );
                    return orderA - orderB;
                  }
                );

                for (let i: number = 0; i < items.length; i++) {
                  const executionCheck: { status: ExecutionStatus } | null =
                    await step.run(
                      `check-execution-status-loop-${node.id}-${i}`,
                      async () => {
                        return await prisma.execution.findUnique({
                          where: { id: executionRecord.id },
                          select: { status: true },
                        });
                      }
                    );

                  if (executionCheck?.status !== ExecutionStatus.RUNNING) {
                    break;
                  }

                  const item = items[i];

                  await step.run(
                    `publish-iteration-${node.id}-${i}`,
                    async () => {
                      await publish(
                        loopChannel().iteration({
                          nodeId: node.id,
                          current: i + 1,
                          total: items.length,
                        })
                      );
                    }
                  );

                  let itemContext: WorkflowContext = {
                    ...context,
                    [itemVariableName]: item,
                  };

                  const loopIterationPrefix = `loop-${i}-`;
                  const loopStepWrapper = {
                    ...step,
                    run: <TFn extends (...args: any[]) => unknown>(
                      idOrOptions:
                        | string
                        | { id?: string; name?: string; [key: string]: any },
                      fn: TFn,
                      ...input: Parameters<TFn>
                    ) => {
                      if (typeof idOrOptions === "string") {
                        const uniqueStepId = `${loopIterationPrefix}${idOrOptions}`;
                        return step.run(uniqueStepId, fn, ...input);
                      } else {
                        const uniqueId: string = idOrOptions.id
                          ? `${loopIterationPrefix}${idOrOptions.id}`
                          : idOrOptions.name
                          ? `${loopIterationPrefix}${idOrOptions.name}`
                          : `${loopIterationPrefix}step`;
                        return step.run(
                          { ...idOrOptions, id: uniqueId },
                          fn,
                          ...input
                        );
                      }
                    },
                  } as typeof step;

                  for (const loopNode of sortedLoopScopeNodes) {
                    const loopNodeOrder: number = sortedNodes.findIndex(
                      (n: Jsonify<Node>): boolean => n.id === loopNode.id
                    );
                    if (loopNodeOrder === -1) {
                      continue;
                    }

                    const shouldSkipLoopNode: boolean = hasFailedPredecessor(
                      loopNode.id,
                      connections as unknown as Connection[],
                      failedNodeIds
                    );

                    if (shouldSkipLoopNode) {
                      continue;
                    }

                    const loopStepRecord: ExecutionStep =
                      await prisma.executionStep.upsert({
                        where: {
                          executionId_order: {
                            executionId: executionRecord.id,
                            order: loopNodeOrder + (i + 1) * 10000,
                          },
                        },
                        create: {
                          executionId: executionRecord.id,
                          nodeId: loopNode.id,
                          nodeType: loopNode.type,
                          order: loopNodeOrder + (i + 1) * 10000,
                          status: ExecutionStatus.RUNNING,
                          input: itemContext as Prisma.InputJsonValue,
                        },
                        update: {
                          nodeId: loopNode.id,
                          nodeType: loopNode.type,
                          status: ExecutionStatus.RUNNING,
                          input: itemContext as Prisma.InputJsonValue,
                          output: Prisma.JsonNull,
                          error: null,
                          errorStack: null,
                          completedAt: null,
                          startedAt: new Date(),
                        },
                      });

                    const loopExecutor: NodeExecutor = getExecutor(
                      loopNode.type
                    );
                    try {
                      const loopResult: WorkflowContext = await loopExecutor({
                        data: loopNode.data as Record<string, unknown>,
                        nodeId: loopNode.id,
                        context: itemContext,
                        step: loopStepWrapper,
                        publish,
                        userId,
                        executionId: executionRecord.id,
                      });

                      await prisma.executionStep.update({
                        where: { id: loopStepRecord.id },
                        data: {
                          status: ExecutionStatus.SUCCESS,
                          completedAt: new Date(),
                          output: loopResult as Prisma.InputJsonValue,
                        },
                      });

                      itemContext = {
                        ...loopResult,
                        [itemVariableName]: item,
                      };
                    } catch (error) {
                      await prisma.executionStep.update({
                        where: { id: loopStepRecord.id },
                        data: {
                          status: ExecutionStatus.FAILED,
                          completedAt: new Date(),
                          error:
                            error instanceof Error
                              ? error.message
                              : "Unknown error",
                          errorStack:
                            error instanceof Error
                              ? error.stack
                              : "No stack trace available",
                        },
                      });
                    }
                  }

                  const processedItem = itemContext[itemVariableName] ?? item;
                  loopResults.push(processedItem);
                }

                context = {
                  ...context,
                  [loopVariableName]: {
                    items: loopResults,
                    count: loopResults.length,
                  },
                };
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof PauseExecutionError) {
          await prisma.executionStep.update({
            where: { id: stepRecord.id },
            data: {
              status: ExecutionStatus.RUNNING,
              completedAt: null,
              error: null,
              errorStack: null,
            },
          });
          return {
            workflowId,
            result: context,
            paused: true,
            approvalId: error.approvalId,
          };
        }

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
      const whereClause = eventData.executionId
        ? { id: eventData.executionId }
        : { inngestEventId, workflowId };

      return await prisma.execution.update({
        where: whereClause,
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

export const publishNodeStatusUpdate = inngest.createFunction(
  {
    id: "publish-node-status-update",
  },
  {
    event: "node/update-status",
    channels: [humanApprovalChannel()],
  },
  async ({ event, step, publish }) => {
    const {
      channel: channelName,
      nodeId,
      status,
    } = event.data as {
      channel: string;
      topic: string;
      nodeId: string;
      status: "success" | "error" | "initial";
    };

    await step.run("publish-status", async () => {
      if (channelName === "human-approval-execution") {
        const statusToPublish = status as "success" | "error" | "initial";
        console.log(
          `Publishing status update for node ${nodeId}: ${statusToPublish}`
        );
        await publish(
          humanApprovalChannel().status({
            nodeId,
            status: statusToPublish,
          })
        );
        console.log(`Status update published for node ${nodeId}`);
      } else {
        console.warn(`Unknown channel: ${channelName}`);
      }
    });
  }
);
