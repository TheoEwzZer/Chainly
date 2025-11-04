import { inngest } from "@/inngest/client";
import { protectedProcedure, createTRPCRouter, baseProcedure } from "../init";
import prisma from "@/lib/db";
import { TRPCError } from "@trpc/server";

export const appRouter = createTRPCRouter({
  testAI: baseProcedure.mutation(async () => {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Test error",
    });

    await inngest.send({
      name: "execute/ai",
    });

    return { success: true, message: "Job queued successfully" };
  }),
  getWorkflows: protectedProcedure.query(() => {
    return prisma.workflow.findMany();
  }),
  createWorkflow: protectedProcedure.mutation(async () => {
    await inngest.send({
      name: "test/hello.world",
      data: {
        email: "testUser@example.com",
      },
    });

    return { success: true, message: "Job queued successfully" };
  }),
});

export type AppRouter = typeof appRouter;
