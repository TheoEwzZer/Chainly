import { NodeExecutor } from "@/features/executions/components/types";
import { waitChannel } from "@/inngest/channels/wait";
import { WaitFormValues } from "./dialog";

type TimeUnit = "seconds" | "minutes" | "hours" | "days";

const getInngestDuration = (duration: number, unit: TimeUnit): string => {
  const unitMap: Record<TimeUnit, string> = {
    seconds: "s",
    minutes: "m",
    hours: "h",
    days: "d",
  };
  return `${duration}${unitMap[unit]}`;
};

const getDurationMs = (duration: number, unit: TimeUnit): number => {
  const multipliers: Record<TimeUnit, number> = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };
  return duration * multipliers[unit];
};

const formatDuration = (duration: number, unit: TimeUnit): string => {
  const singular: string = unit.slice(0, -1);
  return duration === 1 ? `${duration} ${singular}` : `${duration} ${unit}`;
};

export const waitExecutor: NodeExecutor<WaitFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  const duration: number = data.duration || 5;
  const unit: TimeUnit = data.unit || "seconds";
  const durationMs: number = getDurationMs(duration, unit);

  await step.run(`publish-loading-${nodeId}`, async () => {
    const startedAt: string = new Date().toISOString();

    await publish(
      waitChannel().status({
        nodeId,
        status: "loading",
      })
    );

    await publish(
      waitChannel().countdown({
        nodeId,
        startedAt,
        durationMs,
      })
    );
  });

  const inngestDuration: string = getInngestDuration(duration, unit);

  await step.sleep(`wait-${nodeId}`, inngestDuration);

  await step.run(`publish-success-${nodeId}`, async () => {
    await publish(
      waitChannel().status({
        nodeId,
        status: "success",
      })
    );
  });

  return {
    ...context,
    _lastWait: {
      duration,
      unit,
      formatted: formatDuration(duration, unit),
      completedAt: new Date().toISOString(),
    },
  };
};
