import { CredentialForm } from "@/features/credentials/components/credential";
import { requireAuth } from "@/lib/auth-utils";
import type { ReactElement } from "react";

const Page = async (): Promise<ReactElement> => {
  await requireAuth();

  return (
    <div className="p-4 pd:px-10 md:py-6 h-full">
      <div className="mx-auto max-w-5xl w-full flex flex-col gap-y-8 h-full">
        <CredentialForm />
      </div>
    </div>
  );
};

export default Page;
