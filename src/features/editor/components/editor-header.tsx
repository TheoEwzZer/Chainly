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
import { useAtomValue } from "jotai";
import { editorAtom } from "../store/atoms";
import { ReactFlowInstance } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import { NodeType, ExecutionStatus } from "@/generated/prisma/enums";
import { Spinner } from "@/components/ui/spinner";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const EditorSaveButton = ({ workflowId }: { workflowId: string }) => {
  const editor: ReactFlowInstance | null = useAtomValue(editorAtom);
  const saveWorkflow = useUpdateWorkflow();

  const handleSave = () => {
    if (!editor) {
      return;
    }

    const nodes: Node[] = editor.getNodes();
    const edges: Edge[] = editor.getEdges();

    const isValidNodeType = (value: unknown): value is NodeType =>
      Object.values(NodeType).includes(value as NodeType);

    const nodesPayload = nodes.map((node: Node) => ({
      id: node.id,
      position: node.position,
      data: (node.data ?? {}) as Record<string, any>,
      type: isValidNodeType(node.type) ? node.type : undefined,
    }));

    saveWorkflow.mutate({
      id: workflowId,
      nodes: nodesPayload,
      edges,
    });
  };

  const { isPending } = saveWorkflow;

  return (
    <div className="ml-auto">
      <Button size="sm" onClick={handleSave} disabled={isPending}>
        {isPending ? <Spinner /> : <SaveIcon className="size-4" />}
        {isPending ? "Saving..." : "Save"}
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

  const {
    data: runningExecution,
    isLoading,
    refetch,
  } = useQuery({
    ...trpc.executions.getRunningByWorkflow.queryOptions({ workflowId }),
    // Always poll to detect when executions start/stop
    // Poll every 1 second to balance responsiveness and server load
    refetchInterval: 1000,
    // Don't cache stale data - always refetch
    staleTime: 0,
    gcTime: 0,
  });

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
