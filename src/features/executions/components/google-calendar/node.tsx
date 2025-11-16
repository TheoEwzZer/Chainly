"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { GoogleCalendarFormValues, GoogleCalendarDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { googleCalendarChannel } from "@/inngest/channels/google-calendar";
import { fetchGoogleCalendarRealtimeToken } from "./actions";

type GoogleCalendarNodeType = Node<GoogleCalendarFormValues>;

export const GoogleCalendarNode = memo(
  (props: NodeProps<GoogleCalendarNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: googleCalendarChannel().name,
      topic: "status",
      refreshToken: fetchGoogleCalendarRealtimeToken,
    });

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GoogleCalendarFormValues): void => {
      setNodes((nodes: Node[]): Node[] =>
        nodes.map((node: Node): Node => {
          if (node.id === props.id) {
            return {
              ...node,
              data: {
                ...node.data,
                ...values,
              },
            };
          }
          return node;
        })
      );
    };

    const nodeData = props.data as GoogleCalendarFormValues;
    const description: string = nodeData?.calendarId
      ? `Calendar: ${nodeData.calendarId}`
      : "Not configured";

    return (
      <>
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/google-calendar.svg"
          name="Google Calendar"
          status={nodeStatus}
          description={description}
          onSettings={handleSettings}
          onDoubleClick={handleSettings}
        />
        <GoogleCalendarDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

GoogleCalendarNode.displayName = "GoogleCalendarNode";
