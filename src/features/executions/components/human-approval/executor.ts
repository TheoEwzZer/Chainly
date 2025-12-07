import { NodeExecutor } from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import Handlebars, { SafeString } from "handlebars";
import { humanApprovalChannel } from "@/inngest/channels/human-approval";
import { HumanApprovalFormValues } from "./dialog";
import prisma from "@/lib/db";
import { ApprovalStatus, ExecutionStatus } from "@/generated/prisma/enums";
import type { Approval } from "@/generated/prisma/client";

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

export class PauseExecutionError extends Error {
  constructor(
    public approvalId: string,
    message: string = "Execution paused for human approval"
  ) {
    super(message);
    this.name = "PauseExecutionError";
  }
}

export const humanApprovalExecutor: NodeExecutor<
  HumanApprovalFormValues
> = async ({ data, nodeId, context, step, publish, userId, executionId }) => {
  await step.run(`publish-loading-${nodeId}`, async (): Promise<void> => {
    await publish(
      humanApprovalChannel().status({
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
          humanApprovalChannel().status({
            nodeId,
            status: "error",
          })
        );
      }
    );
    throw new NonRetriableError(
      "Human Approval Node: Variable name is required"
    );
  }

  if (!data.message) {
    await step.run(
      `publish-error-message-${nodeId}`,
      async (): Promise<void> => {
        await publish(
          humanApprovalChannel().status({
            nodeId,
            status: "error",
          })
        );
      }
    );
    throw new NonRetriableError("Human Approval Node: Message is required");
  }

  try {
    const messageTemplate: string = transformBracketNotation(data.message);
    const renderedMessage: string =
      Handlebars.compile(messageTemplate)(context);

    const approval = await step.run(
      `create-approval-${nodeId}`,
      async (): Promise<Approval> => {
        return await prisma.approval.create({
          data: {
            executionId: executionId,
            nodeId: nodeId,
            userId: userId,
            status: ApprovalStatus.PENDING,
            message: renderedMessage,
            context: context as any,
          },
        });
      }
    );

    await step.run(`pause-execution-${nodeId}`, async (): Promise<void> => {
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.PAUSED,
        },
      });
    });

    await step.run(`publish-waiting-${nodeId}`, async (): Promise<void> => {
      await publish(
        humanApprovalChannel().status({
          nodeId,
          status: "loading",
        })
      );
    });

    throw new PauseExecutionError(approval.id, "Waiting for human approval");
  } catch (error) {
    if (error instanceof PauseExecutionError) {
      throw error;
    }

    await step.run(`publish-error-final-${nodeId}`, async (): Promise<void> => {
      await publish(
        humanApprovalChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
