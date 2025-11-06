import { authClient } from "@/lib/auth-client";
import { CustomerState } from "@polar-sh/sdk/models/components/customerstate.js";
import { useQuery, UseQueryResult } from "@tanstack/react-query";

export const useSubscription: () => UseQueryResult<
  CustomerState | null,
  Error
> = () => {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async (): Promise<CustomerState | null> => {
      const { data } = await authClient.customer.state();
      return data;
    },
  });
};

export const useHasActiveSubscription = () => {
  const { data: customerState, isLoading, ...rest } = useSubscription();

  const hasActiveSubscription: boolean | undefined =
    customerState?.activeSubscriptions &&
    customerState.activeSubscriptions.length > 0;

  return {
    hasActiveSubscription,
    subscription: customerState?.activeSubscriptions?.[0],
    isLoading,
    ...rest,
  };
};
