"use client";

import { memo, ReactElement, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { NodeProps } from "@xyflow/react";
import { GoogleFormTriggerDialog } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { googleFormTriggerChannel } from "@/inngest/channels/google-form-trigger";
import { fetchGoogleFormTriggerRealtimeToken } from "./actions";

export const GoogleFormTriggerNode = memo((props: NodeProps): ReactElement => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: googleFormTriggerChannel().name,
    topic: "status",
    refreshToken: fetchGoogleFormTriggerRealtimeToken,
  });

  const handleSettings = (): void => {
    setDialogOpen(true);
  };

  return (
    <>
      <BaseTriggerNode
        {...props}
        icon="/logos/google-form.svg"
        name="Google Form"
        description="When a form is submitted"
        status={nodeStatus}
        onSettings={handleSettings}
        onDoubleClick={handleSettings}
      />
      <GoogleFormTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} nodeId={props.id} />
    </>
  );
});

GoogleFormTriggerNode.displayName = "GoogleFormTriggerNode";
