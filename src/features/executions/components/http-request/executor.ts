import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { HTTPRequestMethodEnum } from "./constants";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions, type KyResponse } from "ky";
import Handlebars, { SafeString } from "handlebars";
import { httpRequestChannel } from "@/inngest/channels/http-request";
import { HttpRequestFormValues } from "./dialog";

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

const escapeControlCharsInJsonStringLiterals = (raw: string): string => {
  let result: string = "";
  let inString: boolean = false;
  let escapeNext: boolean = false;

  for (const element of raw) {
    const ch: string = element;

    if (escapeNext) {
      result += ch;
      escapeNext = false;
      continue;
    }

    if (ch === "\\") {
      result += ch;
      if (inString) {
        escapeNext = true;
      }
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      const code: number | undefined = ch.codePointAt(0);
      if (code === undefined) {
        continue;
      }
      switch (code) {
        case 0x0a: // \n
          result += String.raw`\n`;
          continue;
        case 0x0d: // \r
          result += String.raw`\r`;
          continue;
        case 0x09: // \t
          result += String.raw`\t`;
          continue;
        case 0x08: // \b
          result += String.raw`\b`;
          continue;
        case 0x0c: // \f
          result += String.raw`\f`;
          continue;
        default:
          if (code < 0x20) {
            const hex: string = code.toString(16).padStart(4, "0");
            result += `\\u${hex}`;
            continue;
          }
      }
    }

    result += ch;
  }

  return result;
};

export const httpRequestExecutor: NodeExecutor<HttpRequestFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    httpRequestChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.endpoint) {
    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("HTTP Request Node: Endpoint is required");
  }

  if (!data.variableName) {
    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("HTTP Request Node: Variable name is required");
  }

  if (!data.method) {
    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("HTTP Request Node: Method is required");
  }

  try {
    const result: WorkflowContext = await step.run("http-request", async () => {
      const transformedEndpoint: string = transformBracketNotation(
        data.endpoint
      );
      const endpoint: string = Handlebars.compile(transformedEndpoint)(context);
      const method: HTTPRequestMethodEnum = data.method;

      const options: KyOptions = { method };

      if (
        [
          HTTPRequestMethodEnum.POST,
          HTTPRequestMethodEnum.PUT,
          HTTPRequestMethodEnum.PATCH,
        ].includes(method)
      ) {
        try {
          const transformedBody: string = transformBracketNotation(
            data.body || ""
          );
          const resolved: string = Handlebars.compile(transformedBody)(context);
          const sanitized: string =
            escapeControlCharsInJsonStringLiterals(resolved);
          const parsedBody: unknown = JSON.parse(sanitized);

          (options as KyOptions & { json?: unknown }).json = parsedBody;
        } catch (error) {
          await publish(
            httpRequestChannel().status({
              nodeId,
              status: "error",
            })
          );
          throw new NonRetriableError(
            `HTTP Request Node: Invalid JSON body template - ${
              error instanceof Error ? error.message : "Unknown error"
            }. Tip: when inserting variables inside JSON, use the helper {{json yourVariable}} without quotes (e.g. "message": {{json previous.data}}) to ensure proper escaping.`
          );
        }
      }

      const response: KyResponse<unknown> = await ky(endpoint, options);
      const contentType: string | null = response.headers.get("content-type");
      const responseData: unknown = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();
      const responsePayload = {
        httpResponse: {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
        },
      };

      return {
        ...context,
        [data.variableName]: responsePayload,
      };
    });

    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
