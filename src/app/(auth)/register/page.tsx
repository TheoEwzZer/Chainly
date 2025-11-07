import { RegisterForm } from "@/features/auth/components/register-form";
import { requireUnauth } from "@/lib/auth-utils";
import type { ReactElement } from "react";

export default async function Register(): Promise<ReactElement> {
  await requireUnauth();

  return <RegisterForm />;
}
