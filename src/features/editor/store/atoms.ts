import { ReactFlowInstance } from "@xyflow/react";
import { atom } from "jotai";

export const editorAtom = atom<ReactFlowInstance | null>(null);

export interface EditorActions {
  deleteNodes: (nodeIds: string[]) => void;
  deleteEdges: (edgeIds: string[]) => void;
  deleteNodeById: (nodeId: string) => void;
  deleteSelected: () => void;
}

export const editorActionsAtom = atom<EditorActions | null>(null);
