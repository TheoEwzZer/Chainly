"use client";

import { useEffect } from "react";
import {
  useSearchParams,
  useRouter,
  ReadonlyURLSearchParams,
} from "next/navigation";
import { toast } from "sonner";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function CredentialsToastHandler(): null {
  const searchParams: ReadonlyURLSearchParams = useSearchParams();
  const router: AppRouterInstance = useRouter();

  useEffect((): void => {
    const error: string | null = searchParams.get("error");
    const success: string | null = searchParams.get("success");

    if (error) {
      toast.error(decodeURIComponent(error));
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("error");
      const newUrl: string = newSearchParams.toString()
        ? `?${newSearchParams.toString()}`
        : "";
      router.replace(`/credentials${newUrl}`, { scroll: false });
    }

    if (success) {
      toast.success(decodeURIComponent(success));
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("success");
      const newUrl: string = newSearchParams.toString()
        ? `?${newSearchParams.toString()}`
        : "";
      router.replace(`/credentials${newUrl}`, { scroll: false });
    }
  }, [searchParams, router]);

  return null;
}
