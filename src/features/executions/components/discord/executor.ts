import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import Handlebars, { SafeString } from "handlebars";
import { discordChannel } from "@/inngest/channels/discord";
import ky from "ky";
import { DiscordFormValues } from "./dialog";
import { decode } from "html-entities";

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

export const discordExecutor: NodeExecutor<DiscordFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await step.run(`publish-loading-${nodeId}`, async () => {
    await publish(
      discordChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  if (!data.variableName) {
    await step.run(`publish-error-variable-${nodeId}`, async () => {
      await publish(
        discordChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Discord Node: Variable name is required");
  }

  if (!data.webhookUrl) {
    await step.run(`publish-error-webhook-${nodeId}`, async () => {
      await publish(
        discordChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Discord Node: Webhook URL is required");
  }

  if (!data.content) {
    await step.run(`publish-error-content-${nodeId}`, async () => {
      await publish(
        discordChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Discord Node: Message content is required");
  }

  try {
    const webhookUrlTemplate: string = transformBracketNotation(
      data.webhookUrl
    );
    const contentTemplate: string = transformBracketNotation(data.content);
    const usernameTemplate: string | undefined = data.username
      ? transformBracketNotation(data.username)
      : undefined;

    const renderedWebhookUrl: string =
      Handlebars.compile(webhookUrlTemplate)(context);
    const renderedContent: string =
      Handlebars.compile(contentTemplate)(context);
    const content: string = decode(renderedContent);
    const renderedUsername: string | undefined = usernameTemplate
      ? Handlebars.compile(usernameTemplate)(context)
      : undefined;

    const result: WorkflowContext = await step.run(
      `discord-webhook-${nodeId}`,
      async () => {
        const payload: { content: string; username?: string } = {
          content: content.slice(0, 2000),
        };

        if (renderedUsername) {
          payload.username = renderedUsername;
        }

        await ky.post(renderedWebhookUrl, {
          headers: {
            "Content-Type": "application/json",
          },
          json: payload,
        });

        return {
          ...context,
          [data.variableName]: {
            message: content.slice(0, 2000),
          },
        };
      }
    );

    await step.run(`publish-success-${nodeId}`, async () => {
      await publish(
        discordChannel().status({
          nodeId,
          status: "success",
        })
      );
    });

    return result;
  } catch (error) {
    await step.run(`publish-error-final-${nodeId}`, async () => {
      await publish(
        discordChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
