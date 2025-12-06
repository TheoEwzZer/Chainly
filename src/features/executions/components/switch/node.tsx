"use client";

import { Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import { memo, ReactElement, useState } from "react";
import { SwitchFormValues, SwitchDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { switchChannel } from "@/inngest/channels/switch";
import { fetchSwitchRealtimeToken } from "./actions";
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
import { ArrowLeftRight } from "lucide-react";

type SwitchNodeType = Node<SwitchFormValues>;

export const SwitchNode = memo(
  (props: NodeProps<SwitchNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: switchChannel().name,
      topic: "status",
      refreshToken: fetchSwitchRealtimeToken,
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

    const handleSubmit = (values: SwitchFormValues): void => {
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

    const nodeData = props.data as SwitchFormValues;
    const cases: { label: string; value: string }[] = nodeData?.cases || [];
    const description: string = nodeData?.expression
      ? nodeData.expression.slice(0, 30) +
        (nodeData.expression.length > 30 ? "..." : "") +
        ` (${cases.length} cases)`
      : "Not configured";

    const hasDefault: boolean = nodeData?.hasDefault ?? true;
    const allOutputs: { id: string; label: string; isDefault: boolean }[] = [
      ...cases.map((c: { label: string; value: string }, i: number) => ({
        id: `case-${i}`,
        label: c.label,
        isDefault: false,
      })),
      ...(hasDefault
        ? [{ id: "default", label: "Default", isDefault: true }]
        : []),
    ];

    const HANDLE_SPACING = 18;
    const getTopPosition = (index: number): number => {
      return index * HANDLE_SPACING;
    };

    const totalHeight = (allOutputs.length - 1) * HANDLE_SPACING;

    return (
      <>
        <WorkflowNode
          name="Switch"
          description={description}
          onDelete={handleDelete}
          onSettings={handleSettings}
        >
          <NodeStatusIndicator status={nodeStatus} variant="border">
            <BaseNode status={nodeStatus} onDoubleClick={handleSettings}>
              <BaseNodeContent
                className="relative justify-center"
                style={{ minHeight: `${Math.max(totalHeight + 16, 24)}px` }}
              >
                <div className="flex items-center justify-center">
                  <ArrowLeftRight className="size-4 text-muted-foreground" />
                </div>
                <BaseHandle
                  id="target-1"
                  type="target"
                  position={Position.Left}
                />
                {allOutputs.map((output, index) => (
                  <div
                    key={output.id}
                    className="absolute right-0"
                    style={{ top: `${getTopPosition(index)}px` }}
                  >
                    <LabeledHandle
                      id={output.id}
                      type="source"
                      position={Position.Right}
                      title={output.label}
                      className="translate-x-full"
                      labelClassName={`text-xs font-medium px-2 whitespace-nowrap ${
                        output.isDefault
                          ? "text-muted-foreground/70 italic"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                ))}
              </BaseNodeContent>
            </BaseNode>
          </NodeStatusIndicator>
        </WorkflowNode>
        <SwitchDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

SwitchNode.displayName = "SwitchNode";
