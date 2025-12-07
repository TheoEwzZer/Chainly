import { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { channel, topic } from "@inngest/realtime";

export const setChannel = channel("set-execution").addTopic(
  topic("status").type<{
    nodeId: string;
    status: NodeStatus;
  }>()
);
