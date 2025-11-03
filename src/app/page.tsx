"use client";

import { LogoutButton } from "./logout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Page = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data } = useQuery(trpc.getWorkflows.queryOptions());

  const testAI = useMutation(
    trpc.testAI.mutationOptions({
      onSuccess: (data) => {
        toast.success("AI test successful");
      },
      onError: (error) => {
        console.error(error);
      },
    })
  );

  const create = useMutation(
    trpc.createWorkflow.mutationOptions({
      onSuccess: () => {
        toast.success("Job queued successfully");
      },
      onError: (error) => {
        console.error(error);
      },
    })
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black flex-col gap-y-6">
      protected server component
      <div>{JSON.stringify(data, null, 2)}</div>
      <Button onClick={() => create.mutate()} disabled={create.isPending}>
        Create Workflow
      </Button>
      {create.isSuccess && <div>Workflow created successfully</div>}
      {create.isError && <div>Error creating workflow</div>}
      <Button onClick={() => testAI.mutate()} disabled={testAI.isPending}>
        Test AI
      </Button>
      {testAI.isSuccess && <div>AI test successful</div>}
      {testAI.isError && <div>Error testing AI</div>}
      <LogoutButton />
    </div>
  );
};

export default Page;
