import { inngest } from "./client";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma/enums";
import { sendWorkflowExecution } from "./utils";
import type { ScheduleTriggerFormValues } from "@/features/triggers/components/schedule-trigger/dialog";
import { toZonedTime } from "date-fns-tz";

function getTimeInTimezone(
  utcDate: Date,
  timezone: string
): {
  minute: number;
  hour: number;
  day: number;
  month: number;
  weekday: number;
} {
  const zonedDate: Date = toZonedTime(utcDate, timezone);

  return {
    minute: zonedDate.getMinutes(),
    hour: zonedDate.getHours(),
    day: zonedDate.getDate(),
    month: zonedDate.getMonth() + 1,
    weekday: zonedDate.getDay(),
  };
}

function matchesCron(
  cronExpression: string,
  now: Date,
  timezone: string = "UTC"
): boolean {
  const parts: string[] = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  const [minute, hour, day, month, weekday] = parts;

  const timeInTz: {
    minute: number;
    hour: number;
    day: number;
    month: number;
    weekday: number;
  } = getTimeInTimezone(now, timezone);
  const currentMinute: number = timeInTz.minute;
  const currentHour: number = timeInTz.hour;
  const currentDay: number = timeInTz.day;
  const currentMonth: number = timeInTz.month;
  const currentWeekday: number = timeInTz.weekday;

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
  data: ScheduleTriggerFormValues & { lastExecution?: string },
  now: Date
): boolean {
  if (!data.intervalValue || !data.intervalUnit) {
    return false;
  }

  const lastExecution: Date | null = data.lastExecution
    ? new Date(data.lastExecution)
    : null;

  if (!lastExecution) {
    return true;
  }

  const intervalMs: number =
    data.intervalValue *
    (data.intervalUnit === "hours" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000);

  const nextExecution = new Date(lastExecution.getTime() + intervalMs);
  return now >= nextExecution;
}

export const checkSchedules = inngest.createFunction(
  {
    id: "check-schedules",
    retries: 0,
  },
  {
    cron: "0 * * * *", // Every hour at minute 0
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
      const timezone: string = data.timezone || "UTC";

      if (data.scheduleMode === "cron" && data.cronExpression) {
        const cronMatches: boolean = matchesCron(
          data.cronExpression,
          now,
          timezone
        );

        if (cronMatches) {
          const lastExecution: Date | null = data.lastExecution
            ? new Date(data.lastExecution)
            : null;

          if (lastExecution) {
            const lastExecInTz: Date = toZonedTime(lastExecution, timezone);
            const nowInTz: Date = toZonedTime(now, timezone);

            const sameMinute: boolean =
              lastExecInTz.getFullYear() === nowInTz.getFullYear() &&
              lastExecInTz.getMonth() === nowInTz.getMonth() &&
              lastExecInTz.getDate() === nowInTz.getDate() &&
              lastExecInTz.getHours() === nowInTz.getHours() &&
              lastExecInTz.getMinutes() === nowInTz.getMinutes();

            shouldTrigger = !sameMinute;
          } else {
            shouldTrigger = true;
          }
        }
      } else if (data.scheduleMode === "datetime" && data.datetime) {
        const [datePart, timePart] = data.datetime.split("T");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hours, minutes] = timePart.split(":").map(Number);

        const nowInTz: Date = toZonedTime(now, timezone);

        const nowMinutes: number =
          nowInTz.getHours() * 60 + nowInTz.getMinutes();
        const scheduledMinutes: number = hours * 60 + minutes;
        const nowDateStr = `${nowInTz.getFullYear()}-${String(
          nowInTz.getMonth() + 1
        ).padStart(2, "0")}-${String(nowInTz.getDate()).padStart(2, "0")}`;
        const scheduledDateStr = `${year}-${String(month).padStart(
          2,
          "0"
        )}-${String(day).padStart(2, "0")}`;

        const lastExecution: Date | null = data.lastExecution
          ? new Date(data.lastExecution)
          : null;

        const dateMatches: boolean = nowDateStr === scheduledDateStr;
        const timeMatches: boolean =
          nowMinutes >= scheduledMinutes && nowMinutes < scheduledMinutes + 1;

        const scheduledTimestamp: number = new Date(
          year,
          month - 1,
          day,
          hours,
          minutes,
          0
        ).getTime();

        shouldTrigger =
          dateMatches &&
          timeMatches &&
          (!lastExecution || lastExecution.getTime() < scheduledTimestamp);
      } else if (data.scheduleMode === "interval") {
        shouldTrigger = shouldTriggerInterval(data, now);
      }

      if (shouldTrigger) {
        await step.run(
          `trigger-workflow-${node.id}`,
          async (): Promise<void> => {
            await sendWorkflowExecution({
              workflowId: node.workflowId,
              triggerNodeId: node.id,
            });

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
        );
      }
    }
  }
);
