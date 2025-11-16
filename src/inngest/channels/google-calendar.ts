import { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { channel, topic } from "@inngest/realtime";

export const googleCalendarChannel = channel(
  "google-calendar-execution"
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: NodeStatus;
  }>()
);
