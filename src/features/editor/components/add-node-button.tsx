import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { memo, type ReactElement } from "react";

export const AddNodeButton = memo((): ReactElement => {
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={(): void => console.log("add node")}
      className="bg-background"
    >
      <PlusIcon className="size-4" />
    </Button>
  );
});

AddNodeButton.displayName = "AddNodeButton";
