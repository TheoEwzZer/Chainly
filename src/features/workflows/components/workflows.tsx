"use client";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import {
  useCreateWorkflow,
  useRemoveWorkflow,
  useSuspenseWorkflows,
} from "../hooks/use-workflows";
import type { ReactElement, ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useWorkflowsParams } from "../hooks/use-workflows-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import type { Workflow } from "@/generated/prisma/client";
import { WorkflowIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const WorkflowsSearch = (): ReactElement => {
  const [params, setParamsAsync] = useWorkflowsParams();
  const setParams = (newParams: typeof params): void => {
    void setParamsAsync(newParams);
  };
  const { searchValue, setSearchValue } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      value={searchValue}
      onChange={setSearchValue}
      placeholder="Search workflows"
    />
  );
};

export const WorkflowsList = (): ReactElement => {
  const workflows = useSuspenseWorkflows();

  return (
    <EntityList
      items={workflows.data.items}
      getKey={(workflow: Workflow): string => workflow.id}
      renderItem={(workflow: Workflow): ReactElement => (
        <WorkflowsItem data={workflow} />
      )}
      emptyView={<WorkflowsEmpty />}
    />
  );
};

export const WorkflowsHeader = ({ disabled }: { disabled: boolean }) => {
  const createWorkflow = useCreateWorkflow();
  const router: AppRouterInstance = useRouter();

  const handleCreate = (): void => {
    createWorkflow.mutate(undefined, {
      onSuccess: (data: Workflow): void => {
        router.push(`/workflows/${data.id}`);
      },
      onError: (error) => {
        toast.error(`Failed to create workflow: ${error.message}`);
      },
    });
  };

  return (
    <EntityHeader
      title="Workflows"
      description="Create and manage your workflows"
      onNew={handleCreate}
      newButtonLabel="New Workflow"
      disabled={disabled}
      isCreating={createWorkflow.isPending}
    />
  );
};

export const WorkflowsPagination = (): ReactElement => {
  const workflows = useSuspenseWorkflows();
  const [params, setParams] = useWorkflowsParams();

  return (
    <EntityPagination
      disabled={workflows.isPending || workflows.isFetching}
      page={params.page}
      totalPages={workflows.data?.totalPages || 0}
      onPageChange={(page: number): void => {
        setParams({ ...params, page });
      }}
    />
  );
};

export const WorkflowsContainer = ({ children }: { children: ReactNode }) => {
  return (
    <EntityContainer
      header={<WorkflowsHeader disabled={false} />}
      search={<WorkflowsSearch />}
      pagination={<WorkflowsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const WorkflowsLoading = (): ReactElement => {
  return <LoadingView message="Loading workflows..." />;
};

export const WorkflowsError = (): ReactElement => {
  return <ErrorView message="Error loading workflows..." />;
};

export const WorkflowsEmpty = (): ReactElement => {
  const createWorkflow = useCreateWorkflow();
  const router: AppRouterInstance = useRouter();

  const handleCreate = (): void => {
    createWorkflow.mutate(undefined, {
      onError: (error) => {
        toast.error(`Failed to create workflow: ${error.message}`);
      },
      onSuccess: (data: Workflow): void => {
        router.push(`/workflows/${data.id}`);
      },
    });
  };

  return <EmptyView message="No workflows found" onNew={handleCreate} />;
};

export const WorkflowsItem = ({ data }: { data: Workflow }) => {
  const removeWorkflow = useRemoveWorkflow();

  const handleRemove = (): void => {
    removeWorkflow.mutate({ id: data.id });
  };

  return (
    <EntityItem
      href={`/workflows/${data.id}`}
      title={data.name}
      subtitle={
        <>
          Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}{" "}
          &bull; Created{" "}
          {formatDistanceToNow(data.createdAt, { addSuffix: true })}
        </>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          <WorkflowIcon className="size-5" />
        </div>
      }
      onRemove={handleRemove}
      isRemoving={removeWorkflow.isPending}
    />
  );
};
