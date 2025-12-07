import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { githubTriggerChannel } from "@/inngest/channels/github-trigger";

export type GitHubTriggerExecutorData = {
  variableName?: string;
  events?: string[];
};

export const githubTriggerExecutor: NodeExecutor<
  GitHubTriggerExecutorData
> = async ({ nodeId, context, step, publish }) => {
  await step.run(`publish-loading-${nodeId}`, async (): Promise<void> => {
    await publish(
      githubTriggerChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  const result: WorkflowContext = await step.run(
    `github-trigger-${nodeId}`,
    async (): Promise<WorkflowContext> => context
  );

  await step.run(`publish-success-${nodeId}`, async (): Promise<void> => {
    await publish(
      githubTriggerChannel().status({
        nodeId,
        status: "success",
      })
    );
  });

  return result;
};
