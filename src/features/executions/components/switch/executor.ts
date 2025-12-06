import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import { switchChannel } from "@/inngest/channels/switch";
import { SwitchFormValues, SwitchCase } from "./dialog";
import jexl from "jexl";

const convertToJexlSyntax = (expression: string): string => {
  return expression.replaceAll(/\{\{([^}]+)\}\}/g, "$1").trim();
};

const evaluateExpression = (
  expression: string,
  context: WorkflowContext
): unknown => {
  try {
    const jexlExpression: string = convertToJexlSyntax(expression);
    return jexl.evalSync(jexlExpression, context);
  } catch (error) {
    throw new NonRetriableError(
      `Switch Node: Failed to evaluate expression "${expression}". ${
        error instanceof Error ? error.message : "Invalid expression syntax"
      }`
    );
  }
};

const findMatchingCase = (
  value: unknown,
  cases: SwitchCase[]
): { matchedCase: string; matchedIndex: number } | null => {
  const stringValue: string = String(value);

  for (let i: number = 0; i < cases.length; i++) {
    const caseItem: { label: string; value: string } = cases[i];
    if (caseItem.value === stringValue) {
      return {
        matchedCase: caseItem.label,
        matchedIndex: i,
      };
    }
  }

  return null;
};

export const switchExecutor: NodeExecutor<SwitchFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await step.run(`publish-loading-${nodeId}`, async () => {
    await publish(
      switchChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  if (!data.variableName) {
    await step.run(`publish-error-variable-${nodeId}`, async () => {
      await publish(
        switchChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Switch Node: Variable name is required");
  }

  if (!data.expression) {
    await step.run(`publish-error-expression-${nodeId}`, async () => {
      await publish(
        switchChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Switch Node: Expression is required");
  }

  if (!data.cases || data.cases.length === 0) {
    await step.run(`publish-error-cases-${nodeId}`, async () => {
      await publish(
        switchChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Switch Node: At least one case is required");
  }

  const hasDefault: boolean = data.hasDefault ?? true;

  try {
    const result: WorkflowContext = await step.run(
      `evaluate-switch-${nodeId}`,
      async () => {
        const expressionValue: unknown = evaluateExpression(
          data.expression,
          context
        );

        const matchResult: {
          matchedCase: string;
          matchedIndex: number;
        } | null = findMatchingCase(expressionValue, data.cases);

        const selectedOutput: string | null = matchResult
          ? `case-${matchResult.matchedIndex}`
          : hasDefault
            ? "default"
            : null;

        return {
          ...context,
          [data.variableName]: {
            value: expressionValue,
            matchedCase: matchResult?.matchedCase || null,
            matchedIndex: matchResult?.matchedIndex ?? null,
            isDefault: matchResult === null,
            selectedOutput,
          },
        };
      }
    );

    await step.run(`publish-success-${nodeId}`, async () => {
      await publish(
        switchChannel().status({
          nodeId,
          status: "success",
        })
      );
    });

    return result;
  } catch (error) {
    await step.run(`publish-error-final-${nodeId}`, async () => {
      await publish(
        switchChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
