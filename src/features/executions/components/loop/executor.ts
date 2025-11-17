import { NodeExecutor } from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import Handlebars, { SafeString } from "handlebars";
import { loopChannel } from "@/inngest/channels/loop";
import { LoopFormValues } from "./dialog";

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

const getNestedValue = (obj: any, path: string): any => {
  const parts: string[] = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) {
      return undefined;
    }
    current = current[part];
  }
  return current;
};

export const loopExecutor: NodeExecutor<LoopFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await step.run(`publish-loading-${nodeId}`, async () => {
    await publish(
      loopChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  if (!data.variableName) {
    await step.run(`publish-error-variable-${nodeId}`, async () => {
      await publish(
        loopChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Loop Node: Variable name is required");
  }

  if (!data.arrayPath) {
    await step.run(`publish-error-array-${nodeId}`, async () => {
      await publish(
        loopChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Loop Node: Array path is required");
  }

  if (!data.itemVariableName) {
    await step.run(`publish-error-item-${nodeId}`, async () => {
      await publish(
        loopChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Loop Node: Item variable name is required");
  }

  try {
    let array: unknown;
    let resolvedPath: string = "";

    if (
      data.arrayPath.includes("{{") ||
      data.arrayPath.includes("}}") ||
      data.arrayPath.includes("{")
    ) {
      let cleanPath: string = data.arrayPath;

      cleanPath = cleanPath.replaceAll(/\{\{|\}\}|\{|\}/g, "").trim();

      if (!cleanPath || cleanPath.includes("{") || cleanPath.includes("}")) {
        const pathRegex: RegExp = /[^{}]*([^{}]+)[^{}]*/;
        const pathMatch: RegExpExecArray | null = pathRegex.exec(
          data.arrayPath
        );
        cleanPath = pathMatch?.[1]?.trim() || cleanPath;
      }

      resolvedPath = cleanPath;

      array = getNestedValue(context, resolvedPath);

      if (array === undefined || array === null) {
        const arrayPathTemplate: string = transformBracketNotation(
          data.arrayPath
        );
        const compiledTemplate: HandlebarsTemplateDelegate<any> =
          Handlebars.compile(arrayPathTemplate);
        const resolved: string = compiledTemplate(context);

        if (
          resolved !== undefined &&
          resolved !== null &&
          resolved !== data.arrayPath &&
          typeof resolved !== "string"
        ) {
          array = resolved;
        } else if (
          typeof resolved === "string" &&
          resolved !== data.arrayPath &&
          resolved.includes(".")
        ) {
          array = getNestedValue(context, resolved);
          if (array !== undefined) {
            resolvedPath = resolved;
          }
        }
      }
    } else {
      resolvedPath = data.arrayPath;
      array =
        getNestedValue(context, data.arrayPath) ??
        (context as any)[data.arrayPath];
    }

    if (!Array.isArray(array)) {
      await step.run(`publish-error-not-array-${nodeId}`, async () => {
        await publish(
          loopChannel().status({
            nodeId,
            status: "error",
          })
        );
      });

      const contextKeys: string[] = Object.keys(context || {});
      const availablePaths: string =
        contextKeys.length > 0
          ? `Available top-level keys: ${contextKeys.join(", ")}`
          : "Context is empty or undefined";

      throw new NonRetriableError(
        `Loop Node: Path "${
          data.arrayPath
        }" (resolved: "${resolvedPath}") does not resolve to an array. Got: ${typeof array}. ${availablePaths}. Context structure: ${JSON.stringify(
          Object.keys(context || {})
        ).slice(0, 200)}`
      );
    }

    if (array.length === 0) {
      await step.run(`publish-success-empty-${nodeId}`, async () => {
        await publish(
          loopChannel().status({
            nodeId,
            status: "success",
          })
        );
      });

      return {
        ...context,
        [data.variableName]: {
          items: [],
          count: 0,
          results: [],
        },
      };
    }

    await step.run(`publish-success-${nodeId}`, async () => {
      await publish(
        loopChannel().status({
          nodeId,
          status: "success",
        })
      );
    });

    return {
      ...context,
      [data.variableName]: {
        items: array,
        count: array.length,
        _loopMetadata: {
          nodeId,
          itemVariableName: data.itemVariableName,
          arrayLength: array.length,
        },
      },
    };
  } catch (error) {
    await step.run(`publish-error-final-${nodeId}`, async () => {
      await publish(
        loopChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
