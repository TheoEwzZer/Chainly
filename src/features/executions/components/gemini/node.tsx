"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { GeminiFormValues, GeminiDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { geminiChannel } from "@/inngest/channels/gemini";
import { fetchGeminiRealtimeToken } from "./actions";

type GeminiNodeType = Node<GeminiFormValues>;

export const GeminiNode = memo(
  (props: NodeProps<GeminiNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: geminiChannel().name,
      topic: "status",
      refreshToken: fetchGeminiRealtimeToken,
    });

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GeminiFormValues): void => {
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

    const nodeData = props.data as GeminiFormValues;
    const description: string = nodeData?.userPrompt
      ? nodeData.userPrompt.slice(0, 50) +
        (nodeData.userPrompt.length > 50 ? "..." : "")
      : "Not configured";

    return (
      <>
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/gemini.svg"
          name="Gemini"
          status={nodeStatus}
          description={description}
          onSettings={handleSettings}
          onDoubleClick={handleSettings}
        />
        <GeminiDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

GeminiNode.displayName = "GeminiNode";
