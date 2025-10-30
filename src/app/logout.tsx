"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";

export const LogoutButton = () => {
  const router: AppRouterInstance = useRouter();

  return (
    <Button
      onClick={() =>
        authClient.signOut({
          fetchOptions: {
            onSuccess: (): void => {
              router.push("/login");
            },
          },
        })
      }
    >
      Logout
    </Button>
  );
};
