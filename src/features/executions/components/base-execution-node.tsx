"use client";

import { NodeProps, Position, useReactFlow } from "@xyflow/react";
import { LucideIcon } from "lucide-react";
import { memo, type ReactElement } from "react";
import { WorkflowNode } from "../../../components/workflow-node";
import {
  BaseNode,
  BaseNodeContent,
} from "../../../components/react-flow/base-node";
import Image from "next/image";
import { BaseHandle } from "../../../components/react-flow/base-handle";
import type { Node, Edge } from "@xyflow/react";
import {
  NodeStatus,
  NodeStatusIndicator,
} from "@/components/react-flow/node-status-indicator";

interface BaseExecutionNodeProps extends NodeProps {
  icon: LucideIcon | string;
  name: string;
  description?: string;
  children?: ReactElement;
  status?: NodeStatus;
  onSettings: () => void;
  onDoubleClick: () => void;
}

export const BaseExecutionNode = memo(
  ({
    id,
    icon: Icon,
    name,
    description,
    children,
    status = "initial",
    onSettings,
    onDoubleClick,
  }: BaseExecutionNodeProps): ReactElement => {
    const { setNodes, setEdges } = useReactFlow();

    const handleDelete = (): void => {
      setNodes((currentNodes: Node[]): Node[] => {
        return currentNodes.filter((node: Node): boolean => node.id !== id);
      });
      setEdges((currentEdges: Edge[]): Edge[] => {
        return currentEdges.filter(
          (edge: Edge): boolean => edge.source !== id && edge.target !== id
        );
      });
    };

    return (
      <WorkflowNode
        name={name}
        description={description}
        onDelete={handleDelete}
        onSettings={onSettings}
      >
        <NodeStatusIndicator status={status} variant="border">
          <BaseNode status={status} onDoubleClick={onDoubleClick}>
            <BaseNodeContent>
              {typeof Icon === "string" ? (
                <Image src={Icon} alt={name} width={16} height={16} />
              ) : (
                <Icon className="size-4 text-muted-foreground" />
              )}
              {children}
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
    );
  }
);

BaseExecutionNode.displayName = "BaseExecutionNode";
