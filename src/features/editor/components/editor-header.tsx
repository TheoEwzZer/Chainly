"use client";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SaveIcon, StopCircleIcon } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import {
  useSuspenseWorkflow,
  useUpdateWorkflow,
  useUpdateWorkflowName,
} from "@/features/workflows/hooks/use-workflows";
import { type ChangeEvent, useEffect, useRef, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useAtomValue, useAtom } from "jotai";
import {
  editorAtom,
  hasUnsavedChangesAtom,
  editorActionsAtom,
  hasActiveExecutionAtom,
  EditorActions,
} from "../store/atoms";
import { ReactFlowInstance } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import { ExecutionStatus } from "@/generated/prisma/enums";
import { Spinner } from "@/components/ui/spinner";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createNodesPayload } from "../utils";

export const EditorSaveButton = ({ workflowId }: { workflowId: string }) => {
  const editor: ReactFlowInstance | null = useAtomValue(editorAtom);
  const hasUnsavedChanges: boolean = useAtomValue(hasUnsavedChangesAtom);
  const editorActions: EditorActions | null = useAtomValue(editorActionsAtom);
  const saveWorkflow = useUpdateWorkflow();

  const handleSave = () => {
    if (!editor) {
      return;
    }

    const nodes: Node[] = editor.getNodes();
    const edges: Edge[] = editor.getEdges();

    const nodesPayload = createNodesPayload(nodes);

    saveWorkflow.mutate(
      {
        id: workflowId,
        nodes: nodesPayload,
        edges,
      },
      {
        onSuccess: (): void => {
          editorActions?.markAsSaved();
        },
      }
    );
  };

  const { isPending } = saveWorkflow;

  return (
    <div className="ml-auto">
      <Button size="sm" onClick={handleSave} disabled={isPending}>
        {isPending ? <Spinner /> : <SaveIcon className="size-4" />}
        {isPending ? "Saving..." : "Save"}
        {hasUnsavedChanges && !isPending && (
          <span className="ml-1.5 size-1.5 rounded-full bg-white" />
        )}
      </Button>
    </div>
  );
};

export const EditorNameInput = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);
  const updateWorkflowName = useUpdateWorkflowName();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(workflow.name);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect((): void => {
    if (workflow.name) {
      setName(workflow.name);
    }
  }, [workflow.name]);

  useEffect((): void => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async (): Promise<void> => {
    if (name === workflow.name) {
      setIsEditing(false);
      return;
    }

    try {
      await updateWorkflowName.mutateAsync({ id: workflowId, name });
    } catch {
      setName(workflow.name);
    } finally {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSave();
    } else if (event.key === "Escape") {
      setName(workflow.name);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        disabled={updateWorkflowName.isPending}
        type="text"
        value={name}
        onChange={(e: ChangeEvent<HTMLInputElement>): void =>
          setName(e.target.value)
        }
        onKeyDown={handleKeyDown}
        ref={inputRef}
        onBlur={handleSave}
        className="h-7 w-auto min-w-[100px] px-2"
      />
    );
  }

  return (
    <BreadcrumbItem
      onClick={(): void => setIsEditing(true)}
      className="cursor-pointer hover:text-foreground transition-colors"
    >
      {workflow?.name}
    </BreadcrumbItem>
  );
};

export const EditorBreadcrumb = ({ workflowId }: { workflowId: string }) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/workflows" prefetch>
              Workflows
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <EditorNameInput workflowId={workflowId} />
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export const EditorStopExecutionButton = ({
  workflowId,
}: {
  workflowId: string;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [hasActiveExecution, setHasActiveExecution] = useAtom(
    hasActiveExecutionAtom
  );
  const wasRunningRef = useRef<boolean>(false);

  const {
    data: runningExecution,
    isLoading,
    refetch,
  } = useQuery({
    ...trpc.executions.getRunningByWorkflow.queryOptions({ workflowId }),
    // Poll frequently only when there's an active execution, otherwise don't poll
    refetchInterval: hasActiveExecution ? 3000 : false,
    staleTime: 1000,
    gcTime: 5000,
  });

  useEffect(() => {
    if (!hasActiveExecution) {
      return;
    }

    refetch();
    const timeouts: NodeJS.Timeout[] = [
      setTimeout(() => refetch(), 500),
      setTimeout(() => refetch(), 1000),
      setTimeout(() => refetch(), 2000),
    ];

    return () => {
      for (const timeout of timeouts) {
        clearTimeout(timeout);
      }
    };
  }, [hasActiveExecution, refetch]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const isRunning: boolean =
      runningExecution !== null &&
      runningExecution !== undefined &&
      runningExecution.status === ExecutionStatus.RUNNING;

    if (isRunning) {
      wasRunningRef.current = true;
      setHasActiveExecution(true);
    } else if (wasRunningRef.current) {
      wasRunningRef.current = false;
      setHasActiveExecution(false);
    }
  }, [runningExecution, isLoading, setHasActiveExecution]);

  const cancelMutation = useMutation(
    trpc.executions.cancel.mutationOptions({
      onSuccess: async () => {
        toast.success("Execution cancelled");
        setIsCancelling(true);
        await queryClient.invalidateQueries(
          trpc.executions.getRunningByWorkflow.queryOptions({ workflowId })
        );
        await refetch();
        setTimeout(() => {
          setIsCancelling(false);
        }, 100);
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to cancel execution");
        setIsCancelling(false);
      },
    })
  );

  const shouldShowButton: boolean = useMemo((): boolean => {
    if (isCancelling) {
      return false;
    }
    return (
      !isLoading &&
      runningExecution !== null &&
      runningExecution !== undefined &&
      runningExecution.status === ExecutionStatus.RUNNING
    );
  }, [isLoading, runningExecution, isCancelling]);

  if (!shouldShowButton) {
    return null;
  }

  if (!runningExecution) {
    return null;
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={(): void => cancelMutation.mutate({ id: runningExecution.id })}
      disabled={cancelMutation.isPending}
    >
      {cancelMutation.isPending ? (
        <Spinner />
      ) : (
        <StopCircleIcon className="size-4 mr-2" />
      )}
      {cancelMutation.isPending ? "Stopping..." : "Stop Execution"}
    </Button>
  );
};

export const EditorHeader = ({ workflowId }: { workflowId: string }) => {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background">
      <SidebarTrigger />
      <div className="flex flex-row items-center justify-between gap-x-4 w-full">
        <EditorBreadcrumb workflowId={workflowId} />
        <div className="flex items-center gap-2">
          <EditorStopExecutionButton workflowId={workflowId} />
          <EditorSaveButton workflowId={workflowId} />
        </div>
      </div>
    </header>
  );
};
