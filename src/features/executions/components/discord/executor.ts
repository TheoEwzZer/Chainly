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

export const discordExecutor: NodeExecutor<DiscordFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
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

  const mode: "webhook" | "bot" = data.mode || "webhook";

  if (mode === "webhook") {
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
  } else {
    if (!data.credentialId) {
      await step.run(`publish-error-credential-${nodeId}`, async () => {
        await publish(
          discordChannel().status({
            nodeId,
            status: "error",
          })
        );
      });
      throw new NonRetriableError(
        "Discord Node: Bot token credential is required"
      );
    }

    if (!data.userId) {
      await step.run(`publish-error-userid-${nodeId}`, async () => {
        await publish(
          discordChannel().status({
            nodeId,
            status: "error",
          })
        );
      });
      throw new NonRetriableError("Discord Node: Discord user ID is required");
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
      await step.run(
        `publish-error-credential-not-found-${nodeId}`,
        async () => {
          await publish(
            discordChannel().status({
              nodeId,
              status: "error",
            })
          );
        }
      );
      throw new NonRetriableError("Discord Node: Credential not found");
    }

    try {
      const botToken: string = decrypt(credential.value).trim();
      const userIdTemplate: string = transformBracketNotation(data.userId);
      const contentTemplate: string = transformBracketNotation(data.content);

      const renderedUserId: string =
        Handlebars.compile(userIdTemplate)(context);
      const renderedContent: string =
        Handlebars.compile(contentTemplate)(context);
      const content: string = decode(renderedContent);

      const cleanBotToken: string = botToken.startsWith("Bot ")
        ? botToken.slice(4).trim()
        : botToken;

      const result: WorkflowContext = await step.run(
        `discord-bot-${nodeId}`,
        async () => {
          let dmChannelId: string;

          try {
            const dmChannel: { id: string } = await ky
              .post("https://discord.com/api/v10/users/@me/channels", {
                headers: {
                  Authorization: `Bot ${cleanBotToken}`,
                  "Content-Type": "application/json",
                },
                json: {
                  recipient_id: renderedUserId,
                },
              })
              .json<{ id: string }>();

            dmChannelId = dmChannel.id;
          } catch (error: any) {
            const statusCode: number | undefined = error.response?.status;

            if (statusCode === 401) {
              throw new NonRetriableError(
                "Discord Node: Invalid bot token. Please verify your bot token is correct and hasn't been revoked."
              );
            }
            if (statusCode === 403) {
              throw new NonRetriableError(
                "Discord Node: Bot cannot create DM with this user. The bot and user must share at least one server, and the user must allow DMs from server members."
              );
            }
            if (statusCode === 404) {
              throw new NonRetriableError(
                "Discord Node: User ID not found. Please verify the Discord user ID is correct."
              );
            }
            throw new NonRetriableError(
              `Discord Node: Failed to create DM channel. ${
                error.message || "Unknown error"
              }`
            );
          }

          try {
            await ky.post(
              `https://discord.com/api/v10/channels/${dmChannelId}/messages`,
              {
                headers: {
                  Authorization: `Bot ${cleanBotToken}`,
                  "Content-Type": "application/json",
                },
                json: {
                  content: content.slice(0, 2000),
                },
              }
            );
          } catch (error: any) {
            const statusCode: number | undefined = error.response?.status;
            if (statusCode === 401) {
              throw new NonRetriableError(
                "Discord Node: Invalid bot token when sending message. Please verify your bot token is correct."
              );
            }
            if (statusCode === 403) {
              throw new NonRetriableError(
                "Discord Node: Bot doesn't have permission to send messages in this DM channel."
              );
            }
            throw new NonRetriableError(
              `Discord Node: Failed to send message. ${
                error.message || "Unknown error"
              }`
            );
          }

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
  }
};
