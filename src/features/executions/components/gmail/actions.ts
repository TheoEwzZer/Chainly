"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { gmailChannel } from "@/inngest/channels/gmail";
import { inngest } from "@/inngest/client";

export type GmailSubscriptionToken = Realtime.Token<
  typeof gmailChannel,
  ["status"]
>;

export async function fetchGmailRealtimeToken(): Promise<GmailSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: gmailChannel(),
    topics: ["status"],
  });
}
