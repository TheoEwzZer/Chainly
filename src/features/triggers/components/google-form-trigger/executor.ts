import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";

type GoogleFormTriggerData = Record<string, unknown>;

export const googleFormTriggerExecutor: NodeExecutor<
  GoogleFormTriggerData
> = async ({ nodeId, context, step, publish }) => {
  await step.run(`publish-loading-${nodeId}`, async (): Promise<void> => {
    await publish(
      googleFormTriggerChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  const result: WorkflowContext = await step.run(
    `google-form-trigger-${nodeId}`,
    async (): Promise<WorkflowContext> => context
  );

  await step.run(`publish-success-${nodeId}`, async (): Promise<void> => {
    await publish(
      googleFormTriggerChannel().status({
        nodeId,
        status: "success",
      })
    );
  });

  return result;
};
