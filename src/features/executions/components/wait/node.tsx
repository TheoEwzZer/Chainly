"use client";

import { Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { WaitFormValues, WaitDialog } from "./dialog";
import { useWaitCountdown } from "./use-wait-countdown";
import { waitChannel } from "@/inngest/channels/wait";
import { fetchWaitRealtimeToken } from "./actions";
import { WorkflowNode } from "@/components/workflow-node";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { useAtomValue } from "jotai";
import {
  EditorActions,
  editorActionsAtom,
} from "@/features/editor/store/atoms";
import { Timer } from "lucide-react";

type WaitNodeType = Node<WaitFormValues>;

const formatDuration = (duration: number, unit: string): string => {
  const singular = unit.slice(0, -1);
  return duration === 1 ? `${duration} ${singular}` : `${duration} ${unit}`;
};

export const WaitNode = memo(
  (props: NodeProps<WaitNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const { status: nodeStatus, remainingFormatted } = useWaitCountdown({
      nodeId: props.id,
      channel: waitChannel().name,
      refreshToken: fetchWaitRealtimeToken,
    });

    const editorActions: EditorActions | null = useAtomValue(editorActionsAtom);

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const handleDelete = (): void => {
      if (editorActions) {
        editorActions.deleteNodeById(props.id);
      }
    };

    const handleSubmit = (values: WaitFormValues): void => {
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

    const nodeData = props.data as WaitFormValues;
    const duration: number = nodeData?.duration || 5;
    const unit: string = nodeData?.unit || "seconds";
    const configuredDuration: string = formatDuration(duration, unit);

    const description: string =
      nodeStatus === "loading" && remainingFormatted
        ? `${remainingFormatted} remaining`
        : configuredDuration;

    return (
      <>
        <WorkflowNode
          name="Wait"
          description={description}
          onDelete={handleDelete}
          onSettings={handleSettings}
        >
          <NodeStatusIndicator status={nodeStatus} variant="border">
            <BaseNode status={nodeStatus} onDoubleClick={handleSettings}>
              <BaseNodeContent>
                <div className="flex items-center justify-center">
                  <Timer className="size-4 text-muted-foreground" />
                </div>
                <BaseHandle
                  id="target-1"
                  type="target"
                  position={Position.Left}
                />
                <BaseHandle
                  id="source-1"
                  type="source"
                  position={Position.Right}
                />
              </BaseNodeContent>
            </BaseNode>
          </NodeStatusIndicator>
        </WorkflowNode>
        <WaitDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

WaitNode.displayName = "WaitNode";
