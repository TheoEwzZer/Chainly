import { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { channel, topic } from "@inngest/realtime";

export const loopChannel = channel("loop-execution")
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: NodeStatus;
    }>()
  )
  .addTopic(
    topic("iteration").type<{
      nodeId: string;
      current: number;
      total: number;
    }>()
  );
