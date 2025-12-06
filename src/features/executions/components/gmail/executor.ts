import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import Handlebars, { SafeString } from "handlebars";
import { gmailChannel } from "@/inngest/channels/gmail";
import { GmailFormValues } from "./dialog";
import { getValidGmailAccessToken } from "@/lib/gmail-token";
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

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailMessageDetail {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    mimeType: string;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
      parts?: Array<{
        mimeType: string;
        body?: { data?: string };
      }>;
    }>;
  };
  internalDate: string;
}

interface ParsedEmail {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  isUnread: boolean;
  isStarred: boolean;
  labels: string[];
  hasAttachment: boolean;
  body?: {
    plain?: string;
    html?: string;
  };
  // Links to open the email
  gmailLink: string; // Opens in Gmail web/app
  appleMailLink?: string; // Opens via redirect page in Apple Mail app
}

function buildGmailQuery(
  data: GmailFormValues,
  context: WorkflowContext
): string {
  const parts: string[] = [];
  const now = new Date();

  const formatDateForGmail = (date: Date): string => {
    const year: number = date.getFullYear();
    const month: string = String(date.getMonth() + 1).padStart(2, "0");
    const day: string = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  };

  // Date filters
  switch (data.dateFilter) {
    case "today": {
      const todayStr: string = formatDateForGmail(now);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr: string = formatDateForGmail(tomorrow);
      parts.push(`after:${todayStr} before:${tomorrowStr}`);
      break;
    }
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr: string = formatDateForGmail(yesterday);
      const todayStr: string = formatDateForGmail(now);
      parts.push(`after:${yesterdayStr} before:${todayStr}`);
      break;
    }
    case "this_week": {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr: string = formatDateForGmail(weekAgo);
      parts.push(`after:${weekAgoStr}`);
      break;
    }
    case "this_month": {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      const monthAgoStr: string = formatDateForGmail(monthAgo);
      parts.push(`after:${monthAgoStr}`);
      break;
    }
    case "older_than": {
      if (data.relativeDateValue && data.relativeDateUnit) {
        parts.push(
          `older_than:${data.relativeDateValue}${data.relativeDateUnit}`
        );
      }
      break;
    }
    case "newer_than": {
      if (data.relativeDateValue && data.relativeDateUnit) {
        parts.push(
          `newer_than:${data.relativeDateValue}${data.relativeDateUnit}`
        );
      }
      break;
    }
    case "specific_date": {
      if (data.specificDate) {
        const dateStr = data.specificDate.replaceAll("-", "/");
        parts.push(`after:${dateStr}`);
        // Add next day as before
        const nextDay = new Date(data.specificDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay
          .toISOString()
          .split("T")[0]
          .replaceAll("-", "/");
        parts.push(`before:${nextDayStr}`);
      }
      break;
    }
    case "date_range": {
      if (data.startDate) {
        const startStr = data.startDate.replaceAll("-", "/");
        parts.push(`after:${startStr}`);
      }
      if (data.endDate) {
        const endDate = new Date(data.endDate);
        endDate.setDate(endDate.getDate() + 1);
        const endStr = endDate.toISOString().split("T")[0].replaceAll("-", "/");
        parts.push(`before:${endStr}`);
      }
      break;
    }
    // "all" - no date filter
  }

  // Read status
  if (data.readStatus === "unread") {
    parts.push("is:unread");
  } else if (data.readStatus === "read") {
    parts.push("is:read");
  }

  // Status filters
  if (data.starred) {
    parts.push("is:starred");
  }
  if (data.important) {
    parts.push("is:important");
  }
  if (data.isMuted) {
    parts.push("is:muted");
  }
  if (data.isSnoozed) {
    parts.push("in:snoozed");
  }

  if (
    data.mailboxMode === "specific" &&
    data.mailboxes &&
    data.mailboxes.length > 0
  ) {
    if (data.mailboxes.length === 1) {
      parts.push(`in:${data.mailboxes[0]}`);
    } else {
      const mailboxParts: string[] = data.mailboxes.map(
        (m: (typeof data.mailboxes)[number]): string => `in:${m}`
      );
      parts.push(`(${mailboxParts.join(" OR ")})`);
    }
  }

  if (!data.categoryAll && data.categories && data.categories.length > 0) {
    if (data.categories.length === 1) {
      parts.push(`category:${data.categories[0]}`);
    } else {
      const categoryParts: string[] = data.categories.map(
        (cat: (typeof data.categories)[number]): string => `category:${cat}`
      );
      parts.push(`(${categoryParts.join(" OR ")})`);
    }
  }

  // Has content filters
  if (data.hasAttachment) {
    parts.push("has:attachment");
  }
  if (data.hasYoutube) {
    parts.push("has:youtube");
  }
  if (data.hasDrive) {
    parts.push("has:drive");
  }
  if (data.hasDocument) {
    parts.push("has:document");
  }
  if (data.hasSpreadsheet) {
    parts.push("has:spreadsheet");
  }
  if (data.hasPresentation) {
    parts.push("has:presentation");
  }

  // Filename filter
  if (data.filename) {
    const filenameTemplate = transformBracketNotation(data.filename);
    const renderedFilename = Handlebars.compile(filenameTemplate)(context);
    if (renderedFilename) {
      parts.push(`filename:${renderedFilename}`);
    }
  }

  // Size filter
  if (
    data.sizeFilter &&
    data.sizeFilter !== "all" &&
    data.sizeValue &&
    data.sizeUnit
  ) {
    const sizeOperator = data.sizeFilter === "larger" ? "larger" : "smaller";
    parts.push(`${sizeOperator}:${data.sizeValue}${data.sizeUnit}`);
  }

  // Advanced filters with template support
  if (data.from) {
    const fromTemplate = transformBracketNotation(data.from);
    const renderedFrom = Handlebars.compile(fromTemplate)(context);
    if (renderedFrom) {
      parts.push(`from:${renderedFrom}`);
    }
  }

  if (data.to) {
    const toTemplate = transformBracketNotation(data.to);
    const renderedTo = Handlebars.compile(toTemplate)(context);
    if (renderedTo) {
      parts.push(`to:${renderedTo}`);
    }
  }

  if (data.cc) {
    const ccTemplate = transformBracketNotation(data.cc);
    const renderedCc = Handlebars.compile(ccTemplate)(context);
    if (renderedCc) {
      parts.push(`cc:${renderedCc}`);
    }
  }

  if (data.subject) {
    const subjectTemplate = transformBracketNotation(data.subject);
    const renderedSubject = Handlebars.compile(subjectTemplate)(context);
    if (renderedSubject) {
      parts.push(`subject:${renderedSubject}`);
    }
  }

  if (data.label) {
    const labelTemplate = transformBracketNotation(data.label);
    const renderedLabel = Handlebars.compile(labelTemplate)(context);
    if (renderedLabel) {
      parts.push(`label:${renderedLabel}`);
    }
  }

  if (data.list) {
    const listTemplate = transformBracketNotation(data.list);
    const renderedList = Handlebars.compile(listTemplate)(context);
    if (renderedList) {
      parts.push(`list:${renderedList}`);
    }
  }

  return parts.join(" ");
}

