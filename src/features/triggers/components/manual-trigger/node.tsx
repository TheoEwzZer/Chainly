"use client";

import { MousePointerIcon } from "lucide-react";
import { memo, ReactElement, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { NodeProps } from "@xyflow/react";
import { ManualTriggerDialog } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { manualTriggerChannel } from "@/inngest/channels/manual-trigger";
import { fetchManualTriggerRealtimeToken } from "./actions";

export const ManualTriggerNode = memo((props: NodeProps): ReactElement => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: manualTriggerChannel().name,
    topic: "status",
    refreshToken: fetchManualTriggerRealtimeToken,
  });

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

ManualTriggerNode.displayName = "ManualTriggerNode";
