import { NodeExecutor } from "@/features/executions/components/types";
import { HTTPRequestMethodEnum } from "./constants";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions, type KyResponse } from "ky";
import Handlebars, { SafeString } from "handlebars";

Handlebars.registerHelper("json", (context: any): SafeString => {
  const jsonString: string = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

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

type HttpRequestData = {
  variableName: string;
  endpoint: string;
  method: HTTPRequestMethodEnum;
  body?: string;
};

export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({
  data,
  nodeId,
  context,
  step,
}) => {
  // TODO: Publish loading state for HTTP request

  if (!data.endpoint) {
    // TODO: Publish error state for HTTP request
    throw new NonRetriableError("HTTP Request Node: Endpoint is required");
  }

  if (!data.variableName) {
    // TODO: Publish error state for HTTP Request Node: Variable name is required
    throw new NonRetriableError("HTTP Request Node: Variable name is required");
  }

  if (!data.method) {
    // TODO: Publish error state for HTTP Request Node: Method is required
    throw new NonRetriableError("HTTP Request Node: Method is required");
  }

  return await step.run("http-request", async () => {
    const endpoint: string = Handlebars.compile(data.endpoint)(context);
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
        const resolved: string = Handlebars.compile(data.body)(context);
        const sanitized: string =
          escapeControlCharsInJsonStringLiterals(resolved);
        const parsedBody: unknown = JSON.parse(sanitized);

        (options as KyOptions & { json?: unknown }).json = parsedBody;
      } catch (error) {
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
};
