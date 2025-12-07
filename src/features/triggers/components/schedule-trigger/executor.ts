import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger";
import { ScheduleTriggerFormValues } from "./dialog";
import { toZonedTime, format } from "date-fns-tz";

export const scheduleTriggerExecutor: NodeExecutor<
  ScheduleTriggerFormValues
> = async ({ data, nodeId, context, step, publish }) => {
  await step.run(`publish-loading-${nodeId}`, async (): Promise<void> => {
    await publish(
      scheduleTriggerChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  const now = new Date();
  const timezone: string = data.timezone || "UTC";

  const zonedTime: Date = toZonedTime(now, timezone);

  const triggeredAtLocal: string = format(
    zonedTime,
    "yyyy-MM-dd'T'HH:mm:ssXXX",
    {
      timeZone: timezone,
    }
  );
  const dateLocal: string = format(zonedTime, "yyyy-MM-dd", {
    timeZone: timezone,
  });
  const timeLocal: string = format(zonedTime, "HH:mm:ss", {
    timeZone: timezone,
  });

  const result: WorkflowContext = await step.run(
    `schedule-trigger-${nodeId}`,
    async (): Promise<WorkflowContext> => {
      return {
        ...context,
        [data.variableName || "schedule"]: {
          triggeredAt: triggeredAtLocal,
          triggeredAtUtc: now.toISOString(),
          timestamp: now.getTime(),
          date: dateLocal,
          time: timeLocal,
          timezone: timezone,
        },
      };
    }
  );

  await step.run(`publish-success-${nodeId}`, async (): Promise<void> => {
    await publish(
      scheduleTriggerChannel().status({
        nodeId,
        status: "success",
      })
    );
  });

  return result;
};
