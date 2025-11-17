import { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { channel, topic } from "@inngest/realtime";

export const humanApprovalChannel = channel(
  "human-approval-execution"
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: NodeStatus;
  }>()
);
