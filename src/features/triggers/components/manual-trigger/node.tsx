"use client";

import { MousePointerIcon } from "lucide-react";
import { memo, ReactElement, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { NodeProps } from "@xyflow/react";
import { ManualTriggerDialog } from "./dialog";

export const ManuelTriggerNode = memo((props: NodeProps): ReactElement => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const nodeStatus = "initial";

  const handleSettings = (): void => {
    setDialogOpen(true);
  };

  return (
    <>
      <BaseTriggerNode
        {...props}
        icon={MousePointerIcon}
        name="When clicking 'Execute workflow'"
        status={nodeStatus}
        onSettings={handleSettings}
        onDoubleClick={handleSettings}
      />
      <ManualTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
});

ManuelTriggerNode.displayName = "ManuelTriggerNode";
