import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import { setChannel } from "@/inngest/channels/set";
import { SetFormValues } from "./dialog";
import jexl from "jexl";

const evaluateValue = (value: string, context: WorkflowContext): unknown => {
  const hasExpression: boolean = /\{\{[^}]+\}\}/.test(value);

  if (!hasExpression) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  const singleExpressionMatch: RegExpExecArray | null = new RegExp(
    /^\{\{([^}]+)\}\}$/
  ).exec(value);
  if (singleExpressionMatch) {
    const jexlExpression: string = singleExpressionMatch[1].trim();
    return jexl.evalSync(jexlExpression, context);
  }

  return value.replaceAll(/\{\{([^}]+)\}\}/g, (_, expr: string): string => {
    const result = jexl.evalSync(expr.trim(), context);
    return String(result ?? "");
  });
};

export const setExecutor: NodeExecutor<SetFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await step.run(`publish-loading-${nodeId}`, async (): Promise<void> => {
    await publish(
      setChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  const variableName: string = data.variableName || "data";
  const fields = data.fields || [];

  if (fields.length === 0) {
    await step.run(`publish-error-${nodeId}`, async (): Promise<void> => {
      await publish(
        setChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Set Node: At least one field is required");
  }

  try {
    const result: WorkflowContext = await step.run(
      `evaluate-fields-${nodeId}`,
      async () => {
        const evaluatedFields: Record<string, unknown> = {};

        for (const field of fields) {
          if (!field.key) {
            throw new NonRetriableError("Set Node: Field key cannot be empty");
          }

          try {
            evaluatedFields[field.key] = evaluateValue(field.value, context);
          } catch (error) {
            throw new NonRetriableError(
              `Set Node: Failed to evaluate field "${field.key}". ${
                error instanceof Error ? error.message : "Invalid expression"
              }`
            );
          }
        }

        return {
          ...context,
          [variableName]: evaluatedFields,
        };
      }
    );

    await step.run(`publish-success-${nodeId}`, async (): Promise<void> => {
      await publish(
        setChannel().status({
          nodeId,
          status: "success",
        })
      );
    });

    return result;
  } catch (error) {
    await step.run(`publish-error-final-${nodeId}`, async (): Promise<void> => {
      await publish(
        setChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
