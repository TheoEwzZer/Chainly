import { credentialsRouter } from "@/features/credentials/server/router";
import { executionsRouter } from "@/features/executions/server/router";
import { createTRPCRouter } from "../init";
import { workflowsRouter } from "@/features/workflows/server/router";
import { approvalsRouter } from "@/features/approvals/server/router";

export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  approvals: approvalsRouter,
});

export type AppRouter = typeof appRouter;
