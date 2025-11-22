import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useExecuteWorkflow,
  useUpdateWorkflow,
} from "@/features/workflows/hooks/use-workflows";
import { FlaskConicalIcon } from "lucide-react";
import type { ReactElement } from "react";
import { useAtomValue } from "jotai";
import {
  editorAtom,
  editorActionsAtom,
  hasUnsavedChangesAtom,
  EditorActions,
} from "../store/atoms";
import { ReactFlowInstance } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import { createNodesPayload } from "../utils";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const ExecuteWorkflowButton = ({
  workflowId,
}: {
  workflowId: string;
}): ReactElement => {
  const executeWorkflow = useExecuteWorkflow();
  const saveWorkflow = useUpdateWorkflow();
  const editor: ReactFlowInstance | null = useAtomValue(editorAtom);
  const hasUnsavedChanges: boolean = useAtomValue(hasUnsavedChangesAtom);
  const editorActions: EditorActions | null = useAtomValue(editorActionsAtom);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  const performExecute = async (): Promise<void> => {
    if (!editor) {
      return;
    }

    const nodes: Node[] = editor.getNodes();
    const edges: Edge[] = editor.getEdges();

    const nodesPayload = createNodesPayload(nodes);

    try {
      if (hasUnsavedChanges) {
        await saveWorkflow.mutateAsync({
          id: workflowId,
          nodes: nodesPayload,
          edges,
        });
        editorActions?.markAsSaved();
      }

      executeWorkflow.mutate({ id: workflowId });
    } catch (error) {
      console.error("Failed to save before executing:", error);
    }
  };

  const handleExecute = (): void => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      performExecute();
    }
  };

  const handleConfirm = async (): Promise<void> => {
    setShowConfirmDialog(false);
    await performExecute();
  };

  const isSaving: boolean = saveWorkflow.isPending;
  const isExecuting: boolean = executeWorkflow.isPending;
  const isPending: boolean = isSaving || isExecuting;

  return (
    <>
      <Button size="lg" onClick={handleExecute} disabled={isPending}>
        {isPending ? <Spinner /> : <FlaskConicalIcon className="size-4" />}
        {isSaving
          ? "Saving..."
          : isExecuting
          ? "Executing Workflow..."
          : "Execute Workflow"}
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to save them before
              executing the workflow?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Save and Execute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
