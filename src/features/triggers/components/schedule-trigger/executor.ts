import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger";
import { ScheduleTriggerFormValues } from "./dialog";

export const scheduleTriggerExecutor: NodeExecutor<ScheduleTriggerFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await step.run(`publish-loading-${nodeId}`, async () => {
    await publish(
      scheduleTriggerChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  const triggeredAt: string = new Date().toISOString();

  const result: WorkflowContext = await step.run(
    `schedule-trigger-${nodeId}`,
    async (): Promise<WorkflowContext> => {
      return {
        ...context,
        [data.variableName || "schedule"]: {
          triggeredAt,
          timestamp: new Date(triggeredAt).getTime(),
          date: new Date(triggeredAt).toISOString().split("T")[0],
          time: new Date(triggeredAt).toISOString().split("T")[1].split(".")[0],
        },
      };
    }
  );

  await step.run(`publish-success-${nodeId}`, async () => {
    await publish(
      scheduleTriggerChannel().status({
        nodeId,
        status: "success",
      })
    );
  });

  return result;
};

