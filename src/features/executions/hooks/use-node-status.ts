"use client";

import { useInngestSubscription } from "@inngest/realtime/hooks";
import { Realtime } from "@inngest/realtime";
import { NodeStatus } from "@/components/react-flow/node-status-indicator";

type NodeStatusMessage =
  Realtime.Subscribe.Token.InferMessage<Realtime.Subscribe.Token>;

interface UseNodeStatusOptions {
  nodeId: string;
  channel: string;
  topic: string;
  refreshToken: () => Promise<Realtime.Subscribe.Token>;
}

export function useNodeStatus({
  nodeId,
  channel,
  topic,
  refreshToken,
}: UseNodeStatusOptions): NodeStatus {
  const { data } = useInngestSubscription({
    refreshToken,
    enabled: true,
  });

  if (!data?.length) {
    return "initial";
  }

  const latestMessage: NodeStatusMessage | undefined = data
    .filter(
      (msg: NodeStatusMessage): boolean =>
        msg.kind === "data" &&
        msg.channel === channel &&
        msg.topic === topic &&
        msg.data.nodeId === nodeId
    )
    .sort((a: NodeStatusMessage, b: NodeStatusMessage): number => {
      if (a.kind === "data" && b.kind === "data") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return 0;
    })[0];

  if (latestMessage?.kind === "data") {
    return latestMessage.data.status as NodeStatus;
  }

  return "initial";
}
