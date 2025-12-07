import { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { channel, topic } from "@inngest/realtime";

export const waitChannel = channel("wait-execution")
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: NodeStatus;
    }>()
  )
  .addTopic(
    topic("countdown").type<{
      nodeId: string;
      startedAt: string;
      durationMs: number;
    }>()
  );
