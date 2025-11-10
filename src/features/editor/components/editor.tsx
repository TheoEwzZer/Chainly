"use client";

import { ErrorView, LoadingView } from "@/components/entity-components";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";
import { type ReactElement, useState, useCallback } from "react";
import {
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  type Connection,
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  MiniMap,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ZoomSlider } from "@/components/react-flow/zoom-slider";
import { nodeComponents } from "@/config/node-component";
import { AddNodeButton } from "./add-node-button";
import { useSetAtom } from "jotai";
import { editorAtom } from "../store/atoms";

export const EditorLoading = (): ReactElement => {
  return <LoadingView message="Loading editor..." />;
};

export const EditorError = (): ReactElement => {
  return <ErrorView message="Error loading editor..." />;
};

export const Editor = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);

  const setEditor = useSetAtom(editorAtom);

  const [nodes, setNodes] = useState<Node[]>(workflow.nodes);
  const [edges, setEdges] = useState<Edge[]>(workflow.edges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]): void =>
      setNodes((nodesSnapshot: Node[]): Node[] =>
        applyNodeChanges(changes, nodesSnapshot)
      ),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]): void =>
      setEdges((edgesSnapshot: Edge[]): Edge[] =>
        applyEdgeChanges(changes, edgesSnapshot)
      ),
    []
  );
  const onConnect = useCallback(
    (params: Connection): void =>
      setEdges((edgesSnapshot: Edge[]): Edge[] =>
        addEdge(params, edgesSnapshot)
      ),
    []
  );

  return (
    <div className="size-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        proOptions={{
          hideAttribution: true,
        }}
        nodeTypes={nodeComponents}
        onInit={setEditor}
        snapGrid={[10, 10]}
        snapToGrid
      >
        <Background />
        <ZoomSlider position="top-left" />
        <MiniMap />
        <Panel position="top-right">
          <AddNodeButton />
        </Panel>
      </ReactFlow>
    </div>
  );
};
