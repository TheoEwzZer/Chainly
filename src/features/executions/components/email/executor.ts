import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import Handlebars, { SafeString } from "handlebars";
import { emailChannel } from "@/inngest/channels/email";
import ky from "ky";
import { EmailFormValues } from "./dialog";
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

interface ResendResponse {
  id: string;
}

interface ResendErrorResponse {
  statusCode: number;
  message: string;
  name: string;
}

export const emailExecutor: NodeExecutor<EmailFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await step.run(`publish-loading-${nodeId}`, async () => {
    await publish(
      emailChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  if (!data.variableName) {
    await step.run(`publish-error-variable-${nodeId}`, async () => {
      await publish(
        emailChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Email Node: Variable name is required");
  }

  if (!data.credentialId) {
    await step.run(`publish-error-credential-${nodeId}`, async () => {
      await publish(
        emailChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Email Node: Resend API key is required");
  }

  if (!data.from) {
    await step.run(`publish-error-from-${nodeId}`, async () => {
      await publish(
        emailChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Email Node: From address is required");
  }

  if (!data.to) {
    await step.run(`publish-error-to-${nodeId}`, async () => {
      await publish(
        emailChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Email Node: To address is required");
  }

  if (!data.subject) {
    await step.run(`publish-error-subject-${nodeId}`, async () => {
      await publish(
        emailChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Email Node: Subject is required");
  }

  if (!data.body) {
    await step.run(`publish-error-body-${nodeId}`, async () => {
      await publish(
        emailChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Email Node: Email body is required");
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
        emailChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Email Node: Credential not found");
  }

  try {
    const apiKey: string = decrypt(credential.value).trim();

    const fromTemplate: string = transformBracketNotation(data.from);
    const toTemplate: string = transformBracketNotation(data.to);
    const subjectTemplate: string = transformBracketNotation(data.subject);
    const bodyTemplate: string = transformBracketNotation(data.body);

    const renderedFrom: string = Handlebars.compile(fromTemplate)(context);
    const renderedTo: string = Handlebars.compile(toTemplate)(context);
    const renderedSubject: string = Handlebars.compile(subjectTemplate)(context);
    const renderedBody: string = Handlebars.compile(bodyTemplate)(context);

    // Parse multiple recipients (comma-separated)
    const toAddresses: string[] = renderedTo
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    const result: WorkflowContext = await step.run(
      `send-email-${nodeId}`,
      async () => {
        const payload: {
          from: string;
          to: string[];
          subject: string;
          text?: string;
          html?: string;
        } = {
          from: renderedFrom,
          to: toAddresses,
          subject: renderedSubject,
        };

        if (data.isHtml) {
          payload.html = renderedBody;
        } else {
          payload.text = renderedBody;
        }

        try {
          const response: ResendResponse = await ky
            .post("https://api.resend.com/emails", {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              json: payload,
            })
            .json<ResendResponse>();

          return {
            ...context,
            [data.variableName]: {
              id: response.id,
              from: renderedFrom,
              to: toAddresses,
              subject: renderedSubject,
            },
          };
        } catch (error: any) {
          const statusCode: number | undefined = error.response?.status;

          if (statusCode === 401) {
            throw new NonRetriableError(
              "Email Node: Invalid API key. Please verify your Resend API key is correct."
            );
          }
          if (statusCode === 403) {
            throw new NonRetriableError(
              "Email Node: Forbidden. Your API key may not have the required permissions."
            );
          }
          if (statusCode === 422) {
            let errorMessage: string = "Validation error";
            try {
              const errorBody: ResendErrorResponse =
                await error.response?.json();
              errorMessage = errorBody.message || errorMessage;
            } catch {
              // Ignore JSON parsing errors
            }
            throw new NonRetriableError(
              `Email Node: ${errorMessage}. Please check your email addresses and domain verification.`
            );
          }
          if (statusCode === 429) {
            throw new Error(
              "Email Node: Rate limit exceeded. Please try again later."
            );
          }

          throw new NonRetriableError(
            `Email Node: Failed to send email. ${error.message || "Unknown error"}`
          );
        }
      }
    );

    await step.run(`publish-success-${nodeId}`, async () => {
      await publish(
        emailChannel().status({
          nodeId,
          status: "success",
        })
      );
    });

    return result;
  } catch (error) {
    await step.run(`publish-error-final-${nodeId}`, async () => {
      await publish(
        emailChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
