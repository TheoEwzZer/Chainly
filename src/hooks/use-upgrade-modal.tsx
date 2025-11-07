import { UpgradeModal } from "@/components/upgrade-modal";
import { TRPCClientError } from "@trpc/client";
import { useState } from "react";
import type { ReactElement } from "react";

export const useUpgradeModal = () => {
  const [open, setOpen] = useState<boolean>(false);

  const handleError = (error: unknown): boolean => {
    if (error instanceof TRPCClientError && error.data?.code === "FORBIDDEN") {
      setOpen(true);
      return true;
    }
    return false;
  };

  const modal: ReactElement = (
    <UpgradeModal open={open} onOpenChange={setOpen} />
  );

  return { handleError, modal };
};
