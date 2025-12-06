"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { GmailFormValues, GmailDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { gmailChannel } from "@/inngest/channels/gmail";
import { fetchGmailRealtimeToken } from "./actions";

type GmailNodeType = Node<GmailFormValues>;

export const GmailNode = memo(
  (props: NodeProps<GmailNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: gmailChannel().name,
      topic: "status",
      refreshToken: fetchGmailRealtimeToken,
    });

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GmailFormValues): void => {
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

    const nodeData = props.data as GmailFormValues;

    const getDescription = (): string => {
      if (!nodeData?.credentialId) return "Not configured";

      const parts: string[] = [];

      if (nodeData.mailboxes && nodeData.mailboxes.length > 0) {
        parts.push(nodeData.mailboxes.join(", "));
      }

      if (nodeData.dateFilter) {
        const dateLabels: Record<string, string> = {
          today: "today",
          yesterday: "yesterday",
          this_week: "this week",
          this_month: "this month",
          specific_date: nodeData.specificDate || "specific date",
          date_range: "date range",
          all: "all time",
        };
        parts.push(dateLabels[nodeData.dateFilter] || nodeData.dateFilter);
      }

      if (nodeData.readStatus === "unread") {
        parts.push("unread");
      } else if (nodeData.readStatus === "read") {
        parts.push("read");
      }

      return parts.length > 0 ? parts.join(", ") : "Configured";
    };

    return (
      <>
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/gmail.svg"
          name="Gmail"
          status={nodeStatus}
          description={getDescription()}
          onSettings={handleSettings}
          onDoubleClick={handleSettings}
        />
        <GmailDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

GmailNode.displayName = "GmailNode";
