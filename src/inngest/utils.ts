import type { Connection, Node, NodeType } from "@/generated/prisma/client";
import topoSort from "toposort";
import { inngest } from "./client";
import { NodeTypeOption, triggerNodes } from "@/config/node-types";
import { createId } from "@paralleldrive/cuid2";

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
  connections: Connection[],
  triggerNodeId?: string
): Node[] => {
  if (nodes.length === 0) {
    throw new Error("You must have at least one node in your workflow");
  }

  const triggerTypes = new Set(
    triggerNodes.map((n: NodeTypeOption): NodeType => n.type)
  );

  let triggerNodesList: Node[];

  if (triggerNodeId) {
    const specifiedTrigger: Node | undefined = nodes.find(
      (node: Node): boolean => node.id === triggerNodeId
    );

    if (!specifiedTrigger) {
      throw new Error(`Trigger node with ID ${triggerNodeId} not found`);
    }

    if (!triggerTypes.has(specifiedTrigger.type as NodeType)) {
      throw new Error(`Node with ID ${triggerNodeId} is not a trigger node`);
    }

    triggerNodesList = [specifiedTrigger];
  } else {
    triggerNodesList = nodes.filter((node: Node): boolean =>
      triggerTypes.has(node.type as NodeType)
    );

    if (triggerNodesList.length === 0) {
      throw new Error("No trigger node found in workflow");
    }
  }

  const allReachableNodeIds: Set<string> = new Set();
  for (const triggerNode of triggerNodesList) {
    const reachableIds: Set<string> = findReachableNodes(
      triggerNode,
      connections
    );
    for (const nodeId of reachableIds) {
      allReachableNodeIds.add(nodeId);
    }
  }

  const reachableNodes: Node[] = nodes.filter((node: Node): boolean =>
    allReachableNodeIds.has(node.id)
  );

  const reachableConnections: Connection[] = connections.filter(
    (conn: Connection): boolean =>
      allReachableNodeIds.has(conn.fromNodeId) &&
      allReachableNodeIds.has(conn.toNodeId)
  );

  if (
    reachableConnections.length === 0 &&
    reachableNodes.length > triggerNodesList.length
  ) {
    throw new Error(
      "You must have at least one connection between reachable nodes"
    );
  }

  if (reachableConnections.length === 0) {
    return reachableNodes;
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

export const getNodePredecessors = (
  nodeId: string,
  connections: Connection[]
): string[] => {
  return connections
    .filter((conn: Connection): boolean => conn.toNodeId === nodeId)
    .map((conn: Connection): string => conn.fromNodeId);
};

export const hasFailedPredecessor = (
  nodeId: string,
  connections: Connection[],
  failedNodeIds: Set<string>
): boolean => {
  const predecessors: string[] = getNodePredecessors(nodeId, connections);

  for (const predecessorId of predecessors) {
    if (failedNodeIds.has(predecessorId)) {
      return true;
    }
  }

  return false;
};

export const sendWorkflowExecution = async (data: {
  workflowId: string;
  triggerNodeId?: string;
  [key: string]: unknown;
}) => {
  return inngest.send({
    id: createId(),
    name: "workflow/execute.workflow",
    data,
  });
};

export const publishNodeStatus = async (
  channelName: string,
  nodeId: string,
  status: "success" | "error" | "running" | "initial"
) => {
  return inngest.send({
    id: createId(),
    name: "node/update-status",
    data: {
      channel: channelName,
      topic: "status",
      nodeId,
      status,
    },
  });
};
