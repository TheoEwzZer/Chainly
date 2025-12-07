"use client";

import { Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { CodeFormValues, CodeDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { codeChannel } from "@/inngest/channels/code";
import { fetchCodeRealtimeToken } from "./actions";
import { WorkflowNode } from "@/components/workflow-node";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { useAtomValue } from "jotai";
import {
  EditorActions,
  editorActionsAtom,
} from "@/features/editor/store/atoms";
import { Code2 } from "lucide-react";

type CodeNodeType = Node<CodeFormValues>;

export const CodeNode = memo((props: NodeProps<CodeNodeType>): ReactElement => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: codeChannel().name,
    topic: "status",
    refreshToken: fetchCodeRealtimeToken,
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

  const handleSubmit = (values: CodeFormValues): void => {
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

  const nodeData = props.data as CodeFormValues;
  const hasCode: boolean | "" =
    nodeData?.code && nodeData.code.trim().length > 0;
  const lineCount: number = hasCode
    ? nodeData.code.split("\n").filter((line: string): string => line.trim())
        .length
    : 0;
  const description: string = hasCode
    ? `${lineCount} line${lineCount > 1 ? "s" : ""}`
    : "Not configured";

  return (
    <>
      <WorkflowNode
        name="Code"
        description={description}
        onDelete={handleDelete}
        onSettings={handleSettings}
      >
        <NodeStatusIndicator status={nodeStatus} variant="border">
          <BaseNode status={nodeStatus} onDoubleClick={handleSettings}>
            <BaseNodeContent>
              <div className="flex items-center justify-center">
                <Code2 className="size-4 text-muted-foreground" />
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
      <CodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
    </>
  );
});

CodeNode.displayName = "CodeNode";
