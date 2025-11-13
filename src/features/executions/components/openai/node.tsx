"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { OpenAIFormValues, OpenAIDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { openaiChannel } from "@/inngest/channels/openai";
import { fetchOpenAIRealtimeToken } from "./actions";

type OpenAINodeType = Node<OpenAIFormValues>;

export const OpenAINode = memo(
  (props: NodeProps<OpenAINodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: openaiChannel().name,
      topic: "status",
      refreshToken: fetchOpenAIRealtimeToken,
    });

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: OpenAIFormValues): void => {
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

    const nodeData = props.data as OpenAIFormValues;
    const description: string = nodeData?.userPrompt
      ? nodeData.userPrompt.slice(0, 50) +
        (nodeData.userPrompt.length > 50 ? "..." : "")
      : "Not configured";

    return (
      <>
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon="/logos/openai.svg"
          name="OpenAI"
          status={nodeStatus}
          description={description}
          onSettings={handleSettings}
          onDoubleClick={handleSettings}
        />
        <OpenAIDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

OpenAINode.displayName = "OpenAINode";

