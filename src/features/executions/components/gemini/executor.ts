import { NodeExecutor } from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import Handlebars, { SafeString } from "handlebars";
import { geminiChannel } from "@/inngest/channels/gemini";
import { generateText } from "ai";

import {
  createGoogleGenerativeAI,
  GoogleGenerativeAIProvider,
} from "@ai-sdk/google";
import { GeminiFormValues } from "./dialog";
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

export const geminiExecutor: NodeExecutor<GeminiFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await step.run(`publish-loading-${nodeId}`, async () => {
    await publish(
      geminiChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  if (!data.variableName) {
    await step.run(`publish-error-variable-${nodeId}`, async () => {
      await publish(
        geminiChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Gemini Node: Variable name is required");
  }

  if (!data.model) {
    await step.run(`publish-error-model-${nodeId}`, async () => {
      await publish(
        geminiChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Gemini Node: Model is required");
  }

  if (!data.userPrompt) {
    await step.run(`publish-error-prompt-${nodeId}`, async () => {
      await publish(
        geminiChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Gemini Node: User prompt is required");
  }

  if (!data.credentialId) {
    await step.run(`publish-error-credential-${nodeId}`, async () => {
      await publish(
        geminiChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Gemini Node: Credential is required");
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
        geminiChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Gemini Node: Credential not found");
  }

  try {
    const google: GoogleGenerativeAIProvider = createGoogleGenerativeAI({
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

    const { steps } = await step.ai.wrap("gemini-generate-text", generateText, {
      model: google(data.model),
      system: renderedSystem,
      prompt: renderedUser,
    });

    const textContent = steps
      .flatMap((step) => step.content)
      .find((content) => content.type === "text");

    const text: string = textContent ? textContent.text : "";

    await step.run(`publish-success-${nodeId}`, async () => {
      await publish(
        geminiChannel().status({
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
        geminiChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
