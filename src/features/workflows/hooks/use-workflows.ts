import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkflowsParams } from "./use-workflows-params";
import type { Workflow } from "@/generated/prisma/client";

let tempWorkflowIdCounter = 0;
const nextTempWorkflowId = () => `temp-${++tempWorkflowIdCounter}`;

type WorkflowListData = {
  items: Workflow[];
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

/**
 * Hook to fetch all workflows using suspense
 */
export const useSuspenseWorkflows = () => {
  const trpc = useTRPC();
  const [params] = useWorkflowsParams();

  return useSuspenseQuery(trpc.workflows.getMany.queryOptions(params));
};

/**
 * Hook to create a workflow
 * Uses optimistic update for instant UI feedback
 */
export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [params] = useWorkflowsParams();

  return useMutation(
    trpc.workflows.create.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: ["workflows", "getMany"] });

        const { queryKey } = trpc.workflows.getMany.queryOptions(params);
        const previousData =
          queryClient.getQueryData<WorkflowListData>(queryKey);

        if (previousData) {
          const optimisticWorkflow = {
            id: nextTempWorkflowId(),
            name: "Creating...",
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: "",
          } as Workflow;

          queryClient.setQueryData<WorkflowListData>(queryKey, {
            ...previousData,
            items: [optimisticWorkflow, ...previousData.items],
            totalCount: previousData.totalCount + 1,
          });
        }

        return { previousData, queryKey };
      },
      onSuccess: (data: Workflow, _, context): void => {
        toast.success(`Workflow ${data.name} created successfully`);
        if (context?.queryKey) {
          const currentData = queryClient.getQueryData<WorkflowListData>(
            context.queryKey
          );
          if (currentData) {
            queryClient.setQueryData<WorkflowListData>(context.queryKey, {
              ...currentData,
              items: currentData.items.map((item) =>
                item.id.startsWith("temp-") ? data : item
              ),
            });
          }
          queryClient.invalidateQueries({ queryKey: context.queryKey });
        }
      },
      onError: (error, _, context) => {
        toast.error(`Failed to create workflow: ${error.message}`);
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
      },
    })
  );
};

/**
 * Hook to remove a workflow
 * Uses optimistic update for instant UI feedback
 */
export const useRemoveWorkflow = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [params] = useWorkflowsParams();

  return useMutation(
    trpc.workflows.remove.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: ["workflows", "getMany"] });

        const {queryKey} = trpc.workflows.getMany.queryOptions(params);
        const previousData =
          queryClient.getQueryData<WorkflowListData>(queryKey);

        if (previousData) {
          queryClient.setQueryData<WorkflowListData>(queryKey, {
            ...previousData,
            items: previousData.items.filter((item) => item.id !== id),
            totalCount: previousData.totalCount - 1,
          });
        }

        return { previousData, queryKey, id };
      },
      onSuccess: (data: Workflow, _, context): void => {
        toast.success(`Workflow ${data.name} removed successfully`);
        queryClient.removeQueries(
          trpc.workflows.getOne.queryOptions({ id: context?.id ?? data.id })
        );
        if (context?.queryKey) {
          queryClient.invalidateQueries({ queryKey: context.queryKey });
        }
      },
      onError: (error, _, context) => {
        toast.error(`Failed to remove workflow: ${error.message}`);
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
      },
    })
  );
};

/**
 * Hook to fetch a single workflow using suspense
 */
export const useSuspenseWorkflow = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workflows.getOne.queryOptions({ id }));
};

/**
 * Hook to update the name of a workflow
 * Uses optimistic update for the list view
 */
export const useUpdateWorkflowName = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [params] = useWorkflowsParams();

  return useMutation(
    trpc.workflows.updateName.mutationOptions({
      onMutate: async ({ id, name }) => {
        await queryClient.cancelQueries({ queryKey: ["workflows", "getMany"] });

        const listQueryKey =
          trpc.workflows.getMany.queryOptions(params).queryKey;
        const previousListData =
          queryClient.getQueryData<WorkflowListData>(listQueryKey);

        if (previousListData) {
          queryClient.setQueryData<WorkflowListData>(listQueryKey, {
            ...previousListData,
            items: previousListData.items.map((item) =>
              item.id === id ? { ...item, name, updatedAt: new Date() } : item
            ),
          });
        }

        return { previousListData, listQueryKey, id };
      },
      onSuccess: (data: Workflow, _, context): void => {
        toast.success(`Workflow ${data.name} updated successfully`);
        queryClient.invalidateQueries(
          trpc.workflows.getOne.queryOptions({ id: context?.id ?? data.id })
        );
        if (context?.listQueryKey) {
          queryClient.invalidateQueries({ queryKey: context.listQueryKey });
        }
      },
      onError: (error, _, context) => {
        toast.error(`Failed to update workflow name: ${error.message}`);
        if (context?.previousListData && context?.listQueryKey) {
          queryClient.setQueryData(
            context.listQueryKey,
            context.previousListData
          );
        }
      },
    })
  );
};

/**
 * Hook to update a workflow
 */
export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.workflows.update.mutationOptions({
      onSuccess: (data: Workflow): void => {
        toast.success(`Workflow ${data.name} saved successfully`);
        queryClient.invalidateQueries(
          trpc.workflows.getOne.queryOptions({ id: data.id })
        );
      },
      onError: (error) => {
        toast.error(`Failed to save workflow: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to execute a workflow
 */
export const useExecuteWorkflow = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.workflows.execute.mutationOptions({
      onSuccess: (data: Workflow): void => {
        toast.success(`Workflow ${data.name} executed successfully`);
      },
      onError: (error) => {
        toast.error(`Failed to execute workflow: ${error.message}`);
      },
    })
  );
};
