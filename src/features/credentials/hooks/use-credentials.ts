import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { Credential } from "@/generated/prisma/client";
import type { CredentialType } from "@/generated/prisma/enums";
import { useCredentialsParams } from "./use-credentials-params";

let tempCredentialIdCounter = 0;
const nextTempCredentialId = () => `temp-${++tempCredentialIdCounter}`;

let tempCredentialByTypeIdCounter = 0;
const nextTempCredentialByTypeId = () =>
  `temp-bytype-${++tempCredentialByTypeIdCounter}`;

type CredentialListData = {
  items: Credential[];
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

/**
 * Hook to fetch all credentials using suspense
 */
export const useSuspenseCredentials = () => {
  const trpc = useTRPC();
  const [params] = useCredentialsParams();

  return useSuspenseQuery(trpc.credentials.getMany.queryOptions(params));
};

/**
 * Hook to create a credential
 * Uses optimistic update for instant UI feedback
 */
export const useCreateCredential = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [params] = useCredentialsParams();

  return useMutation(
    trpc.credentials.create.mutationOptions({
      onMutate: async (newCredential) => {
        await queryClient.cancelQueries({
          queryKey: ["credentials", "getMany"],
        });

        const { queryKey } = trpc.credentials.getMany.queryOptions(params);
        const previousData =
          queryClient.getQueryData<CredentialListData>(queryKey);

        if (previousData) {
          const optimisticCredential = {
            id: nextTempCredentialId(),
            name: newCredential.name,
            type: newCredential.type,
            value: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: "",
            refreshToken: null,
            expiresAt: null,
          } as Credential;

          queryClient.setQueryData<CredentialListData>(queryKey, {
            ...previousData,
            items: [optimisticCredential, ...previousData.items],
            totalCount: previousData.totalCount + 1,
          });
        }

        const byTypeQueryKey = trpc.credentials.getByType.queryOptions({
          type: newCredential.type,
        }).queryKey;
        const previousByTypeData =
          queryClient.getQueryData<Credential[]>(byTypeQueryKey);

        if (previousByTypeData) {
          queryClient.setQueryData<Credential[]>(byTypeQueryKey, [
            {
              id: nextTempCredentialByTypeId(),
              name: newCredential.name,
              type: newCredential.type,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Credential,
            ...previousByTypeData,
          ]);
        }

        return { previousData, queryKey, previousByTypeData, byTypeQueryKey };
      },
      onSuccess: (data: Credential, _, context): void => {
        toast.success(`Credential ${data.name} created successfully`);

        if (context?.queryKey) {
          const currentData = queryClient.getQueryData<CredentialListData>(
            context.queryKey
          );
          if (currentData) {
            queryClient.setQueryData<CredentialListData>(context.queryKey, {
              ...currentData,
              items: currentData.items.map((item) =>
                item.id.startsWith("temp-") ? data : item
              ),
            });
          }
          queryClient.invalidateQueries({ queryKey: context.queryKey });
        }

        if (context?.byTypeQueryKey) {
          queryClient.invalidateQueries({ queryKey: context.byTypeQueryKey });
        }
      },
      onError: (error, _, context) => {
        toast.error(`Failed to create credential: ${error.message}`);
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
        if (context?.previousByTypeData && context?.byTypeQueryKey) {
          queryClient.setQueryData(
            context.byTypeQueryKey,
            context.previousByTypeData
          );
        }
      },
    })
  );
};

/**
 * Hook to remove a credential
 * Uses optimistic update for instant UI feedback
 */
export const useRemoveCredential = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [params] = useCredentialsParams();

  return useMutation(
    trpc.credentials.remove.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: ["credentials", "getMany"],
        });

        const { queryKey } = trpc.credentials.getMany.queryOptions(params);
        const previousData =
          queryClient.getQueryData<CredentialListData>(queryKey);

        const credentialToRemove = previousData?.items.find(
          (item) => item.id === id
        );

        if (previousData) {
          queryClient.setQueryData<CredentialListData>(queryKey, {
            ...previousData,
            items: previousData.items.filter((item) => item.id !== id),
            totalCount: previousData.totalCount - 1,
          });
        }

        let previousByTypeData: Credential[] | undefined;
        let byTypeQueryKey: unknown[] | undefined;

        if (credentialToRemove) {
          byTypeQueryKey = trpc.credentials.getByType.queryOptions({
            type: credentialToRemove.type,
          }).queryKey;
          previousByTypeData =
            queryClient.getQueryData<Credential[]>(byTypeQueryKey);

          if (previousByTypeData) {
            queryClient.setQueryData<Credential[]>(
              byTypeQueryKey,
              previousByTypeData.filter((item) => item.id !== id)
            );
          }
        }

        return {
          previousData,
          queryKey,
          id,
          previousByTypeData,
          byTypeQueryKey,
        };
      },
      onSuccess: (data: Credential, _, context): void => {
        toast.success(`Credential ${data.name} removed successfully`);
        queryClient.removeQueries(
          trpc.credentials.getOne.queryOptions({ id: context?.id ?? data.id })
        );
        if (context?.queryKey) {
          queryClient.invalidateQueries({ queryKey: context.queryKey });
        }
        if (context?.byTypeQueryKey) {
          queryClient.invalidateQueries({ queryKey: context.byTypeQueryKey });
        }
      },
      onError: (error, _, context) => {
        toast.error(`Failed to remove credential: ${error.message}`);
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
        if (context?.previousByTypeData && context?.byTypeQueryKey) {
          queryClient.setQueryData(
            context.byTypeQueryKey,
            context.previousByTypeData
          );
        }
      },
    })
  );
};

