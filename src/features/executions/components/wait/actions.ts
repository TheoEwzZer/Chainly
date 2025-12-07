"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { waitChannel } from "@/inngest/channels/wait";
import { inngest } from "@/inngest/client";

export type WaitSubscriptionToken = Realtime.Token<
  typeof waitChannel,
  ["status", "countdown"]
>;

export async function fetchWaitRealtimeToken(): Promise<WaitSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: waitChannel(),
    topics: ["status", "countdown"],
  });
}
