import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ApprovalStatus, ExecutionStatus } from "@/generated/prisma/enums";
import type {
  Approval,
  ExecutionStep,
  Prisma,
  Node,
} from "@/generated/prisma/client";
import { sendWorkflowExecution, publishNodeStatus } from "@/inngest/utils";
import { humanApprovalChannel } from "@/inngest/channels/human-approval";
import { inngest } from "@/inngest/client";
import * as Sentry from "@sentry/nextjs";

export const approvalsRouter = createTRPCRouter({
  listPending: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth.user?.id) {
      return [];
    }
    return await prisma.approval.findMany({
      where: {
        userId: ctx.auth.user.id,
        status: ApprovalStatus.PENDING,
      },
      include: {
        execution: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        node: {
          select: {
            id: true,
            type: true,
            data: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const approval = await prisma.approval.findUnique({
        where: { id: input.id },
        include: {
          execution: {
            include: {
              workflow: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          node: {
            select: {
              id: true,
              type: true,
              data: true,
            },
          },
        },
      });

      if (!approval) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approval not found",
        });
      }

      if (!ctx.auth.user?.id || approval.userId !== ctx.auth.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this approval",
        });
      }

      return approval;
    }),

  approve: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        response: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const approval = await prisma.approval.findUnique({
        where: { id: input.id },
        include: {
          execution: true,
        },
      });

      if (!approval) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approval not found",
        });
      }

      if (!ctx.auth.user?.id || approval.userId !== ctx.auth.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this approval",
        });
      }

      if (approval.status !== ApprovalStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Approval is not pending",
        });
      }

      await prisma.approval.update({
        where: { id: input.id },
        data: {
          status: ApprovalStatus.APPROVED,
          response: (input.response || {
            approved: true,
          }) as Prisma.InputJsonValue,
          respondedAt: new Date(),
        },
      });

      const approvalStep: ExecutionStep | null =
        await prisma.executionStep.findFirst({
          where: {
            executionId: approval.executionId,
            nodeId: approval.nodeId,
          },
          orderBy: {
            order: "desc",
          },
        });

      if (approvalStep) {
        await prisma.executionStep.update({
          where: { id: approvalStep.id },
          data: {
            status: ExecutionStatus.SUCCESS,
            completedAt: new Date(),
            output: {
              approved: true,
              response: input.response || {},
            } as Prisma.InputJsonValue,
            error: null,
            errorStack: null,
          },
        });

        try {
          await publishNodeStatus(
            humanApprovalChannel().name,
            approval.nodeId,
            "success"
          );
        } catch (error) {
          Sentry.captureException(error, {
            tags: { component: "approval-status-update" },
          });
        }
      } else {
        const allSteps: ExecutionStep[] = await prisma.executionStep.findMany({
          where: {
            executionId: approval.executionId,
            nodeId: approval.nodeId,
          },
          orderBy: {
            order: "desc",
          },
        });

        if (allSteps.length > 0) {
          await prisma.executionStep.update({
            where: { id: allSteps[0]!.id },
            data: {
              status: ExecutionStatus.SUCCESS,
              completedAt: new Date(),
              output: {
                approved: true,
                response: input.response || {},
              } as Prisma.InputJsonValue,
              error: null,
              errorStack: null,
            },
          });

          await inngest.send({
            name: "realtime/publish",
            data: {
              channel: humanApprovalChannel().name,
              topic: "status",
              data: {
                nodeId: approval.nodeId,
                status: "success" as const,
              },
            },
          });
        }
      }

      await resumeExecution(approval.executionId, approval.nodeId, {
        approved: true,
        response: input.response || {},
      });

      return { success: true };
    }),

  reject: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const approval = await prisma.approval.findUnique({
        where: { id: input.id },
        include: {
          execution: true,
        },
      });

      if (!approval) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approval not found",
        });
      }

      if (!ctx.auth.user?.id || approval.userId !== ctx.auth.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this approval",
        });
      }

      if (approval.status !== ApprovalStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Approval is not pending",
        });
      }

      await prisma.approval.update({
        where: { id: input.id },
        data: {
          status: ApprovalStatus.REJECTED,
          response: {
            rejected: true,
            reason: input.reason,
          } as Prisma.InputJsonValue,
          respondedAt: new Date(),
        },
      });

      const approvalStep: ExecutionStep | null =
        await prisma.executionStep.findFirst({
          where: {
            executionId: approval.executionId,
            nodeId: approval.nodeId,
          },
          orderBy: {
            order: "desc",
          },
        });

      const errorMessage: string = input.reason || "Workflow rejected by user";

      if (approvalStep) {
        await prisma.executionStep.update({
          where: { id: approvalStep.id },
          data: {
            status: ExecutionStatus.FAILED,
            completedAt: new Date(),
            error: errorMessage,
            output: {
              rejected: true,
              reason: input.reason,
            } as Prisma.InputJsonValue,
          },
        });

        try {
          await publishNodeStatus(
            humanApprovalChannel().name,
            approval.nodeId,
            "error"
          );
        } catch (error) {
          Sentry.captureException(error, {
            tags: { component: "approval-status-update" },
          });
        }
      } else {
        const allSteps: ExecutionStep[] = await prisma.executionStep.findMany({
          where: {
            executionId: approval.executionId,
            nodeId: approval.nodeId,
          },
          orderBy: {
            order: "desc",
          },
        });

        if (allSteps.length > 0) {
          await prisma.executionStep.update({
            where: { id: allSteps[0]!.id },
            data: {
              status: ExecutionStatus.FAILED,
              completedAt: new Date(),
              error: errorMessage,
              output: {
                rejected: true,
                reason: input.reason,
              } as Prisma.InputJsonValue,
            },
          });

          await inngest.send({
            name: "realtime/publish",
            data: {
              channel: humanApprovalChannel().name,
              topic: "status",
              data: {
                nodeId: approval.nodeId,
                status: "error" as const,
              },
            },
          });
        }
      }

      await prisma.execution.update({
        where: { id: approval.executionId },
        data: {
          status: ExecutionStatus.FAILED,
          error: input.reason || "Workflow rejected by user",
          completedAt: new Date(),
        },
      });

      return { success: true };
    }),

  modify: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        modifiedContext: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const approval = await prisma.approval.findUnique({
        where: { id: input.id },
        include: {
          execution: true,
        },
      });

      if (!approval) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approval not found",
        });
      }

      if (!ctx.auth.user?.id || approval.userId !== ctx.auth.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this approval",
        });
      }

      if (approval.status !== ApprovalStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Approval is not pending",
        });
      }

      await prisma.approval.update({
        where: { id: input.id },
        data: {
          status: ApprovalStatus.MODIFIED,
          response: {
            modified: true,
            context: input.modifiedContext,
          } as Prisma.InputJsonValue,
          respondedAt: new Date(),
        },
      });

      await resumeExecution(approval.executionId, approval.nodeId, {
        approved: true,
        modified: true,
        context: input.modifiedContext,
      });

      return { success: true };
    }),
});

