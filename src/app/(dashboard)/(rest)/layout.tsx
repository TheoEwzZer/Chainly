import { AppHeader } from "@/components/app-header";
import type { ReactElement } from "react";

const Layout = ({ children }: { children: ReactElement }) => {
  return (
    <>
      <AppHeader />
      <main className="flex-1">{children}</main>
    </>
  );
};

export default Layout;
