import { NodeType } from "@/generated/prisma/enums";
import {
  NodeExecutor,
  NodeExecutorParams,
  WorkflowContext,
} from "../components/types";
import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { httpRequestExecutor } from "../components/http-request/executor";
import { googleFormTriggerExecutor } from "@/features/triggers/components/google-form-trigger/executor";
import { webhookTriggerExecutor } from "@/features/triggers/components/webhook-trigger/executor";
import { githubTriggerExecutor } from "@/features/triggers/components/github-trigger/executor";
import { scheduleTriggerExecutor } from "@/features/triggers/components/schedule-trigger/executor";
import { geminiExecutor } from "../components/gemini/executor";
import { anthropicExecutor } from "../components/anthropic/executor";
import { openaiExecutor } from "../components/openai/executor";
import { discordExecutor } from "../components/discord/executor";
import { googleCalendarExecutor } from "../components/google-calendar/executor";

const initialExecutor: NodeExecutor<Record<string, unknown>> = async ({
  context,
}: NodeExecutorParams<Record<string, unknown>>): Promise<WorkflowContext> => {
  return context;
};

export const executorRegistry: Record<NodeType, NodeExecutor<any>> = {
  [NodeType.INITIAL]: initialExecutor,
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.WEBHOOK_TRIGGER]: webhookTriggerExecutor,
  [NodeType.GITHUB_TRIGGER]: githubTriggerExecutor,
  [NodeType.SCHEDULE_TRIGGER]: scheduleTriggerExecutor,
  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.ANTHROPIC]: anthropicExecutor,
  [NodeType.OPENAI]: openaiExecutor,
  [NodeType.DISCORD]: discordExecutor,
  [NodeType.GOOGLE_CALENDAR]: googleCalendarExecutor,
} as const;

export const getExecutor = (nodeType: NodeType): NodeExecutor<any> => {
  const executor: NodeExecutor<any> = executorRegistry[nodeType];

  if (!executor) {
    throw new Error(`Executor for node type ${nodeType} not found`);
  }

  return executor;
};
