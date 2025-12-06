import { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { channel, topic } from "@inngest/realtime";

export const switchChannel = channel("switch-execution").addTopic(
  topic("status").type<{
    nodeId: string;
    status: NodeStatus;
  }>()
);
