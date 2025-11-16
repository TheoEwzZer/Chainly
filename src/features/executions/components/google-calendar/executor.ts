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

    let targetDate: Date;
    if (renderedDate) {
      targetDate = new Date(renderedDate);
      if (Number.isNaN(targetDate.getTime())) {
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
    } else {
      targetDate = new Date();
    }

    const timeMin = new Date(targetDate);
    timeMin.setHours(0, 0, 0, 0);

    const timeMax = new Date(targetDate);
    timeMax.setHours(23, 59, 59, 999);

    const timeMinStr: string = timeMin.toISOString();
    const timeMaxStr: string = timeMax.toISOString();

    const result: WorkflowContext = await step.run(
      `google-calendar-fetch-${nodeId}`,
      async () => {
        try {
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
              date: targetDate.toISOString().split("T")[0],
              count: events.length,
            },
          };
        } catch (error: any) {
          const statusCode: number | undefined = error.response?.status;

          if (statusCode === 401) {
            await step.run(`publish-error-401-${nodeId}`, async () => {
              await publish(
                googleCalendarChannel().status({
                  nodeId,
                  status: "error",
                })
              );
            });
            throw new NonRetriableError(
              "Google Calendar Node: Invalid access token. Please verify your access token is correct and hasn't expired."
            );
          }
          if (statusCode === 403) {
            await step.run(`publish-error-403-${nodeId}`, async () => {
              await publish(
                googleCalendarChannel().status({
                  nodeId,
                  status: "error",
                })
              );
            });
            throw new NonRetriableError(
              "Google Calendar Node: Access forbidden. Please verify the access token has the required permissions (calendar.readonly scope)."
            );
          }
          if (statusCode === 404) {
            await step.run(`publish-error-404-${nodeId}`, async () => {
              await publish(
                googleCalendarChannel().status({
                  nodeId,
                  status: "error",
                })
              );
            });
            throw new NonRetriableError(
              `Google Calendar Node: Calendar not found. Please verify the calendar ID "${renderedCalendarId}" is correct.`
            );
          }

          await step.run(`publish-error-fetch-${nodeId}`, async () => {
            await publish(
              googleCalendarChannel().status({
                nodeId,
                status: "error",
              })
            );
          });
          throw new NonRetriableError(
            `Google Calendar Node: Failed to fetch events. ${
              error.message || "Unknown error"
            }`
          );
        }
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
