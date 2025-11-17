import { prefetch, trpc } from "@/trpc/server";

/**
 * Prefetch all pending approvals
 */
export const prefetchApprovals = (): void => {
  prefetch(trpc.approvals.listPending.queryOptions());
};
