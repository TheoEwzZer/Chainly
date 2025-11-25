import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type PendingApproval = { id: string } & Record<string, unknown>;

/**
 * Hook to fetch all pending approvals using suspense
 */
export const useSuspenseApprovals = () => {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.approvals.listPending.queryOptions());
};

/**
 * Hook to approve an approval
 * Uses optimistic update for instant UI feedback
 */
export const useApproveApproval = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const router = useRouter();

  return useMutation(
    trpc.approvals.approve.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: ["approvals", "listPending"],
        });

        const { queryKey } = trpc.approvals.listPending.queryOptions();
        const previousData =
          queryClient.getQueryData<PendingApproval[]>(queryKey);

        if (previousData) {
          queryClient.setQueryData<PendingApproval[]>(
            queryKey,
            previousData.filter((approval) => approval.id !== id)
          );
        }

        return { previousData, queryKey, id };
      },
      onSuccess: (_, __, context) => {
        toast.success("Approval granted");
        if (context?.queryKey) {
          queryClient.invalidateQueries({ queryKey: context.queryKey });
        }
        router.refresh();
      },
      onError: (error, _, context) => {
        toast.error(error.message || "Failed to approve");
        if (context?.queryKey) {
          queryClient.invalidateQueries({ queryKey: context.queryKey });
        }
      },
    })
  );
};

/**
 * Hook to reject an approval
 * Uses optimistic update for instant UI feedback
 */
export const useRejectApproval = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const router = useRouter();

  return useMutation(
    trpc.approvals.reject.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: ["approvals", "listPending"],
        });

        const { queryKey } = trpc.approvals.listPending.queryOptions();
        const previousData =
          queryClient.getQueryData<PendingApproval[]>(queryKey);

        if (previousData) {
          queryClient.setQueryData<PendingApproval[]>(
            queryKey,
            previousData.filter((approval) => approval.id !== id)
          );
        }

        return { previousData, queryKey, id };
      },
      onSuccess: (_, __, context) => {
        toast.success("Approval rejected");
        if (context?.queryKey) {
          queryClient.invalidateQueries({ queryKey: context.queryKey });
        }
        router.refresh();
      },
      onError: (error, _, context) => {
        toast.error(error.message || "Failed to reject");
        if (context?.queryKey) {
          queryClient.invalidateQueries({ queryKey: context.queryKey });
        }
      },
    })
  );
};
