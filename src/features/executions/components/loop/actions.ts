"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { loopChannel } from "@/inngest/channels/loop";
import { inngest } from "@/inngest/client";

export type LoopSubscriptionToken = Realtime.Token<
  typeof loopChannel,
  ["status", "iteration"]
>;

export async function fetchLoopRealtimeToken(): Promise<LoopSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: loopChannel(),
    topics: ["status", "iteration"],
  });
}

