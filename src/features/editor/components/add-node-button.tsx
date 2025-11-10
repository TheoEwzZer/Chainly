import { NodeSelector } from "@/components/node-selector";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { memo, useState, type ReactElement } from "react";

export const AddNodeButton = memo((): ReactElement => {
  const [selectorOpen, setSelectorOpen] = useState<boolean>(false);

  return (
    <NodeSelector open={selectorOpen} onOpenChange={setSelectorOpen}>
      <Button
        size="icon"
        variant="ghost"
        onClick={(): void => console.log("add node")}
        className="bg-primary-foreground"
      >
        <PlusIcon className="size-4" />
      </Button>
    </NodeSelector>
  );
});

AddNodeButton.displayName = "AddNodeButton";
