"use client";

import { useInngestSubscription } from "@inngest/realtime/hooks";
import { Realtime } from "@inngest/realtime";
import { useState, useEffect, useMemo, useRef, RefObject } from "react";
import { NodeStatus } from "@/components/react-flow/node-status-indicator";

type NodeStatusMessage =
  Realtime.Subscribe.Token.InferMessage<Realtime.Subscribe.Token>;

interface CountdownData {
  startedAt: string;
  durationMs: number;
  messageCreatedAt: Date;
}

interface UseWaitCountdownOptions {
  nodeId: string;
  channel: string;
  refreshToken: () => Promise<Realtime.Subscribe.Token>;
}

interface UseWaitCountdownResult {
  status: NodeStatus;
  remainingMs: number | null;
  remainingFormatted: string | null;
}

const formatRemainingTime = (ms: number): string => {
  if (ms <= 0) {
    return "0s";
  }

  const totalSeconds: number = Math.ceil(ms / 1000);
  const days: number = Math.floor(totalSeconds / 86400);
  const hours: number = Math.floor((totalSeconds % 86400) / 3600);
  const minutes: number = Math.floor((totalSeconds % 3600) / 60);
  const seconds: number = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

interface CountdownSyncPoint {
  startedAt: string;
  clientReceivedAt: number;
  countdownData: CountdownData;
}

export function useWaitCountdown({
  nodeId,
  channel,
  refreshToken,
}: UseWaitCountdownOptions): UseWaitCountdownResult {
  const [now, setNow] = useState<number>((): number => Date.now());
  const [syncPoint, setSyncPoint] = useState<CountdownSyncPoint | null>(null);
  const lastStartedAtRef: RefObject<string | null> = useRef<string | null>(null);

  const { data } = useInngestSubscription({
    refreshToken,
    enabled: true,
  });

  const status: NodeStatus = useMemo((): NodeStatus => {
    if (!data?.length) {
      return "initial";
    }

    const latestStatusMessage: NodeStatusMessage | undefined = data
      .filter(
        (msg: NodeStatusMessage): boolean =>
          msg.kind === "data" &&
          msg.channel === channel &&
          msg.topic === "status" &&
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

    if (latestStatusMessage?.kind === "data") {
      return latestStatusMessage.data.status as NodeStatus;
    }

    return "initial";
  }, [data, channel, nodeId]);

  const countdownData: CountdownData | null = useMemo(() => {
    if (!data?.length) {
      return null;
    }

    const latestCountdownMessage: NodeStatusMessage | undefined = data
      .filter(
        (msg: NodeStatusMessage): boolean =>
          msg.kind === "data" &&
          msg.channel === channel &&
          msg.topic === "countdown" &&
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

    if (latestCountdownMessage?.kind === "data") {
      return {
        startedAt: latestCountdownMessage.data.startedAt as string,
        durationMs: latestCountdownMessage.data.durationMs as number,
        messageCreatedAt: latestCountdownMessage.createdAt,
      };
    }

    return null;
  }, [data, channel, nodeId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!countdownData) {
      if (lastStartedAtRef.current !== null) {
        lastStartedAtRef.current = null;
        setSyncPoint(null);
      }
      return;
    }

    if (lastStartedAtRef.current !== countdownData.startedAt) {
      lastStartedAtRef.current = countdownData.startedAt;
      setSyncPoint({
        startedAt: countdownData.startedAt,
        clientReceivedAt: Date.now(),
        countdownData,
      });
    }
  }, [countdownData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const remainingMs: number | null = useMemo((): number | null => {
    if (!syncPoint || status !== "loading") {
      return null;
    }

    const serverStartTime: number = new Date(syncPoint.startedAt).getTime();
    const serverMessageTime: number =
      syncPoint.countdownData.messageCreatedAt.getTime();
    const serverElapsedAtMessage: number = serverMessageTime - serverStartTime;
    const remainingAtMessage: number =
      syncPoint.countdownData.durationMs - serverElapsedAtMessage;
    const clientElapsed: number = now - syncPoint.clientReceivedAt;
    const remaining: number = remainingAtMessage - clientElapsed;

    return Math.max(0, remaining);
  }, [syncPoint, status, now]);

  useEffect(() => {
    if (status !== "loading" || !countdownData) {
      return;
    }

    const immediateSync: NodeJS.Timeout = setTimeout((): void => {
      setNow(Date.now());
    }, 0);

    const interval: NodeJS.Timeout = setInterval((): void => {
      setNow(Date.now());
    }, 1000);

    return (): void => {
      clearTimeout(immediateSync);
      clearInterval(interval);
    };
  }, [status, countdownData]);

  return {
    status,
    remainingMs,
    remainingFormatted:
      remainingMs === null ? null : formatRemainingTime(remainingMs),
  };
}