function getHeader(
  headers: Array<{ name: string; value: string }>,
  name: string
): string {
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value || "";
}

function decodeBase64Url(data: string): string {
  try {
    // Replace URL-safe characters and add padding
    const base64 = data.replaceAll("-", "+").replaceAll("_", "/");
    const padding = base64.length % 4;
    const paddedBase64 = padding ? base64 + "=".repeat(4 - padding) : base64;
    return Buffer.from(paddedBase64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractBody(payload: GmailMessageDetail["payload"]): {
  plain?: string;
  html?: string;
} {
  const result: { plain?: string; html?: string } = {};

  function processPartRecursively(part: any): void {
    if (part.mimeType === "text/plain" && part.body?.data && !result.plain) {
      result.plain = decodeBase64Url(part.body.data);
    }
    if (part.mimeType === "text/html" && part.body?.data && !result.html) {
      result.html = decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        processPartRecursively(subPart);
      }
    }
  }

  // Check top-level body
  if (payload.body?.data) {
    if (payload.mimeType === "text/plain") {
      result.plain = decodeBase64Url(payload.body.data);
    } else if (payload.mimeType === "text/html") {
      result.html = decodeBase64Url(payload.body.data);
    }
  }

  // Process parts
  if (payload.parts) {
    for (const part of payload.parts) {
      processPartRecursively(part);
    }
  }

  return result;
}

function parseEmailDetail(
  detail: GmailMessageDetail,
  includeBody: boolean
): ParsedEmail {
  const headers: { name: string; value: string }[] =
    detail.payload?.headers || [];
  const toHeader: string = getHeader(headers, "To");
  const messageIdHeader: string = getHeader(headers, "Message-ID");
  const labelIds: string[] = detail.labelIds || [];

  // Build Gmail web/app link
  const gmailLink = `https://mail.google.com/mail/u/0/#all/${detail.id}`;

  // Build iOS/macOS Mail app links (if Message-ID available)
  let appleMailLink: string | undefined;
  if (messageIdHeader) {
    // Message-ID format: <xxx@yyy.com> - need to URL encode it
    const encodedMessageId: string = encodeURIComponent(messageIdHeader);

    // Build the redirect link
    const appUrl: string =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    appleMailLink = `${appUrl}/api/open-mail?id=${encodedMessageId}`;
  }

  const email: ParsedEmail = {
    id: detail.id,
    threadId: detail.threadId,
    snippet: detail.snippet || "",
    subject: getHeader(headers, "Subject"),
    from: getHeader(headers, "From"),
    to: toHeader ? toHeader.split(",").map((t) => t.trim()) : [],
    date: detail.internalDate
      ? new Date(Number.parseInt(detail.internalDate)).toISOString()
      : new Date().toISOString(),
    isUnread: labelIds.includes("UNREAD"),
    isStarred: labelIds.includes("STARRED"),
    labels: labelIds,
    hasAttachment:
      detail.payload?.parts?.some(
        (p) =>
          p.mimeType?.startsWith("application/") ||
          p.mimeType?.startsWith("image/")
      ) || false,
    gmailLink,
    appleMailLink,
  };

  if (includeBody && detail.payload) {
    email.body = extractBody(detail.payload);
  }

  return email;
}

export const gmailExecutor: NodeExecutor<GmailFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await step.run(`publish-loading-${nodeId}`, async () => {
    await publish(
      gmailChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  if (!data.variableName) {
    await step.run(`publish-error-variable-${nodeId}`, async () => {
      await publish(
        gmailChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Gmail Node: Variable name is required");
  }

  if (!data.credentialId) {
    await step.run(`publish-error-credential-${nodeId}`, async () => {
      await publish(
        gmailChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Gmail Node: Credential is required");
  }

  let accessToken: string;
  try {
    accessToken = await step.run(`get-valid-token-${nodeId}`, async () => {
      return await getValidGmailAccessToken(data.credentialId, userId);
    });

    const query: string = buildGmailQuery(data, context);
    const maxResults: number = data.maxResults || 50;
    const includeSpamTrash: boolean = data.includeSpamTrash || false;
    const fetchBody: boolean = data.fetchBody === "full";

    const result: WorkflowContext = await step.run(
      `gmail-fetch-${nodeId}`,
      async () => {
        try {
          // Step 1: List messages
          const searchParams: Record<string, string> = {
            maxResults: maxResults.toString(),
          };

          if (query) {
            searchParams.q = query;
          }

          if (includeSpamTrash) {
            searchParams.includeSpamTrash = "true";
          }

          const listResponse: {
            messages?: GmailMessage[];
            resultSizeEstimate?: number;
          } = await ky
            .get("https://www.googleapis.com/gmail/v1/users/me/messages", {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              searchParams,
              timeout: 30000,
              retry: {
                limit: 2,
                methods: ["get"],
                statusCodes: [408, 413, 429, 500, 502, 503, 504],
              },
            })
            .json<{
              messages?: GmailMessage[];
              resultSizeEstimate?: number;
            }>();

          const messages: GmailMessage[] = listResponse.messages || [];

          if (messages.length === 0) {
            return {
              ...context,
              [data.variableName]: {
                emails: [],
                count: 0,
                filters: {
                  dateFilter: data.dateFilter,
                  readStatus: data.readStatus,
                  mailboxMode: data.mailboxMode,
                  mailboxes: data.mailboxes,
                  query,
                },
              },
            };
          }

          // Step 2: Fetch details for each message
          const emails: ParsedEmail[] = [];
          const format: "metadata" | "full" = fetchBody ? "full" : "metadata";

          for (const message of messages) {
            try {
              const url = new URL(
                `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`
              );
              url.searchParams.set("format", format);

              if (format === "metadata") {
                for (const header of [
                  "From",
                  "To",
                  "Subject",
                  "Date",
                  "Message-ID",
                ]) {
                  url.searchParams.append("metadataHeaders", header);
                }
              }

              const detailResponse: GmailMessageDetail = await ky
                .get(url.toString(), {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                  timeout: 30000,
                  retry: {
                    limit: 2,
                    methods: ["get"],
                    statusCodes: [408, 413, 429, 500, 502, 503, 504],
                  },
                })
                .json<GmailMessageDetail>();

              emails.push(parseEmailDetail(detailResponse, fetchBody));
            } catch (detailError) {
              // Skip individual message errors, continue with others
              console.error(
                `Failed to fetch message ${message.id}:`,
                detailError
              );
            }
          }

          return {
            ...context,
            [data.variableName]: {
              emails,
              count: emails.length,
              filters: {
                dateFilter: data.dateFilter,
                readStatus: data.readStatus,
                mailboxMode: data.mailboxMode,
                mailboxes: data.mailboxes,
                query,
              },
            },
          };
        } catch (error: any) {
          const statusCode: number | undefined = error.response?.status;

          if (statusCode === 401) {
            throw new NonRetriableError(
              "Gmail Node: Invalid access token. Please verify your access token is correct and hasn't expired."
            );
          }
          if (statusCode === 403) {
            throw new NonRetriableError(
              "Gmail Node: Access forbidden. Please verify the access token has the required permissions (gmail.readonly scope)."
            );
          }

          throw new NonRetriableError(
            `Gmail Node: Failed to fetch emails. ${
              error.message || "Unknown error"
            }`
          );
        }
      }
    );

    await step.run(`publish-success-${nodeId}`, async () => {
      await publish(
        gmailChannel().status({
          nodeId,
          status: "success",
        })
      );
    });

    return result;
  } catch (error) {
    await step.run(`publish-error-final-${nodeId}`, async () => {
      await publish(
        gmailChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
