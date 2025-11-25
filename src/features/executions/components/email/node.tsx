"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { EmailFormValues, EmailDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { emailChannel } from "@/inngest/channels/email";
import { fetchEmailRealtimeToken } from "./actions";

type EmailNodeType = Node<EmailFormValues>;

export const EmailNode = memo(
  (props: NodeProps<EmailNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: emailChannel().name,
      topic: "status",
      refreshToken: fetchEmailRealtimeToken,
    });

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: EmailFormValues): void => {
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

    const nodeData = props.data as EmailFormValues;
    const description: string = nodeData?.to
      ? `To: ${nodeData.to.slice(0, 30)}${nodeData.to.length > 30 ? "..." : ""}`
      : "Not configured";

    return (
      <>
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/resend.svg"
          name="Email"
          status={nodeStatus}
          description={description}
          onSettings={handleSettings}
          onDoubleClick={handleSettings}
        />
        <EmailDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

EmailNode.displayName = "EmailNode";
