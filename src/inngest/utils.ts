import { Connection, Node } from "@/generated/prisma/client";
import topoSort from "toposort";

export const topologicalSort = (
  nodes: Node[],
  connections: Connection[]
): Node[] => {
  if (connections.length === 0) {
    return nodes;
  }

  const edges: [string, string][] = connections.map(
    (connection: Connection): [string, string] => [
      connection.fromNodeId,
      connection.toNodeId,
    ]
  );

  const connectedNodeIds = new Set<string>();
  for (const connection of connections) {
    connectedNodeIds.add(connection.fromNodeId);
    connectedNodeIds.add(connection.toNodeId);
  }

  for (const node of nodes) {
    if (!connectedNodeIds.has(node.id)) {
      edges.push([node.id, node.id]);
    }
  }

  let sortedNodeIds: string[] = [];
  try {
    sortedNodeIds = topoSort(edges);
    sortedNodeIds = [...new Set(sortedNodeIds)];
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cyclic")) {
      throw new Error("Cyclic dependency detected in workflow");
    }
    throw error;
  }

  const nodeMap = new Map(
    nodes.map((node: Node): [string, Node] => [node.id, node])
  );
  return sortedNodeIds
    .map((nodeId: string): Node => nodeMap.get(nodeId)!)
    .filter(Boolean);
};