async function resumeExecution(
  executionId: string,
  nodeId: string,
  response: Record<string, unknown>
): Promise<void> {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    include: {
      workflow: {
        include: {
          nodes: true,
          connections: true,
        },
      },
    },
  });

  if (!execution) {
    throw new Error("Execution not found");
  }

  const approvalNode: Node | undefined = execution.workflow.nodes.find(
    (n: Node): boolean => n.id === nodeId
  );
  if (!approvalNode) {
    throw new Error("Approval node not found");
  }

  const variableName: string | undefined = (
    approvalNode.data as { variableName?: string }
  )?.variableName;

  const approval: Approval | null = await prisma.approval.findFirst({
    where: {
      executionId,
      nodeId,
      status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.MODIFIED] },
    },
  });

  if (!approval) {
    throw new Error("Approval not found");
  }

  const approvalStep: ExecutionStep | null =
    await prisma.executionStep.findFirst({
      where: {
        executionId,
        nodeId,
      },
      orderBy: {
        order: "desc",
      },
    });

  if (!approvalStep) {
    throw new Error("Execution step not found");
  }

  const context = approval.context as Record<string, unknown>;
  const updatedContext = {
    ...context,
    ...(approval.status === ApprovalStatus.MODIFIED &&
    approval.response &&
    typeof approval.response === "object" &&
    "context" in approval.response
      ? (approval.response as { context: Record<string, unknown> }).context
      : {}),
    ...(variableName
      ? {
          [variableName]: {
            status: approval.status.toLowerCase(),
            response: approval.response || response,
            approvedAt: approval.respondedAt,
          },
        }
      : {}),
  };

  await prisma.execution.update({
    where: { id: executionId },
    data: {
      status: ExecutionStatus.RUNNING,
    },
  });

  await sendWorkflowExecution({
    workflowId: execution.workflowId,
    initialData: updatedContext,
    resumeFromNodeId: nodeId,
    executionId: executionId,
  });
}
