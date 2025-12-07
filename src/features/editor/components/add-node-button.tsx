import { NodeSelector } from "@/components/node-selector";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { memo, useState, useEffect, useCallback, type ReactElement } from "react";

export const AddNodeButton = memo((): ReactElement => {
  const [selectorOpen, setSelectorOpen] = useState<boolean>(false);

  const handleKeyDown = useCallback((event: KeyboardEvent): void => {
    if (event.ctrlKey && (event.key === "k" || event.key === "+")) {
      event.preventDefault();
      setSelectorOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return (): void => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="bg-primary-foreground"
        onClick={(): void => setSelectorOpen(true)}
      >
        <PlusIcon className="size-4" />
      </Button>
      <NodeSelector open={selectorOpen} onOpenChange={setSelectorOpen} />
    </>
  );
});

AddNodeButton.displayName = "AddNodeButton";
