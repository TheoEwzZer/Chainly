import { PAGINATION } from "@/config/constants";
import type { Edge, Node, XYPosition } from "@xyflow/react";
import { NodeType } from "@/generated/prisma/enums";
import {
  Node as PrismaNode,
  Connection as PrismaConnection,
  Workflow,
} from "@/generated/prisma/client";
import prisma from "@/lib/db";
import {
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import { generateSlug } from "random-word-slugs";
import { z } from "zod";
import { sendWorkflowExecution, topologicalSort } from "@/inngest/utils";
import { TRPCError } from "@trpc/server";

export const workflowsRouter = createTRPCRouter({
  execute: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workflow: Workflow & {
        nodes: PrismaNode[];
        connections: PrismaConnection[];
      } = await prisma.workflow.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.auth.user.id },
        include: {
          nodes: true,
          connections: true,
        },
      });

      try {
        topologicalSort(workflow.nodes, workflow.connections);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Cyclic")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cyclic dependency detected in workflow",
          });
        }
        if (
          error instanceof Error &&
          error.message.includes(
            "You must have at least one connection between reachable nodes"
          )
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "You must have at least one connection between reachable nodes",
          });
        }
        if (error instanceof Error && error.message.includes("No trigger")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No trigger node found in workflow",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to validate workflow",
        });
      }

      await sendWorkflowExecution({ workflowId: input.id });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { nodes, connections, ...workflowData } = workflow;
      return workflowData;
    }),
  create: premiumProcedure.mutation(({ ctx }) => {
    return prisma.workflow.create({
      data: {
        name: generateSlug(3),
        userId: ctx.auth.user.id,
        nodes: {
          create: {
            type: NodeType.INITIAL,
            position: { x: 0, y: 0 },
            name: NodeType.INITIAL,
          },
        },
      },
    });
  }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return prisma.workflow.delete({
        where: { id: input.id, userId: ctx.auth.user.id },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nodes: z.array(
          z.object({
            id: z.string(),
            type: z.enum(NodeType).nullish(),
            position: z.object({ x: z.number(), y: z.number() }),
            data: z.record(z.string(), z.any().optional()),
          })
        ),
        edges: z.array(
          z.object({
            id: z.string(),
            source: z.string(),
            target: z.string(),
            sourceHandle: z.string().nullish(),
            targetHandle: z.string().nullish(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, nodes, edges } = input;

      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id, userId: ctx.auth.user.id },
      });

      return await prisma.$transaction(async (tx) => {
        await tx.node.deleteMany({ where: { workflowId: id } });

        await tx.node.createMany({
          data: nodes.map((node) => ({
            id: node.id,
            workflowId: id,
            name: node.type || "unknown",
            type: node.type as NodeType,
            position: node.position as XYPosition,
            data: node.data || {},
          })),
        });

        await tx.connection.createMany({
          data: edges.map((edge) => ({
            workflowId: id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle || "main",
            toInput: edge.targetHandle || "main",
          })),
        });

        await tx.workflow.update({
          where: { id },
          data: { updatedAt: new Date() },
        });

        return workflow;
      });
    }),
  updateName: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string() }))
    .mutation(({ ctx, input }) => {
      return prisma.workflow.update({
        where: { id: input.id, userId: ctx.auth.user.id },
        data: { name: input.name },
      });
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow: Workflow & {
        nodes: PrismaNode[];
        connections: PrismaConnection[];
      } = await prisma.workflow.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.auth.user.id },
        include: {
          nodes: true,
          connections: true,
        },
      });

      const nodes: Node[] = workflow.nodes.map(
        (node: PrismaNode): Node => ({
          id: node.id,
          type: node.type,
          position: node.position as XYPosition,
          data: (node.data as Record<string, unknown>) || {},
        })
      );

      const edges: Edge[] = workflow.connections.map(
        (connection: PrismaConnection): Edge => ({
          id: connection.id,
          source: connection.fromNodeId,
          target: connection.toNodeId,
          sourceHandle: connection.fromOutput,
          targetHandle: connection.toInput,
        })
      );

      return {
        id: workflow.id,
        name: workflow.name,
        nodes,
        edges,
      };
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const [items, totalCount] = await Promise.all([
        prisma.workflow.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            userId: ctx.auth.user.id,
            name: { contains: search, mode: "insensitive" },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.workflow.count({
          where: {
            userId: ctx.auth.user.id,
            name: { contains: search, mode: "insensitive" },
          },
        }),
      ]);

      const totalPages: number = Math.ceil(totalCount / pageSize);
      const hasNextPage: boolean = page < totalPages;
      const hasPreviousPage: boolean = page > 1;

      return {
        items,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
});
