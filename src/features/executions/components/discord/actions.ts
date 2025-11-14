"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { discordChannel } from "@/inngest/channels/discord";
import { inngest } from "@/inngest/client";

export type DiscordSubscriptionToken = Realtime.Token<
  typeof discordChannel,
  ["status"]
>;

export async function fetchDiscordRealtimeToken(): Promise<DiscordSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: discordChannel(),
    topics: ["status"],
  });
}
