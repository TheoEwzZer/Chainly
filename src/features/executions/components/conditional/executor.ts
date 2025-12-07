import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import { conditionalChannel } from "@/inngest/channels/conditional";
import { ConditionalFormValues } from "./dialog";
import jexl from "jexl";

const convertToJexlSyntax = (condition: string): string => {
  return condition.replaceAll(/\{\{([^}]+)\}\}/g, "$1").trim();
};

const evaluateCondition = (
  condition: string,
  context: WorkflowContext
): boolean => {
  try {
    const jexlExpression: string = convertToJexlSyntax(condition);

    const result: any = jexl.evalSync(jexlExpression, context);
    return Boolean(result);
  } catch (error) {
    throw new NonRetriableError(
      `Conditional Node: Failed to evaluate condition "${condition}". ${
        error instanceof Error ? error.message : "Invalid condition syntax"
      }`
    );
  }
};

export const conditionalExecutor: NodeExecutor<ConditionalFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await step.run(`publish-loading-${nodeId}`, async (): Promise<void> => {
    await publish(
      conditionalChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  if (!data.variableName) {
    await step.run(
      `publish-error-variable-${nodeId}`,
      async (): Promise<void> => {
        await publish(
          conditionalChannel().status({
            nodeId,
            status: "error",
          })
        );
      }
    );
    throw new NonRetriableError("Conditional Node: Variable name is required");
  }

  if (!data.condition) {
    await step.run(
      `publish-error-condition-${nodeId}`,
      async (): Promise<void> => {
        await publish(
          conditionalChannel().status({
            nodeId,
            status: "error",
          })
        );
      }
    );
    throw new NonRetriableError("Conditional Node: Condition is required");
  }

  try {
    const result: WorkflowContext = await step.run(
      `evaluate-condition-${nodeId}`,
      async () => {
        const conditionPassed: boolean = evaluateCondition(
          data.condition,
          context
        );

        return {
          ...context,
          [data.variableName]: {
            result: conditionPassed,
            condition: data.condition,
          },
        };
      }
    );

    await step.run(`publish-success-${nodeId}`, async (): Promise<void> => {
      await publish(
        conditionalChannel().status({
          nodeId,
          status: "success",
        })
      );
    });

    return result;
  } catch (error) {
    await step.run(`publish-error-final-${nodeId}`, async (): Promise<void> => {
      await publish(
        conditionalChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
