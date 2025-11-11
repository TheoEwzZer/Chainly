import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { HTTPRequestMethodEnum } from "./constants";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions, type KyResponse } from "ky";

type HttpRequestData = {
  endpoint: string;
  method: HTTPRequestMethodEnum;
  body: string;
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

  return await step.run("http-request", async () => {
    const endpoint: string = data.endpoint!;
    const method: HTTPRequestMethodEnum = data.method!;

    const options: KyOptions = { method };

    if (
      [
        HTTPRequestMethodEnum.POST,
        HTTPRequestMethodEnum.PUT,
        HTTPRequestMethodEnum.PATCH,
      ].includes(method)
    ) {
      options.body = data.body;
    }

    const response: KyResponse<unknown> = await ky(endpoint, options);
    const contentType: string | null = response.headers.get("content-type");
    const responseData: unknown = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

    return {
      ...context,
      httpResponse: {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      },
    };
  });
};
