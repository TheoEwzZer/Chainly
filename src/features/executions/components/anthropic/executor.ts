import { NodeExecutor } from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import Handlebars, { SafeString } from "handlebars";
import { anthropicChannel } from "@/inngest/channels/anthropic";
import { generateText } from "ai";
import { AnthropicProvider, createAnthropic } from "@ai-sdk/anthropic";
import { AnthropicFormValues } from "./dialog";

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

export const anthropicExecutor: NodeExecutor<AnthropicFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    anthropicChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.variableName) {
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("Anthropic Node: Variable name is required");
  }

  if (!data.model) {
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("Anthropic Node: Model is required");
  }

  if (!data.userPrompt) {
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("Anthropic Node: User prompt is required");
  }

  const credentialValue: string | undefined = process.env.ANTHROPIC_API_KEY;

  if (!credentialValue) {
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      "Anthropic Node: ANTHROPIC_API_KEY environment variable is not set"
    );
  }

  try {
    const anthropic: AnthropicProvider = createAnthropic({
      apiKey: credentialValue,
    });

    const systemPromptTemplate: string = data.systemPrompt
      ? transformBracketNotation(data.systemPrompt)
      : "You are a helpful assistant.";
    const userPromptTemplate: string = transformBracketNotation(
      data.userPrompt
    );

    const renderedSystem: string =
      Handlebars.compile(systemPromptTemplate)(context);
    const renderedUser: string =
      Handlebars.compile(userPromptTemplate)(context);

    const { steps } = await step.ai.wrap(
      "anthropic-generate-text",
      generateText,
      {
        model: anthropic(data.model),
        system: renderedSystem,
        prompt: renderedUser,
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
      }
    );

    const textContent = steps
      .flatMap((step) => step.content)
      .find((content) => content.type === "text");

    const text: string = textContent ? textContent.text : "";

    await publish(
      anthropicChannel().status({
        nodeId,
        status: "success",
      })
    );

    return {
      ...context,
      [data.variableName]: {
        text: text,
      },
    };
  } catch (error) {
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
