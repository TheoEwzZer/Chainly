"use client";

import { ErrorView, LoadingView } from "@/components/ui/entity-components";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";
import { ReactElement } from "react";

export const EditorLoading = (): ReactElement => {
  return <LoadingView message="Loading editor..." />;
};

export const EditorError = (): ReactElement => {
  return <ErrorView message="Error loading editor..." />;
};

export const Editor = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);
  return <p>{JSON.stringify(workflow, null, 2)}</p>;
};
