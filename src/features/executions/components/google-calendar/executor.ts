import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import Handlebars, { SafeString } from "handlebars";
import { googleCalendarChannel } from "@/inngest/channels/google-calendar";
import { GoogleCalendarFormValues } from "./dialog";
import { getValidAccessToken } from "@/lib/google-calendar-token";
import ky from "ky";
import { toZonedTime, format, fromZonedTime, formatInTimeZone } from "date-fns-tz";

Handlebars.registerHelper("json", (context: any): SafeString => {
  const jsonString: string = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

Handlebars.registerHelper("lookup", (obj: any, key: string): any => {
  if (obj == null || typeof obj !== "object") {
    return undefined;
  }
  return obj[key];
});

const transformBracketNotation = (template: string): string => {
  return template.replaceAll(
    /\{\{([^}]*?)\[["']([^"']+)["']\]\}\}/g,
    (_: string, path: string, key: string): string => {
      const trimmedPath: string = path.trim();
      return `{{lookup ${trimmedPath} "${key}"}}`;
    }
  );
};

export const googleCalendarExecutor: NodeExecutor<
  GoogleCalendarFormValues
> = async ({ data, nodeId, context, step, publish, userId }) => {
  await step.run(`publish-loading-${nodeId}`, async () => {
    await publish(
      googleCalendarChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  if (!data.variableName) {
    await step.run(`publish-error-variable-${nodeId}`, async () => {
      await publish(
        googleCalendarChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError(
      "Google Calendar Node: Variable name is required"
    );
  }

  if (!data.credentialId) {
    await step.run(`publish-error-credential-${nodeId}`, async () => {
      await publish(
        googleCalendarChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Google Calendar Node: Credential is required");
  }

  let accessToken: string;
  try {
    accessToken = await step.run(`get-valid-token-${nodeId}`, async () => {
      return await getValidAccessToken(data.credentialId, userId);
    });

    const calendarIdTemplate: string = transformBracketNotation(
      data.calendarId || "primary"
    );
    const dateTemplate: string | undefined = data.date
      ? transformBracketNotation(data.date)
      : undefined;

    const renderedCalendarId: string =
      Handlebars.compile(calendarIdTemplate)(context);
    const renderedDate: string | undefined = dateTemplate
      ? Handlebars.compile(dateTemplate)(context)
      : undefined;

    const timezone: string = data.timezone || "UTC";

    let targetDateStr: string;
    if (renderedDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(renderedDate)) {
        await step.run(`publish-error-date-${nodeId}`, async () => {
          await publish(
            googleCalendarChannel().status({
              nodeId,
              status: "error",
            })
          );
        });
        throw new NonRetriableError(
          "Google Calendar Node: Invalid date format. Use YYYY-MM-DD format."
        );
      }
      targetDateStr = renderedDate;
    } else {
      const nowInTz: Date = toZonedTime(new Date(), timezone);
      targetDateStr = format(nowInTz, "yyyy-MM-dd", { timeZone: timezone });
    }

    const startOfDayUtc: Date = fromZonedTime(`${targetDateStr} 00:00:00`, timezone);
    const endOfDayUtc: Date = fromZonedTime(`${targetDateStr} 23:59:59`, timezone);

    const timeMinStr: string = formatInTimeZone(
      startOfDayUtc,
      timezone,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );
    const timeMaxStr: string = formatInTimeZone(
      endOfDayUtc,
      timezone,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );

    const result: WorkflowContext = await step.run(
      `google-calendar-fetch-${nodeId}`,
      async () => {
        const response = await ky
          .get(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
              renderedCalendarId
            )}/events`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              searchParams: {
                timeMin: timeMinStr,
                timeMax: timeMaxStr,
                timeZone: timezone,
                singleEvents: "true",
                orderBy: "startTime",
              },
              timeout: 30000,
              retry: {
                limit: 2,
                methods: ["get"],
                statusCodes: [408, 413, 429, 500, 502, 503, 504],
              },
            }
          )
          .json<{
            items: Array<{
              id: string;
              summary: string;
              description?: string;
              start: { date?: string; dateTime?: string; timeZone?: string };
              end: { date?: string; dateTime?: string; timeZone?: string };
              location?: string;
              htmlLink?: string;
            }>;
          }>();

        const events = response.items || [];

        return {
          ...context,
          [data.variableName]: {
            events: events,
            date: targetDateStr,
            timezone: timezone,
            count: events.length,
          },
        };
      }
    );

    await step.run(`publish-success-${nodeId}`, async () => {
      await publish(
        googleCalendarChannel().status({
          nodeId,
          status: "success",
        })
      );
    });

    return result;
  } catch (error) {
    await step.run(`publish-error-final-${nodeId}`, async () => {
      await publish(
        googleCalendarChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
