"use client";

import { MousePointerIcon } from "lucide-react";
import { memo, ReactElement } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { NodeProps } from "@xyflow/react";

export const ManuelTriggerNode = memo((props: NodeProps): ReactElement => {
  return (
    <BaseTriggerNode
      {...props}
      icon={MousePointerIcon}
      name="When clicking 'Execute workflow'"
      // status={nodeStatus} TODO
      // onSettings={HandleOpenSettings}
      // onDoubleClick={HandleOpenSettings}
    />
  );
});

ManuelTriggerNode.displayName = "ManuelTriggerNode";
