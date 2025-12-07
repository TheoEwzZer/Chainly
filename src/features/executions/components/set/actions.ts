"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { setChannel } from "@/inngest/channels/set";
import { inngest } from "@/inngest/client";

export type SetSubscriptionToken = Realtime.Token<
  typeof setChannel,
  ["status"]
>;

export async function fetchSetRealtimeToken(): Promise<SetSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: setChannel(),
    topics: ["status"],
  });
}
