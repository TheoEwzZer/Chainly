"use client";

import { NodeType } from "@/generated/prisma/enums";
import { GlobeIcon, MousePointerIcon } from "lucide-react";
import { useCallback, type ComponentType, type ReactElement } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import Image from "next/image";
import { Separator } from "./ui/separator";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { toast } from "sonner";
import { createId } from "@paralleldrive/cuid2";
import type { Node } from "@xyflow/react";

export type NodeTypeOption = {
  type: NodeType;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }> | string;
};

const triggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.MANUAL_TRIGGER,
    label: "Trigger Manually",
    description:
      "Runs the flow on clicking a button. Good for getting started quickly.",
    icon: MousePointerIcon,
  },
];

const executionNodes: NodeTypeOption[] = [
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Makes an HTTP request to a URL. Good for making API calls.",
    icon: GlobeIcon,
  },
];

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactElement;
}

export function NodeSelector({
  open,
  onOpenChange,
  children,
}: Readonly<NodeSelectorProps>): ReactElement {
  const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();

  const handleNodeSelect = useCallback(
    (selection: NodeTypeOption): void => {
      if (selection.type === NodeType.MANUAL_TRIGGER) {
        const nodes: Node[] = getNodes();
        const hasManualTrigger: boolean = nodes.some(
          (node: Node): boolean => node.type === NodeType.MANUAL_TRIGGER
        );
        if (hasManualTrigger) {
          toast.error("You can only have one manual trigger");
          return;
        }
      }

      setNodes((nodes: Node[]): Node[] => {
        const hasInitialTrigger: boolean = nodes.some(
          (node: Node): boolean => node.type === NodeType.INITIAL
        );

        const centerX: number = window.innerWidth / 2;
        const centerY: number = window.innerHeight / 2;

        const flowPosition: XYPosition = screenToFlowPosition({
          x: centerX + (Math.random() - 0.5) * 200,
          y: centerY + (Math.random() - 0.5) * 200,
        });

        const newNode = {
          id: createId(),
          data: {},
          position: flowPosition,
          type: selection.type,
        };

        if (hasInitialTrigger) {
          return [newNode];
        }

        return [...nodes, newNode];
      });

      onOpenChange(false);
    },
    [getNodes, onOpenChange, screenToFlowPosition, setNodes]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>What triggers this workflow?</SheetTitle>
          <SheetDescription>
            A trigger is a step that starts your workflow.
          </SheetDescription>
        </SheetHeader>
        <div>
          {triggerNodes.map((nodeType: NodeTypeOption): ReactElement => {
            const Icon = nodeType.icon;

            return (
              <div
                key={nodeType.type}
                className="w-full justify-start h-auto py-5 px-4 rounder-none cursor-pointer border-l-2 border-transparent hover:border-primary"
                onClick={(): void => handleNodeSelect(nodeType)}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <Image
                      src={Icon}
                      alt={nodeType.label}
                      width={20}
                      height={20}
                      className="size-5 object-contain rounded-sm"
                    />
                  ) : (
                    <Icon className="size-5" />
                  )}
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">
                      {nodeType.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {nodeType.description}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Separator />
        <div>
          {executionNodes.map((nodeType: NodeTypeOption): ReactElement => {
            const Icon = nodeType.icon;

            return (
              <div
                key={nodeType.type}
                className="w-full justify-start h-auto py-5 px-4 rounder-none cursor-pointer border-l-2 border-transparent hover:border-primary"
                onClick={(): void => handleNodeSelect(nodeType)}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <Image
                      src={Icon}
                      alt={nodeType.label}
                      width={20}
                      height={20}
                      className="size-5 object-contain rounded-sm"
                    />
                  ) : (
                    <Icon className="size-5" />
                  )}
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">
                      {nodeType.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {nodeType.description}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
