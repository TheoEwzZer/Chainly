"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { emailChannel } from "@/inngest/channels/email";
import { inngest } from "@/inngest/client";

export type EmailSubscriptionToken = Realtime.Token<
  typeof emailChannel,
  ["status"]
>;

export async function fetchEmailRealtimeToken(): Promise<EmailSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: emailChannel(),
    topics: ["status"],
  });
}
