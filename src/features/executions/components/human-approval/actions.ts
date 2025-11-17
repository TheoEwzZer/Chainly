"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { humanApprovalChannel } from "@/inngest/channels/human-approval";
import { inngest } from "@/inngest/client";

export type HumanApprovalSubscriptionToken = Realtime.Token<
  typeof humanApprovalChannel,
  ["status"]
>;

export async function fetchHumanApprovalRealtimeToken(): Promise<HumanApprovalSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: humanApprovalChannel(),
    topics: ["status"],
  });
}
