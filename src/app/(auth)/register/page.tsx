import { RegisterForm } from "@/features/auth/components/register-form";
import { requireUnauth } from "@/lib/auth-utils";
import { ReactElement } from "react";

export default async function Register(): Promise<ReactElement> {
  await requireUnauth();

  return (
    <div>
      <RegisterForm />
    </div>
  );
}
