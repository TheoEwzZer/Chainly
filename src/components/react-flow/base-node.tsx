import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";
import { NodeStatus } from "./node-status-indicator";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";

interface BaseNodeProps extends HTMLAttributes<HTMLDivElement> {
  status?: NodeStatus;
}

export const BaseNode = forwardRef<HTMLDivElement, BaseNodeProps>(
  ({ className, status, ...props }: BaseNodeProps, ref) => (
    <div
      ref={ref}
      role="button"
      className={cn(
        "relative rounded-md border bg-card text-card-foreground border-muted-foreground hover:bg-background",
        className
      )}
      tabIndex={0}
      {...props}
    >
      {props.children}
      {status === "error" && (
        <XCircleIcon className="absolute right-0.75 bottom-0.75 size-2 text-red-400 stroke-3" />
      )}
      {status === "success" && (
        <CheckCircle2Icon className="absolute right-0.75 bottom-0.75 size-2 text-emerald-600 stroke-3" />
      )}
      {status === "loading" && (
        <Loader2Icon className="absolute -right-0.25 -bottom-0.25 size-2 text-[rgba(42,67,233)] stroke-3 animate-spin" />
      )}
    </div>
  )
);
BaseNode.displayName = "BaseNode";

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export const BaseNodeHeader = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <header
    ref={ref}
    {...props}
    className={cn(
      "mx-0 my-0 -mb-1 flex flex-row items-center justify-between gap-2 px-3 py-2",
      // Remove or modify these classes if you modify the padding in the
      // `<BaseNode />` component.
      className
    )}
  />
));
BaseNodeHeader.displayName = "BaseNodeHeader";

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export const BaseNodeHeaderTitle = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="heading"
    aria-level={3}
    data-slot="base-node-title"
    className={cn("user-select-none flex-1 font-semibold", className)}
    {...props}
  />
));
BaseNodeHeaderTitle.displayName = "BaseNodeHeaderTitle";

export const BaseNodeContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="base-node-content"
    className={cn(
      "flex flex-col gap-y-2 p-3 aspect-square justify-center",
      className
    )}
    {...props}
  />
));
BaseNodeContent.displayName = "BaseNodeContent";

export const BaseNodeFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="base-node-footer"
    className={cn(
      "flex flex-col items-center gap-y-2 border-t px-3 pb-3 pt-2",
      className
    )}
    {...props}
  />
));
BaseNodeFooter.displayName = "BaseNodeFooter";
