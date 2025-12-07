import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { errorHandlerChannel } from "@/inngest/channels/error-handler";
import { ErrorHandlerFormValues } from "./dialog";

export interface ErrorHandlerResult {
  hasError: boolean;
  error: string | null;
  errorStack: string | null;
  failedNodeId: string | null;
  failedNodeIds: string[];
}

export const errorHandlerExecutor: NodeExecutor<ErrorHandlerFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await step.run(`publish-loading-${nodeId}`, async () => {
    await publish(
      errorHandlerChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  const variableName: string = data.variableName || "errorHandler";

  const errorInfo = context._errorHandlerInfo as ErrorHandlerResult | undefined;

  const result: WorkflowContext = await step.run(
    `evaluate-error-handler-${nodeId}`,
    async () => {
      const errorResult: ErrorHandlerResult = errorInfo || {
        hasError: false,
        error: null,
        errorStack: null,
        failedNodeId: null,
        failedNodeIds: [],
      };

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _errorHandlerInfo, ...cleanContext } = context;

      return {
        ...cleanContext,
        [variableName]: errorResult,
      };
    }
  );

  await step.run(`publish-success-${nodeId}`, async () => {
    await publish(
      errorHandlerChannel().status({
        nodeId,
        status: "success",
      })
    );
  });

  return result;
};
