import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import { codeChannel } from "@/inngest/channels/code";
import { CodeFormValues } from "./dialog";
import {
  newQuickJSWASMModule,
  type QuickJSContext,
  type QuickJSWASMModule,
} from "quickjs-emscripten";

const executeCode = async (
  code: string,
  context: WorkflowContext
): Promise<any> => {
  const QuickJS: QuickJSWASMModule = await newQuickJSWASMModule();
  const vm: QuickJSContext = QuickJS.newContext();

  try {
    vm.runtime.setMemoryLimit(16 * 1024 * 1024);
    let interruptCycles: number = 0;
    vm.runtime.setInterruptHandler((): boolean => {
      interruptCycles++;
      return interruptCycles > 100_000;
    });

    const contextHandle = vm.evalCode(`(${JSON.stringify(context)})`);

    if (contextHandle.error) {
      const error: any = vm.dump(contextHandle.error);
      contextHandle.error.dispose();
      throw new Error(`Failed to parse context: ${String(error)}`);
    }

    vm.setProp(vm.global, "context", contextHandle.value);
    contextHandle.value.dispose();

    const wrappedCode = `
      (function() {
        "use strict";
        ${code}
      })()
    `;

    const result = vm.evalCode(wrappedCode);

    if (result.error) {
      const errorValue: any = vm.dump(result.error);
      result.error.dispose();

      let errorStr: string;
      if (typeof errorValue === "string") {
        errorStr = errorValue;
      } else if (
        errorValue &&
        typeof errorValue === "object" &&
        "message" in errorValue
      ) {
        errorStr = String((errorValue as { message: unknown }).message);
      } else if (
        errorValue &&
        typeof errorValue === "object" &&
        "name" in errorValue
      ) {
        const err = errorValue as { name: unknown };
        errorStr = `${err.name}: ${JSON.stringify(errorValue)}`;
      } else {
        try {
          errorStr = JSON.stringify(errorValue);
        } catch {
          errorStr = "Unknown error occurred";
        }
      }

      if (errorStr.includes("window") || errorStr.includes("document")) {
        throw new Error(
          `Browser APIs (window, document) are not available. ` +
            `This code runs in a secure sandbox. Use the 'context' object to access workflow data.`
        );
      }
      if (errorStr.includes("require") || errorStr.includes("import")) {
        throw new Error(
          `Node.js APIs (require, import) are not available. ` +
            `This code runs in a secure sandbox with only pure JavaScript.`
        );
      }
      if (errorStr.includes("fetch") || errorStr.includes("XMLHttpRequest")) {
        throw new Error(
          `Network APIs (fetch, XMLHttpRequest) are not available. ` +
            `Use the HTTP Request node to make API calls instead.`
        );
      }
      if (errorStr.includes("fs") || errorStr.includes("path")) {
        throw new Error(
          `Filesystem APIs (fs, path) are not available. ` +
            `This code runs in a secure sandbox without file access.`
        );
      }

      throw new Error(errorStr);
    }

    const resultValue: any = vm.dump(result.value);
    result.value.dispose();

    return resultValue;
  } finally {
    vm.dispose();
  }
};

export const codeExecutor: NodeExecutor<CodeFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await step.run(`publish-loading-${nodeId}`, async (): Promise<void> => {
    await publish(
      codeChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  const variableName: string = data.variableName || "code";
  const code: string = data.code || "";

  if (!code.trim()) {
    await step.run(`publish-error-${nodeId}`, async (): Promise<void> => {
      await publish(
        codeChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Code Node: Code is required");
  }

  try {
    const result: WorkflowContext = await step.run(
      `execute-code-${nodeId}`,
      async () => {
        try {
          const codeResult: any = await executeCode(code, context);

          return {
            ...context,
            [variableName]: codeResult,
          };
        } catch (error) {
          throw new NonRetriableError(
            `Code Node: Execution failed. ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );

    await step.run(`publish-success-${nodeId}`, async (): Promise<void> => {
      await publish(
        codeChannel().status({
          nodeId,
          status: "success",
        })
      );
    });

    return result;
  } catch (error) {
    await step.run(`publish-error-final-${nodeId}`, async (): Promise<void> => {
      await publish(
        codeChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
