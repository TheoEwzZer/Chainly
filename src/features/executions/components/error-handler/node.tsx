"use client";

import { Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { ErrorHandlerFormValues, ErrorHandlerDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { errorHandlerChannel } from "@/inngest/channels/error-handler";
import { fetchErrorHandlerRealtimeToken } from "./actions";
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
import { ShieldAlert } from "lucide-react";

type ErrorHandlerNodeType = Node<ErrorHandlerFormValues>;

export const ErrorHandlerNode = memo(
  (props: NodeProps<ErrorHandlerNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: errorHandlerChannel().name,
      topic: "status",
      refreshToken: fetchErrorHandlerRealtimeToken,
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

    const handleSubmit = (values: ErrorHandlerFormValues): void => {
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

    const nodeData = props.data as ErrorHandlerFormValues;
    const variableName: string = nodeData?.variableName || "errorHandler";
    const description: string = `Output: {{${variableName}}}`;

    return (
      <>
        <WorkflowNode
          name="Error Handler"
          description={description}
          onDelete={handleDelete}
          onSettings={handleSettings}
        >
          <NodeStatusIndicator status={nodeStatus} variant="border">
            <BaseNode status={nodeStatus} onDoubleClick={handleSettings}>
              <BaseNodeContent className="relative">
                <div className="flex items-center justify-center">
                  <ShieldAlert className="size-4 text-muted-foreground" />
                </div>
                <BaseHandle
                  id="target-1"
                  type="target"
                  position={Position.Left}
                />
                <div className="absolute right-0 top-[0%]">
                  <LabeledHandle
                    id="success"
                    type="source"
                    position={Position.Right}
                    title="Success"
                    className="translate-x-full"
                    labelClassName="text-xs font-medium text-muted-foreground px-2"
                  />
                </div>
                <div className="absolute right-0 top-[60%]">
                  <LabeledHandle
                    id="error"
                    type="source"
                    position={Position.Right}
                    title="Error"
                    className="translate-x-full"
                    labelClassName="text-xs font-medium text-muted-foreground px-2"
                  />
                </div>
              </BaseNodeContent>
            </BaseNode>
          </NodeStatusIndicator>
        </WorkflowNode>
        <ErrorHandlerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

ErrorHandlerNode.displayName = "ErrorHandlerNode";
