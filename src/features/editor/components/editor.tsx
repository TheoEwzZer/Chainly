"use client";

import { ErrorView, LoadingView } from "@/components/entity-components";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";
import {
  type ReactElement,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  RefObject,
} from "react";
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
  ReactFlowInstance,
  XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ZoomSlider } from "@/components/react-flow/zoom-slider";
import { nodeComponents } from "@/config/node-component";
import { AddNodeButton } from "./add-node-button";
import { useSetAtom, useAtomValue } from "jotai";
import { editorAtom, editorActionsAtom } from "../store/atoms";
import { NodeType } from "@/generated/prisma/enums";
import { ExecuteWorkflowButton } from "./execute-workflow-button";
import type { EditorActions } from "../store/atoms";

const generateEditorId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
};

export const EditorLoading = (): ReactElement => {
  return <LoadingView message="Loading editor..." />;
};

export const EditorError = (): ReactElement => {
  return <ErrorView message="Error loading editor..." />;
};

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

interface ClipboardState {
  nodes: Node[];
  edges: Edge[];
}

export const Editor = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);

  const setEditor = useSetAtom(editorAtom);
  const setEditorActions = useSetAtom(editorActionsAtom);
  const editor: ReactFlowInstance | null = useAtomValue(editorAtom);

  const [nodes, setNodes] = useState<Node[]>(workflow.nodes);
  const [edges, setEdges] = useState<Edge[]>(workflow.edges);

  const historyRef: RefObject<HistoryState[]> = useRef<HistoryState[]>([]);
  const historyIndexRef: RefObject<number> = useRef<number>(-1);
  const isUndoRedoRef: RefObject<boolean> = useRef<boolean>(false);
  const nodesRef: RefObject<Node[]> = useRef<Node[]>(nodes);
  const edgesRef: RefObject<Edge[]> = useRef<Edge[]>(edges);
  const clipboardRef: RefObject<ClipboardState | null> =
    useRef<ClipboardState | null>(null);
  const pasteOffsetRef: RefObject<number> = useRef<number>(0);
  const pointerPositionRef: RefObject<XYPosition | null> =
    useRef<XYPosition | null>(null);

  useEffect((): void => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent): void => {
      pointerPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    globalThis.addEventListener("mousemove", handleMouseMove);
    return (): void => {
      globalThis.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const saveToHistory: (nodesState: Node[], edgesState: Edge[]) => void =
    useCallback((nodesState: Node[], edgesState: Edge[]): void => {
      if (isUndoRedoRef.current) {
        isUndoRedoRef.current = false;
        return;
      }

      const newState: HistoryState = {
        nodes: structuredClone(nodesState),
        edges: structuredClone(edgesState),
      };

      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(
          0,
          historyIndexRef.current + 1
        );
      }

      historyRef.current.push(newState);
      historyIndexRef.current = historyRef.current.length - 1;

      if (historyRef.current.length > 50) {
        historyRef.current.shift();
        historyIndexRef.current--;
      }
    }, []);

  const lastSavedStateRef: RefObject<string> = useRef<string>("");

  const getStateKeyWithoutSelection: (
    nodesState: Node[],
    edgesState: Edge[]
  ) => string = useCallback(
    (nodesState: Node[], edgesState: Edge[]): string => {
      const nodesWithoutSelection = nodesState.map((node: Node) => {
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          selected: _selected,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          dragging: _dragging,
          ...nodeWithoutSelection
        } = node;
        return nodeWithoutSelection;
      });
      const edgesWithoutSelection = edgesState.map((edge: Edge) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { selected: _selected, ...edgeWithoutSelection } = edge;
        return edgeWithoutSelection;
      });
      return JSON.stringify({
        nodes: nodesWithoutSelection,
        edges: edgesWithoutSelection,
      });
    },
    []
  );

  useEffect((): void => {
    if (historyRef.current.length === 0) {
      historyRef.current = [
        {
          nodes: structuredClone(workflow.nodes),
          edges: structuredClone(workflow.edges),
        },
      ];
      historyIndexRef.current = 0;
      lastSavedStateRef.current = getStateKeyWithoutSelection(
        workflow.nodes,
        workflow.edges
      );
    }
  }, [workflow.nodes, workflow.edges, getStateKeyWithoutSelection]);

  const onNodesChange: (changes: NodeChange[]) => void = useCallback(
    (changes: NodeChange[]): void =>
      setNodes((nodesSnapshot: Node[]): Node[] =>
        applyNodeChanges(changes, nodesSnapshot)
      ),
    []
  );
  const onEdgesChange: (changes: EdgeChange[]) => void = useCallback(
    (changes: EdgeChange[]): void =>
      setEdges((edgesSnapshot: Edge[]): Edge[] =>
        applyEdgeChanges(changes, edgesSnapshot)
      ),
    []
  );
  const onConnect: (params: Connection) => void = useCallback(
    (params: Connection): void =>
      setEdges((edgesSnapshot: Edge[]): Edge[] =>
        addEdge(params, edgesSnapshot)
      ),
    []
  );

  const performDelete: (nodeIds?: string[], edgeIds?: string[]) => void =
    useCallback(
      (nodeIds: string[] = [], edgeIds: string[] = []): void => {
        if (nodeIds.length === 0 && edgeIds.length === 0) {
          return;
        }

        saveToHistory(nodesRef.current, edgesRef.current);

        const nodeIdsSet = new Set(nodeIds);
        const edgeIdsSet = new Set(edgeIds);

        setNodes((nodesSnapshot: Node[]): Node[] => {
          if (nodeIdsSet.size === 0) {
            return nodesSnapshot;
          }
          return nodesSnapshot.filter(
            (node: Node): boolean => !nodeIdsSet.has(node.id)
          );
        });

        setEdges((edgesSnapshot: Edge[]): Edge[] => {
          let nextEdges: Edge[] = edgesSnapshot;

          if (nodeIdsSet.size > 0) {
            nextEdges = nextEdges.filter(
              (edge: Edge): boolean =>
                !nodeIdsSet.has(edge.source) && !nodeIdsSet.has(edge.target)
            );
          }

          if (edgeIdsSet.size > 0) {
            nextEdges = nextEdges.filter(
              (edge: Edge): boolean => !edgeIdsSet.has(edge.id)
            );
          }

          return nextEdges;
        });
      },
      [saveToHistory]
    );

  const deleteNodes: (nodeIds: string[]) => void = useCallback(
    (nodeIds: string[]): void => performDelete(nodeIds, []),
    [performDelete]
  );
  const deleteEdges: (edgeIds: string[]) => void = useCallback(
    (edgeIds: string[]): void => performDelete([], edgeIds),
    [performDelete]
  );
  const deleteNodeById: (nodeId: string) => void = useCallback(
    (nodeId: string): void => performDelete([nodeId], []),
    [performDelete]
  );
  const deleteSelected: () => void = useCallback((): void => {
    const selectedNodeIds: string[] = nodesRef.current
      .filter((node: Node): boolean | undefined => node.selected)
      .map((node: Node): string => node.id);
    const selectedEdgeIds: string[] = edgesRef.current
      .filter((edge: Edge): boolean | undefined => edge.selected)
      .map((edge: Edge): string => edge.id);
    performDelete(selectedNodeIds, selectedEdgeIds);
  }, [performDelete]);

  const copySelected: () => void = useCallback((): void => {
    const selectedNodes: Node[] = nodesRef.current.filter(
      (node: Node): boolean => Boolean(node.selected)
    );

    if (selectedNodes.length === 0) {
      return;
    }

    const selectedNodeIds: Set<string> = new Set(
      selectedNodes.map((node: Node): string => node.id)
    );

    const relatedEdges: Edge[] = edgesRef.current.filter(
      (edge: Edge): boolean =>
        selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    );

    clipboardRef.current = {
      nodes: structuredClone(selectedNodes),
      edges: structuredClone(relatedEdges),
    };
    pasteOffsetRef.current = 0;
  }, []);

  const pasteClipboard: () => void = useCallback((): void => {
    if (!clipboardRef.current || clipboardRef.current.nodes.length === 0) {
      return;
    }

    saveToHistory(nodesRef.current, edgesRef.current);

    pasteOffsetRef.current += 1;
    const fallbackOffset: number = 30 * pasteOffsetRef.current;

    const idMapping: Map<string, string> = new Map();
    const clipboardNodes: Node[] = clipboardRef.current.nodes;

    const pointerPosition: XYPosition | null = pointerPositionRef.current;
    const projectedPointer: XYPosition | null =
      pointerPosition && editor
        ? editor.screenToFlowPosition({
            x: pointerPosition.x,
            y: pointerPosition.y,
          })
        : null;

    const [minX, minY]: [number, number] = clipboardNodes.reduce<
      [number, number]
    >(
      (acc: [number, number], node: Node): [number, number] => [
        Math.min(acc[0], node.position.x),
        Math.min(acc[1], node.position.y),
      ],
      [Infinity, Infinity]
    );

    const baseOffset: XYPosition =
      projectedPointer && Number.isFinite(minX) && Number.isFinite(minY)
        ? {
            x: projectedPointer.x - minX,
            y: projectedPointer.y - minY,
          }
        : {
            x: fallbackOffset,
            y: fallbackOffset,
          };

    const newNodes: Node[] = clipboardNodes.map((node: Node): Node => {
      const newId: string = generateEditorId();
      idMapping.set(node.id, newId);

      const nodeData: Record<string, unknown> = node.data
        ? structuredClone(node.data)
        : node.data;
      const nodePosition: XYPosition = node.position;

      return {
        ...node,
        id: newId,
        position: {
          x: nodePosition.x + baseOffset.x,
          y: nodePosition.y + baseOffset.y,
        },
        data: nodeData,
        selected: true,
        dragging: false,
      };
    });

    const newEdges: Edge[] = clipboardRef.current.edges
      .map((edge: Edge): Edge | null => {
        const sourceId: string | undefined = idMapping.get(edge.source);
        const targetId: string | undefined = idMapping.get(edge.target);

        if (!sourceId || !targetId) {
          return null;
        }

        const edgeData: Record<string, unknown> | undefined = edge.data
          ? structuredClone(edge.data)
          : edge.data;

        return {
          ...edge,
          id: generateEditorId(),
          source: sourceId,
          target: targetId,
          data: edgeData,
          selected: false,
        };
      })
      .filter((edge: Edge | null): edge is Edge => edge !== null);

    setNodes((prevNodes: Node[]): Node[] => {
      const deselectedNodes: Node[] = prevNodes.map((node: Node): Node => {
        if (!node.selected) {
          return node;
        }
        return {
          ...node,
          selected: false,
        };
      });

      return [...deselectedNodes, ...newNodes];
    });

    setEdges((prevEdges: Edge[]): Edge[] => [...prevEdges, ...newEdges]);
  }, [editor, saveToHistory]);

  useEffect((): void => {
    const actions: EditorActions = {
      deleteNodes,
      deleteEdges,
      deleteNodeById,
      deleteSelected,
    };
    setEditorActions(actions);
  }, [
    deleteNodes,
    deleteEdges,
    deleteNodeById,
    deleteSelected,
    setEditorActions,
  ]);
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    const stateKey: string = getStateKeyWithoutSelection(nodes, edges);
    if (stateKey === lastSavedStateRef.current) {
      return;
    }

    const timeoutId: NodeJS.Timeout = setTimeout((): void => {
      saveToHistory(nodes, edges);
      lastSavedStateRef.current = stateKey;
    }, 300);

    return (): void => {
      clearTimeout(timeoutId);
    };
  }, [nodes, edges, saveToHistory, getStateKeyWithoutSelection]);

  const hasManualTrigger: boolean = useMemo((): boolean => {
    return nodes.some(
      (node: Node): boolean => node.type === NodeType.MANUAL_TRIGGER
    );
  }, [nodes]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement;
      const isInputField: boolean =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const selection: Selection | null = globalThis.getSelection();
      const hasTextSelection: boolean =
        selection !== null && selection.toString().trim().length > 0;

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "z" &&
        !event.shiftKey
      ) {
        if (isInputField) {
          return;
        }

        event.preventDefault();
        if (historyIndexRef.current > 0) {
          historyIndexRef.current--;
          const previousState: HistoryState =
            historyRef.current[historyIndexRef.current];
          isUndoRedoRef.current = true;
          const newNodes: Node[] = structuredClone(previousState.nodes);
          const newEdges: Edge[] = structuredClone(previousState.edges);
          setNodes(newNodes);
          setEdges(newEdges);

          lastSavedStateRef.current = JSON.stringify({
            nodes: newNodes,
            edges: newEdges,
          });
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "c") {
        if (isInputField || hasTextSelection) {
          return;
        }

        event.preventDefault();
        copySelected();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        if (isInputField || hasTextSelection) {
          return;
        }

        event.preventDefault();
        pasteClipboard();
        return;
      }

      if (
        ((event.ctrlKey || event.metaKey) && event.key === "y") ||
        ((event.ctrlKey || event.metaKey) &&
          event.key === "z" &&
          event.shiftKey)
      ) {
        if (isInputField) {
          return;
        }

        event.preventDefault();
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current++;
          const nextState: HistoryState =
            historyRef.current[historyIndexRef.current];
          isUndoRedoRef.current = true;
          const newNodes: Node[] = structuredClone(nextState.nodes);
          const newEdges: Edge[] = structuredClone(nextState.edges);
          setNodes(newNodes);
          setEdges(newEdges);

          lastSavedStateRef.current = JSON.stringify({
            nodes: newNodes,
            edges: newEdges,
          });
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (isInputField) {
          return;
        }

        if (!editor) {
          return;
        }

        deleteSelected();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return (): void => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    editor,
    setNodes,
    setEdges,
    saveToHistory,
    deleteSelected,
    copySelected,
    pasteClipboard,
  ]);

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
        {hasManualTrigger && (
          <Panel position="bottom-center">
            <ExecuteWorkflowButton workflowId={workflowId} />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};
