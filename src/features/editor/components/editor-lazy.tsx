"use client";

import dynamic from "next/dynamic";
import { EditorLoading } from "./editor";
import type { ComponentType, ReactElement } from "react";

export const LazyEditor: ComponentType<{ workflowId: string }> = dynamic(
  () => import("./editor").then((mod) => ({ default: mod.Editor })),
  {
    loading: (): ReactElement => <EditorLoading />,
    ssr: false,
  }
);
