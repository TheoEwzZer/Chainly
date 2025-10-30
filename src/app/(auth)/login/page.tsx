import { LoginForm } from "@/features/auth/components/login-form";
import { requireUnauth } from "@/lib/auth-utils";
import { ReactElement } from "react";

export default async function Login(): Promise<ReactElement> {
  await requireUnauth();

  return (
    <div>
      <LoginForm />
    </div>
  );
}
