"use client";

import { memo, type ReactElement, useEffect, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { type NodeProps, type Node, useReactFlow } from "@xyflow/react";
import { WebhookTriggerDialog, type WebhookTriggerFormValues } from "./dialog";
import { WebhookIcon } from "lucide-react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";
import { fetchWebhookTriggerRealtimeToken } from "./actions";

export type WebhookTriggerData = WebhookTriggerFormValues & {
  secret: string;
};

const generateSecret = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replaceAll('-', "");
  }
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
};

type WebhookTriggerNodeType = Node<WebhookTriggerData>;

export const WebhookTriggerNode = memo(
  (props: NodeProps<WebhookTriggerNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: webhookTriggerChannel().name,
      topic: "status",
      refreshToken: fetchWebhookTriggerRealtimeToken,
    });

    const nodeData = (props.data || {}) as Partial<WebhookTriggerData>;

    useEffect((): void => {
      if (!nodeData.secret) {
        const newSecret: string = generateSecret();
        setNodes((nodes: Node[]): Node[] =>
          nodes.map((node: Node): Node => {
            if (node.id === props.id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  secret: newSecret,
                },
              };
            }
            return node;
          })
        );
      }
    }, [nodeData.secret, props.id, setNodes]);

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const updateNodeData = (
      updater: (prevData: Record<string, unknown>) => Record<string, unknown>
    ): void => {
      setNodes((nodes: Node[]): Node[] =>
        nodes.map((node: Node): Node => {
          if (node.id === props.id) {
            const prevData = (node.data || {}) as Record<string, unknown>;
            return {
              ...node,
              data: updater(prevData),
            };
          }
          return node;
        })
      );
    };

    const handleSubmit = (values: WebhookTriggerFormValues): void => {
      updateNodeData((prevData: Record<string, unknown>) => ({
        ...prevData,
        ...values,
      }));
    };

    const handleRegenerateSecret = (): void => {
      const newSecret: string = generateSecret();
      updateNodeData((prevData: Record<string, unknown>) => ({
        ...prevData,
        secret: newSecret,
      }));
    };

    const description: string = nodeData.variableName
      ? `Stores payload in "${nodeData.variableName}"`
      : "Not configured";

    return (
      <>
        <BaseTriggerNode
          {...props}
          icon={WebhookIcon}
          name="Incoming Webhook"
          description={description}
          status={nodeStatus}
          onSettings={handleSettings}
          onDoubleClick={handleSettings}
        />
        <WebhookTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          nodeId={props.id}
          secret={nodeData.secret}
          defaultValues={{ variableName: nodeData.variableName }}
          onRegenerateSecret={handleRegenerateSecret}
        />
      </>
    );
  }
);

WebhookTriggerNode.displayName = "WebhookTriggerNode";
