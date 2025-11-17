"use client";

import { Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { ConditionalFormValues, ConditionalDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { conditionalChannel } from "@/inngest/channels/conditional";
import { fetchConditionalRealtimeToken } from "./actions";
import { WorkflowNode } from "@/components/workflow-node";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { LabeledHandle } from "@/components/react-flow/labeled-handle";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { useAtomValue } from "jotai";
import {
  EditorActions,
  editorActionsAtom,
} from "@/features/editor/store/atoms";
import { GitBranch } from "lucide-react";

type ConditionalNodeType = Node<ConditionalFormValues>;

export const ConditionalNode = memo(
  (props: NodeProps<ConditionalNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: conditionalChannel().name,
      topic: "status",
      refreshToken: fetchConditionalRealtimeToken,
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

    const handleSubmit = (values: ConditionalFormValues): void => {
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

    const nodeData = props.data as ConditionalFormValues;
    const description: string = nodeData?.condition
      ? nodeData.condition.slice(0, 50) +
        (nodeData.condition.length > 50 ? "..." : "")
      : "Not configured";

    return (
      <>
        <WorkflowNode
          name="Conditional"
          description={description}
          onDelete={handleDelete}
          onSettings={handleSettings}
        >
          <NodeStatusIndicator status={nodeStatus} variant="border">
            <BaseNode status={nodeStatus} onDoubleClick={handleSettings}>
              <BaseNodeContent className="relative">
                <div className="flex items-center justify-center">
                  <GitBranch className="size-4 text-muted-foreground" />
                </div>
                <BaseHandle
                  id="target-1"
                  type="target"
                  position={Position.Left}
                />
                <div className="absolute right-0 top-[0%]">
                  <LabeledHandle
                    id="true"
                    type="source"
                    position={Position.Right}
                    title="True"
                    className="translate-x-full"
                    labelClassName="text-xs font-medium text-muted-foreground px-2"
                  />
                </div>
                <div className="absolute right-0 top-[60%]">
                  <LabeledHandle
                    id="false"
                    type="source"
                    position={Position.Right}
                    title="False"
                    className="translate-x-full"
                    labelClassName="text-xs font-medium text-muted-foreground px-2"
                  />
                </div>
              </BaseNodeContent>
            </BaseNode>
          </NodeStatusIndicator>
        </WorkflowNode>
        <ConditionalDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

ConditionalNode.displayName = "ConditionalNode";
