"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { codeChannel } from "@/inngest/channels/code";
import { inngest } from "@/inngest/client";

export type CodeSubscriptionToken = Realtime.Token<
  typeof codeChannel,
  ["status"]
>;

export async function fetchCodeRealtimeToken(): Promise<CodeSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: codeChannel(),
    topics: ["status"],
  });
}
