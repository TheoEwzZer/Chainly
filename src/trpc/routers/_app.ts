import { baseProcedure, createTRPCRouter } from "../init";
import prisma from "@/lib/prisma";

export const appRouter = createTRPCRouter({
  getUsers: baseProcedure.query(() => {
    return prisma.user.findMany();
  }),
});

export type AppRouter = typeof appRouter;
