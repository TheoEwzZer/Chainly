"use client";

import { ExecutionStatus } from "@/generated/prisma/enums";
import {
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  ClockIcon,
} from "lucide-react";
import { ReactElement, useState } from "react";
import { useSuspenseExecution } from "../hooks/use-executions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ExecutionTimeline } from "./execution-timeline";

const getStatusIcon = (status: ExecutionStatus): ReactElement => {
  switch (status) {
    case ExecutionStatus.SUCCESS:
      return <CheckCircle2Icon className="size-5 text-green-600" />;
    case ExecutionStatus.FAILED:
      return <XCircleIcon className="size-5 text-red-600" />;
    case ExecutionStatus.RUNNING:
      return <Loader2Icon className="size-5 text-blue-600 animate-spin" />;
    default:
      return <ClockIcon className="size-5 text-muted-foreground" />;
  }
};

const formatStatus = (status: ExecutionStatus): string => {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

export const ExecutionView = ({
  executionId,
}: {
  executionId: string;
}): ReactElement => {
  const { data: execution } = useSuspenseExecution(executionId);
  const [showStackTrace, setShowStackTrace] = useState<boolean>(false);

  const duration: number | null = execution.completedAt
    ? Math.round(
        (execution.completedAt.getTime() - execution.startedAt.getTime()) / 1000
      )
    : null;

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            {getStatusIcon(execution.status)}
            <div>
              <CardTitle>{formatStatus(execution.status)}</CardTitle>
              <CardDescription>
                Execution for workflow {execution.workflow.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Workflow
              </p>
              <Link
                href={`/workflows/${execution.workflow.id}`}
                prefetch
                className="text-sm text-primary hover:underline"
              >
                {execution.workflow.name}
              </Link>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Status
              </p>
              <p className="text-sm">{formatStatus(execution.status)}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Started
              </p>
              <p className="text-sm">
                {formatDistanceToNow(execution.startedAt, { addSuffix: true })}
              </p>
            </div>

            {execution.completedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Completed
                </p>
                <p className="text-sm">
                  {formatDistanceToNow(execution.completedAt, {
                    addSuffix: true,
                  })}
                </p>
              </div>
            )}

            {duration !== null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Duration
                </p>
                <p className="text-sm">{duration}s</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Event ID
              </p>
              <p className="text-sm">{execution.inngestEventId}</p>
            </div>
          </div>
          {execution.error && (
            <div className="mt-6 rounded-md bg-red-50 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-800 font-mono">
                  {execution.error}
                </p>
              </div>

              {execution.errorStack && (
                <Collapsible
                  open={showStackTrace}
                  onOpenChange={setShowStackTrace}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-900 hover:bg-red-100"
                    >
                      {showStackTrace ? "Hide Stack Trace" : "Show Stack Trace"}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="mt-2 max-h-80 overflow-auto rounded bg-red-100 p-2 text-xs font-mono text-red-800">
                      {execution.errorStack}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {execution.output && (
            <div className="mt-6 rounded-md bg-muted p-4">
              <div>
                <p className="text-sm font-medium mb-2">Output</p>
                <pre className="mt-1 max-h-96 overflow-auto rounded-md bg-muted/70 p-3 text-xs font-mono leading-relaxed">
                  {JSON.stringify(execution.output, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <ExecutionTimeline steps={execution.steps} />
    </div>
  );
};
