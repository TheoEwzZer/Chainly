"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";

export type WebhookTriggerSubscriptionToken = Realtime.Token<
  typeof webhookTriggerChannel,
  ["status"]
>;

export async function fetchWebhookTriggerRealtimeToken(): Promise<WebhookTriggerSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: webhookTriggerChannel(),
    topics: ["status"],
  });
}
