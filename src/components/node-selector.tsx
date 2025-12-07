"use client";

import { NodeType } from "@/generated/prisma/enums";
import { useCallback, type ReactElement } from "react";
import Image from "next/image";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { createId } from "@paralleldrive/cuid2";
import type { Node } from "@xyflow/react";
import {
  triggerNodes,
  nodeCategories,
  type NodeTypeOption,
  type NodeCategory,
} from "@/config/node-types";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command";

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NodeSelector({
  open,
  onOpenChange,
}: Readonly<NodeSelectorProps>): ReactElement {
  const { setNodes, screenToFlowPosition } = useReactFlow();

  const handleNodeSelect = useCallback(
    (selection: NodeTypeOption): void => {
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
    [onOpenChange, screenToFlowPosition, setNodes]
  );

  const renderNodeItem = (nodeType: NodeTypeOption): ReactElement => {
    const Icon = nodeType.icon;

    return (
      <CommandItem
        key={nodeType.type}
        value={`${nodeType.label} ${nodeType.description}`}
        onSelect={(): void => handleNodeSelect(nodeType)}
        className="flex items-center gap-3 py-3 cursor-pointer"
      >
        {typeof Icon === "string" ? (
          <Image
            src={Icon}
            alt={nodeType.label}
            width={20}
            height={20}
            className="size-5 object-contain rounded-none"
          />
        ) : (
          <Icon className="size-5 text-muted-foreground" />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium">{nodeType.label}</span>
          <span className="text-xs text-muted-foreground">
            {nodeType.description}
          </span>
        </div>
      </CommandItem>
    );
  };

  const renderCategory = (category: NodeCategory): ReactElement => {
    const CategoryIcon = category.icon;

    return (
      <CommandGroup
        key={category.id}
        heading={
          <div className="flex items-center gap-2">
            <CategoryIcon className="size-3.5" />
            {category.label}
          </div>
        }
      >
        {category.nodes.map(renderNodeItem)}
      </CommandGroup>
    );
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a node"
      description="Search for a node to add to your workflow"
    >
      <CommandInput placeholder="Search nodes..." />
      <CommandList className="max-h-[790px]">
        <CommandEmpty>No nodes found.</CommandEmpty>

        <CommandGroup heading="Triggers">
          {triggerNodes.map(renderNodeItem)}
        </CommandGroup>

        <CommandSeparator />

        {nodeCategories.map(
          (category: NodeCategory, index: number): ReactElement => (
            <div key={category.id}>
              {renderCategory(category)}
              {index < nodeCategories.length - 1 && <CommandSeparator />}
            </div>
          )
        )}
      </CommandList>
    </CommandDialog>
  );
}
