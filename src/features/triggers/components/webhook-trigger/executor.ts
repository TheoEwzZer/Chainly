import {
  type NodeExecutor,
  type WorkflowContext,
} from "@/features/executions/components/types";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";

export type WebhookTriggerExecutorData = {
  variableName?: string;
  secret?: string;
};

export const webhookTriggerExecutor: NodeExecutor<
  WebhookTriggerExecutorData
> = async ({ nodeId, context, step, publish }) => {
  await step.run(`publish-loading-${nodeId}`, async (): Promise<void> => {
    await publish(
      webhookTriggerChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  const result: WorkflowContext = await step.run(
    `webhook-trigger-${nodeId}`,
    async (): Promise<WorkflowContext> => context
  );

  await step.run(`publish-success-${nodeId}`, async (): Promise<void> => {
    await publish(
      webhookTriggerChannel().status({
        nodeId,
        status: "success",
      })
    );
  });

  return result;
};
