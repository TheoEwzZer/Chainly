import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { FlaskConicalIcon } from "lucide-react";
import type { ReactElement } from "react";

export const ExecuteWorkflowButton = ({
  workflowId,
}: {
  workflowId: string;
}): ReactElement => {
  const executeWorkflow = useExecuteWorkflow();

  const handleExecute = (): void => {
    executeWorkflow.mutate({ id: workflowId });
  };

  const { isPending } = executeWorkflow;

  return (
    <Button size="lg" onClick={handleExecute} disabled={isPending}>
      {isPending ? <Spinner /> : <FlaskConicalIcon className="size-4" />}
      {isPending ? "Executing Workflow..." : "Execute Workflow"}
    </Button>
  );
};
