"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { googleCalendarChannel } from "@/inngest/channels/google-calendar";
import { inngest } from "@/inngest/client";

export type GoogleCalendarSubscriptionToken = Realtime.Token<
  typeof googleCalendarChannel,
  ["status"]
>;

export async function fetchGoogleCalendarRealtimeToken(): Promise<GoogleCalendarSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: googleCalendarChannel(),
    topics: ["status"],
  });
}
