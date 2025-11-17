import {
  ApprovalsList,
  ApprovalsContainer,
  ApprovalsError,
  ApprovalsLoading,
} from "@/features/approvals/components/approvals";
import { prefetchApprovals } from "@/features/approvals/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { ReactElement, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

export default async function ApprovalsPage(): Promise<ReactElement> {
  await requireAuth();

  prefetchApprovals();

  return (
    <ApprovalsContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<ApprovalsError />}>
          <Suspense fallback={<ApprovalsLoading />}>
            <ApprovalsList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </ApprovalsContainer>
  );
}
