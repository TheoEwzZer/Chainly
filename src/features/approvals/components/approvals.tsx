"use client";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityList,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import {
  useApproveApproval,
  useRejectApproval,
  useSuspenseApprovals,
} from "../hooks/use-approvals";
import type { ReactElement, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, XIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

type ApprovalWithRelations = {
  id: string;
  message: string | null;
  context: Record<string, unknown> | null;
  executionId: string;
  execution: {
    workflow: {
      id: string;
      name: string;
    };
  };
};

export const ApprovalsList = (): ReactElement => {
  const approvals = useSuspenseApprovals();

  return (
    <EntityList
      items={approvals.data as ApprovalWithRelations[]}
      getKey={(approval: ApprovalWithRelations): string => approval.id}
      renderItem={(approval: ApprovalWithRelations): ReactElement => (
        <ApprovalsItem data={approval} />
      )}
      emptyView={<ApprovalsEmpty />}
    />
  );
};

export const ApprovalsHeader = () => {
  return (
    <EntityHeader
      title="Pending Approvals"
      description="Review and approve pending workflow approvals"
    />
  );
};

export const ApprovalsPagination = (): ReactElement => {
  return <div />;
};

export const ApprovalsContainer = ({ children }: { children: ReactNode }) => {
  return (
    <EntityContainer
      header={<ApprovalsHeader />}
      pagination={<ApprovalsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const ApprovalsLoading = (): ReactElement => {
  return <LoadingView message="Loading approvals..." />;
};

export const ApprovalsError = (): ReactElement => {
  return <ErrorView message="Error loading approvals..." />;
};

export const ApprovalsEmpty = (): ReactElement => {
  return (
    <EmptyView message="No pending approvals. All workflows are running smoothly!" />
  );
};

export const ApprovalsItem = ({
  data,
}: {
  data: ApprovalWithRelations;
}): ReactElement => {
  const approveApproval = useApproveApproval();
  const rejectApproval = useRejectApproval();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (): void => {
    approveApproval.mutate({ id: data.id });
  };

  const handleRejectClick = (): void => {
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = (): void => {
    rejectApproval.mutate({
      id: data.id,
      reason: rejectReason.trim() || undefined,
    });
    setRejectDialogOpen(false);
    setRejectReason("");
  };

  const handleRejectCancel = (): void => {
    setRejectDialogOpen(false);
    setRejectReason("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              Approval Required - {data.execution.workflow.name}
            </CardTitle>
            <CardDescription>
              Execution ID: {data.executionId.slice(0, 8)}...
            </CardDescription>
          </div>
          <Badge variant="outline">Pending</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Message:</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {data.message || "No message provided"}
            </p>
          </div>

          {data.context &&
            Object.keys(data.context as Record<string, unknown>).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Context:</p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(data.context, null, 2)}
                </pre>
              </div>
            )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleApprove}
              disabled={approveApproval.isPending || rejectApproval.isPending}
              className="flex-1"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectClick}
              disabled={approveApproval.isPending || rejectApproval.isPending}
              className="flex-1"
            >
              <XIcon className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Approval</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this approval? You can optionally
              provide a reason for the rejection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label
              htmlFor="reject-reason"
              className="text-sm font-medium mb-2 block"
            >
              Reason (optional)
            </label>
            <Textarea
              id="reject-reason"
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRejectCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
