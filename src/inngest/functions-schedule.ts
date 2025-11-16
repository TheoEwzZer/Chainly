import { inngest } from "./client";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma/enums";
import { sendWorkflowExecution } from "./utils";
import type { ScheduleTriggerFormValues } from "@/features/triggers/components/schedule-trigger/dialog";

function matchesCron(cronExpression: string, now: Date): boolean {
  const parts: string[] = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  const [minute, hour, day, month, weekday] = parts;
  const currentMinute: number = now.getMinutes();
  const currentHour: number = now.getHours();
  const currentDay: number = now.getDate();
  const currentMonth: number = now.getMonth() + 1; // JavaScript months are 0-indexed
  const currentWeekday: number = now.getDay(); // 0 = Sunday, 6 = Saturday

  const matches = (value: string, current: number): boolean => {
    if (value === "*") {
      return true;
    }
    if (value.includes("/")) {
      const [range, step] = value.split("/");
      if (range === "*") {
        return current % Number.parseInt(step, 10) === 0;
      }
      // Handle range with step (e.g., "0-59/15")
      const [start, end] = range.split("-").map(Number);
      return (
        current >= start &&
        current <= end &&
        (current - start) % Number.parseInt(step, 10) === 0
      );
    }
    if (value.includes("-")) {
      const [start, end] = value.split("-").map(Number);
      return current >= start && current <= end;
    }
    if (value.includes(",")) {
      return value.split(",").map(Number).includes(current);
    }
    return Number.parseInt(value, 10) === current;
  };

  return (
    matches(minute, currentMinute) &&
    matches(hour, currentHour) &&
    matches(day, currentDay) &&
    matches(month, currentMonth) &&
    matches(weekday, currentWeekday)
  );
}

function shouldTriggerInterval(
  data: ScheduleTriggerFormValues,
  now: Date
): boolean {
  if (!data.intervalValue || !data.intervalUnit) {
    return false;
  }

  const lastExecution: Date | null = (data as any).lastExecution
    ? new Date((data as any).lastExecution)
    : null;

  if (!lastExecution) {
    return true;
  }

  const intervalMs: number =
    data.intervalValue *
    (data.intervalUnit === "minutes"
      ? 60 * 1000
      : data.intervalUnit === "hours"
      ? 60 * 60 * 1000
      : 24 * 60 * 60 * 1000);

  const nextExecution = new Date(lastExecution.getTime() + intervalMs);
  return now >= nextExecution;
}

export const checkSchedules = inngest.createFunction(
  {
    id: "check-schedules",
    retries: 0,
  },
  {
    cron: "* * * * *", // Every minute
  },
  async ({ step }) => {
    const now = new Date();

    const scheduleNodes = await step.run("get-schedule-nodes", async () => {
      return await prisma.node.findMany({
        where: {
          type: NodeType.SCHEDULE_TRIGGER,
        },
        include: {
          workflow: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });
    });

    for (const node of scheduleNodes) {
      const data = node.data as ScheduleTriggerFormValues & {
        lastExecution?: string;
      };

      if (!data.scheduleMode) {
        continue;
      }

      let shouldTrigger: boolean = false;

      if (data.scheduleMode === "cron" && data.cronExpression) {
        shouldTrigger = matchesCron(data.cronExpression, now);
      } else if (data.scheduleMode === "datetime" && data.datetime) {
        const scheduledDate = new Date(data.datetime);
        const lastExecution: Date | null = data.lastExecution
          ? new Date(data.lastExecution)
          : null;
        shouldTrigger =
          now >= scheduledDate &&
          now.getTime() - scheduledDate.getTime() < 60000 &&
          (!lastExecution || lastExecution < scheduledDate);
      } else if (data.scheduleMode === "interval") {
        shouldTrigger = shouldTriggerInterval(data, now);
      }

      if (shouldTrigger) {
        await step.run(`trigger-workflow-${node.id}`, async () => {
          await sendWorkflowExecution({
            workflowId: node.workflowId,
            triggerNodeId: node.id,
          });

          if (
            data.scheduleMode === "interval" ||
            data.scheduleMode === "datetime"
          ) {
            await prisma.node.update({
              where: { id: node.id },
              data: {
                data: {
                  ...data,
                  lastExecution: now.toISOString(),
                },
              },
            });
          }
        });
      }
    }
  }
);
