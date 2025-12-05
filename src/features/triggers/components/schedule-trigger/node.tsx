"use client";

import { ClockIcon } from "lucide-react";
import { memo, ReactElement, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { NodeProps, useReactFlow, type Node } from "@xyflow/react";
import { ScheduleTriggerDialog, ScheduleTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger";
import { fetchScheduleTriggerRealtimeToken } from "./actions";
import { cronToHumanReadable } from "./utils";

export const ScheduleTriggerNode = memo((props: NodeProps): ReactElement => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: scheduleTriggerChannel().name,
    topic: "status",
    refreshToken: fetchScheduleTriggerRealtimeToken,
  });

  const handleSettings = (): void => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: ScheduleTriggerFormValues): void => {
    setNodes((nodes: Node[]): Node[] =>
      nodes.map((node: Node): Node => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          };
        }
        return node;
      })
    );
  };

  const nodeData = props.data as ScheduleTriggerFormValues;

  const formatTimezone = (tz: string): string => {
    if (!tz) {
      return "";
    }
    if (tz === "UTC") {
      return "UTC";
    }
    return tz.split("/").at(-1)?.replaceAll("_", " ") ?? "";
  };

  let description: string = "Not configured";
  if (nodeData?.scheduleMode) {
    const tzSuffix: string = nodeData.timezone
      ? ` (${formatTimezone(nodeData.timezone)})`
      : "";

    if (nodeData.scheduleMode === "cron" && nodeData.cronExpression) {
      description = cronToHumanReadable(nodeData.cronExpression) + tzSuffix;
    } else if (nodeData.scheduleMode === "datetime" && nodeData.datetime) {
      const [datePart, timePart] = nodeData.datetime.split("T");
      const [year, month, day] = datePart.split("-");
      const formattedDate = `${day}/${month}/${year} ${timePart}`;
      description = `At: ${formattedDate}${tzSuffix}`;
    } else if (
      nodeData.scheduleMode === "interval" &&
      nodeData.intervalValue &&
      nodeData.intervalUnit
    ) {
      description = `Every ${nodeData.intervalValue} ${nodeData.intervalUnit}`;
    }
  }

  return (
    <>
      <BaseTriggerNode
        {...props}
        icon={ClockIcon}
        name="Schedule Trigger"
        status={nodeStatus}
        description={description}
        onSettings={handleSettings}
        onDoubleClick={handleSettings}
      />
      <ScheduleTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
    </>
  );
});

ScheduleTriggerNode.displayName = "ScheduleTriggerNode";
