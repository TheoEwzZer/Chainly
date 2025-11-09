import { prefetch, trpc } from "@/trpc/server";
import { inferInput } from "@trpc/tanstack-react-query";

type Input = inferInput<typeof trpc.workflows.getMany>;

/**
 * Prefetch all workflows
 */
export const prefetchWorkflows = (params: Input): void => {
  prefetch(trpc.workflows.getMany.queryOptions(params));
};

/**
 * Prefetch a single workflow
 */
export const prefetchWorkflow = (id: string): void => {
  prefetch(trpc.workflows.getOne.queryOptions({ id }));
};
