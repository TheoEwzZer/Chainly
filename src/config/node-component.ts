import { InitialNode } from "@/components/initial-node";
import { GeminiNode } from "@/features/executions/components/gemini/node";
import { AnthropicNode } from "@/features/executions/components/anthropic/node";
import { OpenAINode } from "@/features/executions/components/openai/node";
import { HttpRequestNode } from "@/features/executions/components/http-request/node";
import { GoogleFormTriggerNode } from "@/features/triggers/components/google-form-trigger/node";
import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger/node";
import { WebhookTriggerNode } from "@/features/triggers/components/webhook-trigger/node";
import { GitHubTriggerNode } from "@/features/triggers/components/github-trigger/node";
import { ScheduleTriggerNode } from "@/features/triggers/components/schedule-trigger/node";
import { NodeType } from "@/generated/prisma/enums";
import type { NodeTypes } from "@xyflow/react";
import { DiscordNode } from "@/features/executions/components/discord/node";
import { GoogleCalendarNode } from "@/features/executions/components/google-calendar/node";
import { GmailNode } from "@/features/executions/components/gmail/node";
import { HumanApprovalNode } from "@/features/executions/components/human-approval/node";
import { LoopNode } from "@/features/executions/components/loop/node";
import { ConditionalNode } from "@/features/executions/components/conditional/node";
import { SwitchNode } from "@/features/executions/components/switch/node";
import { EmailNode } from "@/features/executions/components/email/node";

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTriggerNode,
  [NodeType.WEBHOOK_TRIGGER]: WebhookTriggerNode,
  [NodeType.GITHUB_TRIGGER]: GitHubTriggerNode,
  [NodeType.SCHEDULE_TRIGGER]: ScheduleTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.ANTHROPIC]: AnthropicNode,
  [NodeType.OPENAI]: OpenAINode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.GOOGLE_CALENDAR]: GoogleCalendarNode,
  [NodeType.GMAIL]: GmailNode,
  [NodeType.HUMAN_APPROVAL]: HumanApprovalNode,
  [NodeType.LOOP]: LoopNode,
  [NodeType.CONDITIONAL]: ConditionalNode,
  [NodeType.SWITCH]: SwitchNode,
  [NodeType.EMAIL]: EmailNode,
} as const satisfies NodeTypes;

export type RegisteredNodeTypes = keyof typeof nodeComponents;
