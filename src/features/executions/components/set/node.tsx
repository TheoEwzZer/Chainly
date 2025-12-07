"use client";

import { Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { SetFormValues, SetDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { setChannel } from "@/inngest/channels/set";
import { fetchSetRealtimeToken } from "./actions";
import { WorkflowNode } from "@/components/workflow-node";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { useAtomValue } from "jotai";
import {
  EditorActions,
  editorActionsAtom,
} from "@/features/editor/store/atoms";
import { PenLine } from "lucide-react";

type SetNodeType = Node<SetFormValues>;

export const SetNode = memo((props: NodeProps<SetNodeType>): ReactElement => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: setChannel().name,
    topic: "status",
    refreshToken: fetchSetRealtimeToken,
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

  const handleSubmit = (values: SetFormValues): void => {
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

  const nodeData = props.data as SetFormValues;
  const fieldCount: number = nodeData?.fields?.length || 0;
  const description: string =
    fieldCount > 0
      ? `${fieldCount} field${fieldCount > 1 ? "s" : ""}`
      : "Not configured";

  return (
    <>
      <WorkflowNode
        name="Set"
        description={description}
        onDelete={handleDelete}
        onSettings={handleSettings}
      >
        <NodeStatusIndicator status={nodeStatus} variant="border">
          <BaseNode status={nodeStatus} onDoubleClick={handleSettings}>
            <BaseNodeContent>
              <div className="flex items-center justify-center">
                <PenLine className="size-4 text-muted-foreground" />
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
      <SetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
    </>
  );
});

SetNode.displayName = "SetNode";
