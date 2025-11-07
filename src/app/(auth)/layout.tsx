import { AuthLayout } from "@/features/auth/components/auth-layout";
import type { ReactElement } from "react";

const Layout = ({ children }: { children: ReactElement }) => {
  return <AuthLayout>{children}</AuthLayout>;
};

export default Layout;
