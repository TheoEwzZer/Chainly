"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { errorHandlerChannel } from "@/inngest/channels/error-handler";
import { inngest } from "@/inngest/client";

export type ErrorHandlerSubscriptionToken = Realtime.Token<
  typeof errorHandlerChannel,
  ["status"]
>;

export async function fetchErrorHandlerRealtimeToken(): Promise<ErrorHandlerSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: errorHandlerChannel(),
    topics: ["status"],
  });
}
