"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ExecutionStatus } from "@/generated/prisma/enums";
import type { AppRouter } from "@/trpc/routers/_app";
import type { inferRouterOutputs } from "@trpc/server";
import { formatDistanceToNow } from "date-fns";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";

type ExecutionWithTimeline =
  inferRouterOutputs<AppRouter>["executions"]["getOne"];
type TimelineStep = ExecutionWithTimeline["steps"][number];

const STATUS_BADGE_STYLES: Record<ExecutionStatus, string> = {
  RUNNING: "bg-blue-50 text-blue-700 border border-blue-200",
  SUCCESS: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border border-red-200",
};

const STATUS_DOT_STYLES: Record<ExecutionStatus, string> = {
  RUNNING: "bg-blue-500",
  SUCCESS: "bg-emerald-500",
  FAILED: "bg-red-500",
};

const humanize = (value: string): string => {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (segment: string): string =>
        segment.charAt(0).toUpperCase() + segment.slice(1)
    )
    .join(" ");
};

const formatStatus = (status: ExecutionStatus): string => humanize(status);

const formatNodeType = (nodeType: TimelineStep["nodeType"]): string => {
  return humanize(nodeType);
};

interface ExecutionTimelineProps {
  steps: TimelineStep[];
}

export const ExecutionTimeline = ({
  steps,
}: ExecutionTimelineProps): ReactElement => {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Node timeline</CardTitle>
        <CardDescription>
          Detailed, ordered history of each node executed in this workflow run.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Timeline data is not available for this execution yet.
          </p>
        ) : (
          <div className="space-y-4">
            {steps.map(
              (step: TimelineStep): ReactElement => (
                <ExecutionTimelineItem key={step.id} step={step} />
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ExecutionTimelineItem = ({
  step,
}: {
  step: TimelineStep;
}): ReactElement => {
  const durationSeconds: number | null = useMemo((): number | null => {
    if (!step.completedAt) {
      return null;
    }

    const diffMs: number =
      step.completedAt.getTime() - step.startedAt.getTime();
    return diffMs > 0 ? Math.round(diffMs / 1000) : 0;
  }, [step.completedAt, step.startedAt]);

  return (
    <div className="relative rounded-lg border bg-card p-4 transition-colors hover:bg-accent/5">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "mt-1 flex size-10 shrink-0 items-center justify-center rounded-full",
            step.status === ExecutionStatus.SUCCESS && "bg-emerald-100",
            step.status === ExecutionStatus.FAILED && "bg-red-100",
            step.status === ExecutionStatus.RUNNING && "bg-blue-100"
          )}
        >
          <span
            className={cn(
              "inline-flex size-3 rounded-full",
              STATUS_DOT_STYLES[step.status]
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-semibold">
                {formatNodeType(step.nodeType)}
              </p>
            </div>
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-md",
                STATUS_BADGE_STYLES[step.status]
              )}
            >
              {formatStatus(step.status)}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Started {formatDistanceToNow(step.startedAt, { addSuffix: true })}
            </span>
            {step.completedAt ? (
              <>
                <span>•</span>
                <span>
                  Finished{" "}
                  {formatDistanceToNow(step.completedAt, { addSuffix: true })}
                </span>
              </>
            ) : (
              <>
                <span>•</span>
                <span>Still running</span>
              </>
            )}
            {durationSeconds !== null && (
              <>
                <span>•</span>
                <span>Duration: {durationSeconds}s</span>
              </>
            )}
          </div>
          {step.error && (
            <p className="mt-3 text-sm font-medium text-red-600">
              {step.error}
            </p>
          )}
          <ExecutionTimelineDetails
            input={step.input}
            output={step.output}
            errorStack={step.errorStack}
          />
        </div>
      </div>
    </div>
  );
};

const ExecutionTimelineDetails = ({
  input,
  output,
  errorStack,
}: {
  input: TimelineStep["input"];
  output: TimelineStep["output"];
  errorStack: TimelineStep["errorStack"];
}): ReactElement | null => {
  const hasDetails: boolean =
    (input !== null && input !== undefined) ||
    (output !== null && output !== undefined) ||
    Boolean(errorStack);

  const [open, setOpen] = useState<boolean>(false);

  if (!hasDetails) {
    return null;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto text-xs font-medium text-primary"
        >
          {open ? "Hide details" : "View details"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3">
        {input !== null && input !== undefined && (
          <TimelineJsonBlock label="Input context" data={input} />
        )}
        {output !== null && output !== undefined && (
          <TimelineJsonBlock label="Output context" data={output} />
        )}
        {errorStack && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Error stack
            </p>
            <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted/70 p-3 text-[11px] font-mono leading-relaxed text-red-700">
              {errorStack}
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

const TimelineJsonBlock = ({
  label,
  data,
}: {
  label: string;
  data: unknown;
}): ReactElement => {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted/70 p-3 text-[11px] font-mono leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};
