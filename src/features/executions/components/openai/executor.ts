import { NodeExecutor } from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import Handlebars, { SafeString } from "handlebars";
import { openaiChannel } from "@/inngest/channels/openai";
import { generateText } from "ai";
import { createOpenAI, OpenAIProvider } from "@ai-sdk/openai";
import { OpenAIFormValues } from "./dialog";
import prisma from "@/lib/db";

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

export const openaiExecutor: NodeExecutor<OpenAIFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    openaiChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.variableName) {
    await publish(
      openaiChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("OpenAI Node: Variable name is required");
  }

  if (!data.model) {
    await publish(
      openaiChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("OpenAI Node: Model is required");
  }

  if (!data.userPrompt) {
    await publish(
      openaiChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("OpenAI Node: User prompt is required");
  }

  if (!data.credentialId) {
    await publish(
      openaiChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("OpenAI Node: Credential is required");
  }

  const credential: { value: string } | null = await step.run(
    "get-credential",
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
    await publish(
      openaiChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("OpenAI Node: Credential not found");
  }

  try {
    const openai: OpenAIProvider = createOpenAI({
      apiKey: credential.value,
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

    const { steps } = await step.ai.wrap("openai-generate-text", generateText, {
      model: openai(data.model),
      system: renderedSystem,
      prompt: renderedUser,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });

    const textContent = steps
      .flatMap((step) => step.content)
      .find((content) => content.type === "text");

    const text: string = textContent ? textContent.text : "";

    await publish(
      openaiChannel().status({
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
      openaiChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
