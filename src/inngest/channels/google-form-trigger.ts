import { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { channel, topic } from "@inngest/realtime";

export const googleFormTriggerChannel = channel(
  "google-form-trigger-execution"
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: NodeStatus;
  }>()
);
