"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { HumanApprovalFormValues, HumanApprovalDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { humanApprovalChannel } from "@/inngest/channels/human-approval";
import { fetchHumanApprovalRealtimeToken } from "./actions";
import { Check } from "lucide-react";

type HumanApprovalNodeType = Node<HumanApprovalFormValues>;

export const HumanApprovalNode = memo(
  (props: NodeProps<HumanApprovalNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: humanApprovalChannel().name,
      topic: "status",
      refreshToken: fetchHumanApprovalRealtimeToken,
    });

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: HumanApprovalFormValues): void => {
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

    const nodeData = props.data as HumanApprovalFormValues;
    const description: string = nodeData?.message
      ? nodeData.message.slice(0, 50) +
        (nodeData.message.length > 50 ? "..." : "")
      : "Not configured";

    return (
      <>
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={Check}
          name="Human Approval"
          status={nodeStatus}
          description={description}
          onSettings={handleSettings}
          onDoubleClick={handleSettings}
        />
        <HumanApprovalDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

HumanApprovalNode.displayName = "HumanApprovalNode";

