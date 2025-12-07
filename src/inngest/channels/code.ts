import { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { channel, topic } from "@inngest/realtime";

export const codeChannel = channel("code-execution").addTopic(
  topic("status").type<{
    nodeId: string;
    status: NodeStatus;
  }>()
);
