"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger";
import { inngest } from "@/inngest/client";

export type ScheduleTriggerSubscriptionToken = Realtime.Token<
  typeof scheduleTriggerChannel,
  ["status"]
>;

export async function fetchScheduleTriggerRealtimeToken(): Promise<ScheduleTriggerSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: scheduleTriggerChannel(),
    topics: ["status"],
  });
}

