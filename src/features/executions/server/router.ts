import { PAGINATION } from "@/config/constants";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { z } from "zod";

export const executionsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { id } = input;

      return prisma.execution.findFirstOrThrow({
        where: { id, workflow: { userId: ctx.auth.user.id } },
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
          steps: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              nodeId: true,
              nodeType: true,
              status: true,
              order: true,
              input: true,
              output: true,
              error: true,
              errorStack: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
      });
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
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;

      const [items, totalCount] = await Promise.all([
        prisma.execution.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: { workflow: { userId: ctx.auth.user.id } },
          orderBy: { startedAt: "desc" },
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.execution.count({
          where: { workflow: { userId: ctx.auth.user.id } },
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