/**
 * Hook to fetch a single credential using suspense
 */
export const useSuspenseCredential = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.credentials.getOne.queryOptions({ id }));
};

/**
 * Hook to update a credential
 * Uses optimistic update for instant UI feedback
 */
export const useUpdateCredential = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [params] = useCredentialsParams();

  return useMutation(
    trpc.credentials.update.mutationOptions({
      onMutate: async ({ id, name, type }) => {
        await queryClient.cancelQueries({ queryKey: ["credentials"] });

        const listQueryKey =
          trpc.credentials.getMany.queryOptions(params).queryKey;
        const previousListData =
          queryClient.getQueryData<CredentialListData>(listQueryKey);

        if (previousListData) {
          queryClient.setQueryData<CredentialListData>(listQueryKey, {
            ...previousListData,
            items: previousListData.items.map((item) =>
              item.id === id
                ? { ...item, name, type, updatedAt: new Date() }
                : item
            ),
          });
        }

        const byTypeQueryKey = trpc.credentials.getByType.queryOptions({
          type,
        }).queryKey;
        const previousByTypeData =
          queryClient.getQueryData<Credential[]>(byTypeQueryKey);

        if (previousByTypeData) {
          queryClient.setQueryData<Credential[]>(
            byTypeQueryKey,
            previousByTypeData.map((item) =>
              item.id === id
                ? { ...item, name, type, updatedAt: new Date() }
                : item
            )
          );
        }

        return {
          previousListData,
          listQueryKey,
          previousByTypeData,
          byTypeQueryKey,
          id,
        };
      },
      onSuccess: (data: Credential, _, context): void => {
        toast.success(`Credential ${data.name} updated successfully`);
        queryClient.invalidateQueries(
          trpc.credentials.getOne.queryOptions({ id: context?.id ?? data.id })
        );
        if (context?.listQueryKey) {
          queryClient.invalidateQueries({ queryKey: context.listQueryKey });
        }
        if (context?.byTypeQueryKey) {
          queryClient.invalidateQueries({ queryKey: context.byTypeQueryKey });
        }
      },
      onError: (error, _, context) => {
        toast.error(`Failed to update credential: ${error.message}`);
        if (context?.previousListData && context?.listQueryKey) {
          queryClient.setQueryData(
            context.listQueryKey,
            context.previousListData
          );
        }
        if (context?.previousByTypeData && context?.byTypeQueryKey) {
          queryClient.setQueryData(
            context.byTypeQueryKey,
            context.previousByTypeData
          );
        }
      },
    })
  );
};

/**
 * Hook to fetch credentials by type
 */
export const useCredentialsByType = (type: CredentialType) => {
  const trpc = useTRPC();
  return useQuery(trpc.credentials.getByType.queryOptions({ type }));
};
