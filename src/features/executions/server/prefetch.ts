import { prefetch, trpc } from "@/trpc/server";
import { inferInput } from "@trpc/tanstack-react-query";

type Input = inferInput<typeof trpc.executions.getMany>;

/**
 * Prefetch all executions
 */
export const prefetchExecutions = (params: Input): void => {
  prefetch(trpc.executions.getMany.queryOptions(params));
};

/**
 * Prefetch a single execution
 */
export const prefetchExecution = (id: string): void => {
  prefetch(trpc.executions.getOne.queryOptions({ id }));
};
