import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { manualTriggerChannel } from "@/inngest/channels/manual-trigger";

type ManualTriggerData = Record<string, unknown>;

export const manualTriggerExecutor: NodeExecutor<ManualTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await step.run(`publish-loading-${nodeId}`, async (): Promise<void> => {
    await publish(
      manualTriggerChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  const result: WorkflowContext = await step.run(
    `manual-trigger-${nodeId}`,
    async (): Promise<WorkflowContext> => context
  );

  await step.run(`publish-success-${nodeId}`, async (): Promise<void> => {
    await publish(
      manualTriggerChannel().status({
        nodeId,
        status: "success",
      })
    );
  });

  return result;
};
