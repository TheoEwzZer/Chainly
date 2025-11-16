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
  useRemoveCredential,
  useSuspenseCredentials,
} from "../hooks/use-credentials";
import type { ReactElement, ReactNode } from "react";
import { useCredentialsParams } from "../hooks/use-credentials-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import { formatDistanceToNow } from "date-fns";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Credential } from "@/generated/prisma/client";

export const CredentialsSearch = (): ReactElement => {
  const [params, setParamsAsync] = useCredentialsParams();
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
      placeholder="Search credentials"
    />
  );
};

export const CredentialsList = (): ReactElement => {
  const credentials = useSuspenseCredentials();

  return (
    <EntityList
      items={credentials.data.items as Credential[]}
      getKey={(credential: Credential): string => credential.id}
      renderItem={(credential: Credential): ReactElement => (
        <CredentialsItem data={credential} />
      )}
      emptyView={<CredentialsEmpty />}
    />
  );
};

export const CredentialsHeader = ({ disabled }: { disabled: boolean }) => {
  return (
    <EntityHeader
      title="Credentials"
      description="Create and manage your API credentials"
      newButtonHref="/credentials/new"
      newButtonLabel="New Credential"
      disabled={disabled}
    />
  );
};

export const CredentialsPagination = (): ReactElement => {
  const credentials = useSuspenseCredentials();
  const [params, setParams] = useCredentialsParams();

  return (
    <EntityPagination
      disabled={credentials.isPending || credentials.isFetching}
      page={params.page}
      totalPages={credentials.data?.totalPages || 0}
      onPageChange={(page: number): void => {
        setParams({ ...params, page });
      }}
    />
  );
};

export const CredentialsContainer = ({ children }: { children: ReactNode }) => {
  return (
    <EntityContainer
      header={<CredentialsHeader disabled={false} />}
      search={<CredentialsSearch />}
      pagination={<CredentialsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const CredentialsLoading = (): ReactElement => {
  return <LoadingView message="Loading credentials..." />;
};

export const CredentialsError = (): ReactElement => {
  return <ErrorView message="Error loading credentials..." />;
};

export const CredentialsEmpty = (): ReactElement => {
  const router: AppRouterInstance = useRouter();

  const handleCreate = (): void => {
    router.push("/credentials/new");
  };

  return <EmptyView message="No credentials found" onNew={handleCreate} />;
};

export enum CredentialType {
  OPENAI = "OPENAI",
  ANTHROPIC = "ANTHROPIC",
  GEMINI = "GEMINI",
  DISCORD = "DISCORD",
  GOOGLE_CALENDAR = "GOOGLE_CALENDAR",
}

const credentialLogos: Record<CredentialType, string> = {
  [CredentialType.OPENAI]: "/logos/openai.svg",
  [CredentialType.ANTHROPIC]: "/logos/anthropic.svg",
  [CredentialType.GEMINI]: "/logos/gemini.svg",
  [CredentialType.DISCORD]: "/logos/discord.svg",
  [CredentialType.GOOGLE_CALENDAR]: "/logos/google-calendar.svg",
};

export const CredentialsItem = ({ data }: { data: Credential }) => {
  const removeCredential = useRemoveCredential();

  const handleRemove = (): void => {
    removeCredential.mutate({ id: data.id });
  };

  const logo: string =
    credentialLogos[data.type as CredentialType] || "/logos/openai.svg";

  return (
    <EntityItem
      href={`/credentials/${data.id}`}
      title={data.name}
      subtitle={
        <>
          {formatDistanceToNow(data.updatedAt, { addSuffix: true })} &bull;
          Created {formatDistanceToNow(data.createdAt, { addSuffix: true })}
        </>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          <Image src={logo} alt={data.type} width={32} height={32} />
        </div>
      }
      onRemove={handleRemove}
      isRemoving={removeCredential.isPending}
    />
  );
};
