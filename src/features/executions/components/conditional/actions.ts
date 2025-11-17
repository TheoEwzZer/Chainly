"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { conditionalChannel } from "@/inngest/channels/conditional";
import { inngest } from "@/inngest/client";

export type ConditionalSubscriptionToken = Realtime.Token<
  typeof conditionalChannel,
  ["status"]
>;

export async function fetchConditionalRealtimeToken(): Promise<ConditionalSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: conditionalChannel(),
    topics: ["status"],
  });
}

