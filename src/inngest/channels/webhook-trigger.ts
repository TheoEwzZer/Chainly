import { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { channel, topic } from "@inngest/realtime";

export const webhookTriggerChannel = channel(
  "webhook-trigger-execution"
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: NodeStatus;
  }>()
);
