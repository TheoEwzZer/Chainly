import { Connection, Node, NodeType } from "@/generated/prisma/client";
import topoSort from "toposort";
import { inngest } from "./client";
import { NodeTypeOption, triggerNodes } from "@/config/node-types";

const findReachableNodes = (
  triggerNode: Node,
  connections: Connection[]
): Set<string> => {
  const reachableIds = new Set<string>();
  const queue: string[] = [triggerNode.id];
  reachableIds.add(triggerNode.id);

  const adjacencyMap = new Map<string, string[]>();
  for (const connection of connections) {
    const targets: string[] = adjacencyMap.get(connection.fromNodeId) || [];
    targets.push(connection.toNodeId);
    adjacencyMap.set(connection.fromNodeId, targets);
  }

  while (queue.length > 0) {
    const currentNodeId: string = queue.shift()!;
    const neighbors: string[] = adjacencyMap.get(currentNodeId) || [];

    for (const neighborId of neighbors) {
      if (!reachableIds.has(neighborId)) {
        reachableIds.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  return reachableIds;
};

export const topologicalSort = (
  nodes: Node[],
  connections: Connection[]
): Node[] => {
  if (nodes.length === 0) {
    throw new Error("You must have at least one node in your workflow");
  }

  if (connections.length === 0) {
    throw new Error(
      "You must have at least one connection between reachable nodes"
    );
  }

  const triggerTypes = new Set(
    triggerNodes.map((n: NodeTypeOption): NodeType => n.type)
  );
  const triggerNode: Node | undefined = nodes.find((node: Node): boolean =>
    triggerTypes.has(node.type as NodeType)
  );

  if (!triggerNode) {
    throw new Error("No trigger node found in workflow");
  }

  const reachableNodeIds: Set<string> = findReachableNodes(
    triggerNode,
    connections
  );

  const reachableNodes: Node[] = nodes.filter((node: Node): boolean =>
    reachableNodeIds.has(node.id)
  );

  const reachableConnections: Connection[] = connections.filter(
    (conn: Connection): boolean =>
      reachableNodeIds.has(conn.fromNodeId) &&
      reachableNodeIds.has(conn.toNodeId)
  );

  if (reachableConnections.length === 0) {
    throw new Error(
      "You must have at least one connection between reachable nodes"
    );
  }

  const edges: [string, string][] = reachableConnections.map(
    (connection: Connection): [string, string] => [
      connection.fromNodeId,
      connection.toNodeId,
    ]
  );

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
    reachableNodes.map((node: Node): [string, Node] => [node.id, node])
  );
  return sortedNodeIds
    .map((nodeId: string): Node => nodeMap.get(nodeId)!)
    .filter(Boolean);
};

export const sendWorkflowExecution = async (data: {
  workflowId: string;
  [key: string]: unknown;
}) => {
  return inngest.send({
    name: "workflow/execute.workflow",
    data,
  });
};
