"use client";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import { useSuspenseExecutions } from "../hooks/use-executions";
import type { ReactElement, ReactNode } from "react";
import { useExecutionsParams } from "../hooks/use-executions-params";
import { formatDistanceToNow } from "date-fns";
import type { Execution } from "@/generated/prisma/client";
import { ExecutionStatus } from "@/generated/prisma/enums";
import {
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";

type ExecutionWithWorkflow = Execution & {
  workflow: {
    id: string;
    name: string;
  };
};

export const ExecutionsList = (): ReactElement => {
  const executions = useSuspenseExecutions();

  return (
    <EntityList
      items={executions.data.items}
      getKey={(execution: ExecutionWithWorkflow): string => execution.id}
      renderItem={(execution: ExecutionWithWorkflow): ReactElement => (
        <ExecutionsItem data={execution} />
      )}
      emptyView={<ExecutionsEmpty />}
    />
  );
};

export const ExecutionsHeader = () => {
  return (
    <EntityHeader
      title="Executions"
      description="View and monitor your workflow executions"
    />
  );
};

export const ExecutionsPagination = (): ReactElement => {
  const executions = useSuspenseExecutions();
  const [params, setParams] = useExecutionsParams();

  return (
    <EntityPagination
      disabled={executions.isPending || executions.isFetching}
      page={params.page}
      totalPages={executions.data?.totalPages || 0}
      onPageChange={(page: number): void => {
        setParams({ ...params, page });
      }}
    />
  );
};

export const ExecutionsContainer = ({ children }: { children: ReactNode }) => {
  return (
    <EntityContainer
      header={<ExecutionsHeader />}
      pagination={<ExecutionsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const ExecutionsLoading = (): ReactElement => {
  return <LoadingView message="Loading executions..." />;
};

export const ExecutionsError = (): ReactElement => {
  return <ErrorView message="Error loading executions..." />;
};

export const ExecutionsEmpty = (): ReactElement => {
  return (
    <EmptyView message="No executions found. Get started by running your first workflow." />
  );
};

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

export const ExecutionsItem = ({ data }: { data: ExecutionWithWorkflow }) => {
  const duration: number | null = data.completedAt
    ? Math.round((data.completedAt.getTime() - data.startedAt.getTime()) / 1000)
    : null;

  const subtitle: ReactElement = (
    <>
      {data.workflow?.name ?? "Unknown Workflow"} &bull; Started{" "}
      {formatDistanceToNow(data.startedAt, { addSuffix: true })}
      {duration !== null && <> &bull; Took {duration}s</>}
    </>
  );

  return (
    <EntityItem
      href={`/executions/${data.id}`}
      title={formatStatus(data.status)}
      subtitle={subtitle}
      image={
        <div className="size-8 flex items-center justify-center">
          {getStatusIcon(data.status)}
        </div>
      }
    />
  );
};
