import { NodeExecutor } from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import Handlebars, { SafeString } from "handlebars";
import { anthropicChannel } from "@/inngest/channels/anthropic";
import { generateText } from "ai";
import { AnthropicProvider, createAnthropic } from "@ai-sdk/anthropic";
import { AnthropicFormValues } from "./dialog";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

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
  userId,
}) => {
  await step.run(`publish-loading-${nodeId}`, async () => {
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  if (!data.variableName) {
    await step.run(`publish-error-variable-${nodeId}`, async () => {
      await publish(
        anthropicChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Anthropic Node: Variable name is required");
  }

  if (!data.model) {
    await step.run(`publish-error-model-${nodeId}`, async () => {
      await publish(
        anthropicChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Anthropic Node: Model is required");
  }

  if (!data.userPrompt) {
    await step.run(`publish-error-prompt-${nodeId}`, async () => {
      await publish(
        anthropicChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Anthropic Node: User prompt is required");
  }

  if (!data.credentialId) {
    await step.run(`publish-error-credential-${nodeId}`, async () => {
      await publish(
        anthropicChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Anthropic Node: Credential is required");
  }

  const credential: { value: string } | null = await step.run(
    `get-credential-${nodeId}`,
    async () => {
      return await prisma.credential.findUnique({
        where: { id: data.credentialId, userId },
        select: {
          value: true,
        },
      });
    }
  );

  if (!credential) {
    await step.run(`publish-error-credential-not-found-${nodeId}`, async () => {
      await publish(
        anthropicChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Anthropic Node: Credential not found");
  }

  try {
    const anthropic: AnthropicProvider = createAnthropic({
      apiKey: decrypt(credential.value),
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

    await step.run(`publish-success-${nodeId}`, async () => {
      await publish(
        anthropicChannel().status({
          nodeId,
          status: "success",
        })
      );
    });

    return {
      ...context,
      [data.variableName]: {
        text: text,
      },
    };
  } catch (error) {
    await step.run(`publish-error-final-${nodeId}`, async () => {
      await publish(
        anthropicChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
