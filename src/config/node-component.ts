import { InitialNode } from "@/components/initial-node";
import { GeminiNode } from "@/features/executions/components/gemini/node";
import { AnthropicNode } from "@/features/executions/components/anthropic/node";
import { OpenAINode } from "@/features/executions/components/openai/node";
import { HttpRequestNode } from "@/features/executions/components/http-request/node";
import { GoogleFormTriggerNode } from "@/features/triggers/components/google-form-trigger/node";
import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger/node";
import { WebhookTriggerNode } from "@/features/triggers/components/webhook-trigger/node";
import { NodeType } from "@/generated/prisma/enums";
import type { NodeTypes } from "@xyflow/react";
import { DiscordNode } from "@/features/executions/components/discord/node";

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTriggerNode,
  [NodeType.WEBHOOK_TRIGGER]: WebhookTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.ANTHROPIC]: AnthropicNode,
  [NodeType.OPENAI]: OpenAINode,
  [NodeType.DISCORD]: DiscordNode,
} as const satisfies NodeTypes;

export type RegisteredNodeTypes = keyof typeof nodeComponents;
