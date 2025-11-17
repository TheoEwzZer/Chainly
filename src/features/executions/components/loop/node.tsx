"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { LoopFormValues, LoopDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { loopChannel } from "@/inngest/channels/loop";
import { fetchLoopRealtimeToken } from "./actions";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { Realtime } from "@inngest/realtime";
import { Repeat } from "lucide-react";

type LoopNodeType = Node<LoopFormValues>;

type NodeIterationMessage =
  Realtime.Subscribe.Token.InferMessage<Realtime.Subscribe.Token>;

export const LoopNode = memo((props: NodeProps<LoopNodeType>): ReactElement => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: loopChannel().name,
    topic: "status",
    refreshToken: fetchLoopRealtimeToken,
  });

  const { data: iterationData } = useInngestSubscription({
    refreshToken: fetchLoopRealtimeToken,
    enabled: true,
  });

  const iterationMessage: NodeIterationMessage | undefined = iterationData
    ?.filter(
      (msg: NodeIterationMessage): boolean =>
        msg.kind === "data" &&
        msg.channel === loopChannel().name &&
        msg.topic === "iteration" &&
        msg.data.nodeId === props.id
    )
    .sort((a: NodeIterationMessage, b: NodeIterationMessage): number => {
      if (a.kind === "data" && b.kind === "data") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return 0;
    })[0];

  const currentIteration =
    iterationMessage?.kind === "data" ? iterationMessage.data : null;

  const handleSettings = (): void => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: LoopFormValues): void => {
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

  const nodeData = props.data as LoopFormValues;
  const description: string = nodeData?.arrayPath
    ? `Loop over: ${nodeData.arrayPath.slice(0, 40)}${
        nodeData.arrayPath.length > 40 ? "..." : ""
      }`
    : "Not configured";

  const secondaryDescription: string | undefined = currentIteration
    ? `Iteration: ${currentIteration.current} / ${currentIteration.total}`
    : undefined;

  return (
    <>
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Repeat}
        name="Loop"
        status={nodeStatus}
        description={description}
        secondaryDescription={secondaryDescription}
        onSettings={handleSettings}
        onDoubleClick={handleSettings}
      />
      <LoopDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
    </>
  );
});

LoopNode.displayName = "LoopNode";
