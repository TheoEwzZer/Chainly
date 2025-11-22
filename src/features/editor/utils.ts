import type { Node } from "@xyflow/react";
import { NodeType } from "@/generated/prisma/enums";

export const isValidNodeType = (value: unknown): value is NodeType =>
  Object.values(NodeType).includes(value as NodeType);

export const createNodesPayload = (nodes: Node[]) => {
  return nodes.map((node: Node) => ({
    id: node.id,
    position: node.position,
    data: (node.data ?? {}) as Record<string, any>,
    type: isValidNodeType(node.type) ? node.type : undefined,
  }));
};
