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
  await publish(
    manualTriggerChannel().status({
      nodeId,
      status: "loading",
    })
  );

  const result: WorkflowContext = await step.run(
    "manual-trigger",
    async (): Promise<WorkflowContext> => context
  );

  await publish(
    manualTriggerChannel().status({
      nodeId,
      status: "success",
    })
  );

  return result;
};
