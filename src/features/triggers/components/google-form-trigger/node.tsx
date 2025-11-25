"use client";

import { memo, ReactElement, useState, useEffect } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { NodeProps, useReactFlow, type Node } from "@xyflow/react";
import { GoogleFormTriggerDialog, GoogleFormTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";
import { fetchGoogleFormTriggerRealtimeToken } from "./actions";

const generateSecret = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
};

export type GoogleFormTriggerData = GoogleFormTriggerFormValues & {
  nodeId?: string;
  secret?: string;
};

type GoogleFormTriggerNodeType = Node<GoogleFormTriggerData>;

export const GoogleFormTriggerNode = memo(
  (props: NodeProps<GoogleFormTriggerNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: googleFormTriggerChannel().name,
      topic: "status",
      refreshToken: fetchGoogleFormTriggerRealtimeToken,
    });

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GoogleFormTriggerFormValues): void => {
      setNodes((nodes: Node[]): Node[] =>
        nodes.map((node: Node): Node => {
          if (node.id === props.id) {
            const currentData: GoogleFormTriggerData =
              (node.data as GoogleFormTriggerData) || {};
            return {
              ...node,
              data: {
                ...node.data,
                ...values,
                nodeId: props.id,
                secret: currentData.secret || generateSecret(),
              },
            };
          }
          return node;
        })
      );
    };

    const handleRegenerateSecret = (): void => {
      setNodes((nodes: Node[]): Node[] =>
        nodes.map((node: Node): Node => {
          if (node.id === props.id) {
            return {
              ...node,
              data: {
                ...node.data,
                secret: generateSecret(),
              },
            };
          }
          return node;
        })
      );
    };

    const nodeData = (props.data || {}) as Partial<GoogleFormTriggerData>;

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

    const variableName: string = nodeData.variableName || "googleForm";

    return (
      <>
        <BaseTriggerNode
          {...props}
          icon="/logos/google-form.svg"
          name="Google Form"
          description={`Variable: ${variableName}`}
          status={nodeStatus}
          onSettings={handleSettings}
          onDoubleClick={handleSettings}
        />
        <GoogleFormTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          nodeId={props.id}
          defaultValues={{
            variableName: nodeData.variableName,
            secret: nodeData.secret,
            nodeId: props.id,
          }}
          onRegenerateSecret={handleRegenerateSecret}
        />
      </>
    );
  }
);

GoogleFormTriggerNode.displayName = "GoogleFormTriggerNode";
