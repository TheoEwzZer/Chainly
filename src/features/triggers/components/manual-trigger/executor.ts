import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";

type ManualTriggerData = Record<string, unknown>;

export const manualTriggerExecutor: NodeExecutor<ManualTriggerData> = async ({
  data,
  nodeId,
  context,
  step,
}) => {
  // TODO: Publish loading state for manual trigger

  const result = await step.run(
    "manual-trigger",
    async (): Promise<WorkflowContext> => context
  );

  // TODO: Publish success state for manual trigger

  return context;
};
