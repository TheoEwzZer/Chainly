"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { AnthropicFormValues, AnthropicDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { anthropicChannel } from "@/inngest/channels/anthropic";
import { fetchAnthropicRealtimeToken } from "./actions";

type AnthropicNodeType = Node<AnthropicFormValues>;

export const AnthropicNode = memo(
  (props: NodeProps<AnthropicNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: anthropicChannel().name,
      topic: "status",
      refreshToken: fetchAnthropicRealtimeToken,
    });

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: AnthropicFormValues): void => {
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

    const nodeData = props.data as AnthropicFormValues;
    const description: string = nodeData?.userPrompt
      ? nodeData.userPrompt.slice(0, 50) +
        (nodeData.userPrompt.length > 50 ? "..." : "")
      : "Not configured";

    return (
      <>
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/anthropic.svg"
          name="Anthropic Claude"
          status={nodeStatus}
          description={description}
          onSettings={handleSettings}
          onDoubleClick={handleSettings}
        />
        <AnthropicDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

AnthropicNode.displayName = "AnthropicNode";
