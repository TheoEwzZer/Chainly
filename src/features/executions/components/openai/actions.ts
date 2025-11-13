"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { openaiChannel } from "@/inngest/channels/openai";
import { inngest } from "@/inngest/client";

export type OpenAISubscriptionToken = Realtime.Token<
  typeof openaiChannel,
  ["status"]
>;

export async function fetchOpenAIRealtimeToken(): Promise<OpenAISubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: openaiChannel(),
    topics: ["status"],
  });
}

