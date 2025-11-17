import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Hook to fetch all pending approvals using suspense
 */
export const useSuspenseApprovals = () => {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.approvals.listPending.queryOptions());
};

/**
 * Hook to approve an approval
 */
export const useApproveApproval = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const router = useRouter();

  return useMutation(
    trpc.approvals.approve.mutationOptions({
      onSuccess: () => {
        toast.success("Approval granted");
        queryClient.invalidateQueries(
          trpc.approvals.listPending.queryOptions()
        );
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to approve");
      },
    })
  );
};

/**
 * Hook to reject an approval
 */
export const useRejectApproval = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const router = useRouter();

  return useMutation(
    trpc.approvals.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Approval rejected");
        queryClient.invalidateQueries(
          trpc.approvals.listPending.queryOptions()
        );
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reject");
      },
    })
  );
};
