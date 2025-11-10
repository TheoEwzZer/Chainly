"use client";

import { forwardRef } from "react";
import { Maximize, Minus, Plus } from "lucide-react";

import {
  Panel,
  useViewport,
  useStore,
  useReactFlow,
  type PanelProps,
  type ReactFlowState,
} from "@xyflow/react";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ZoomSlider = forwardRef<
  HTMLDivElement,
  Omit<PanelProps, "children">
>(({ className, ...props }, ref) => {
  const { zoom } = useViewport();
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow();

  const minZoom: number = useStore(
    (state: ReactFlowState): number => state.minZoom
  );
  const maxZoom: number = useStore(
    (state: ReactFlowState): number => state.maxZoom
  );

  return (
    <Panel
      className={cn(
        "flex gap-1 rounded-md bg-primary-foreground p-1 text-foreground",
        className
      )}
      ref={ref}
      {...props}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={(): Promise<boolean> => zoomOut({ duration: 300 })}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Slider
        className="w-[140px]"
        value={[zoom]}
        min={minZoom}
        max={maxZoom}
        step={0.01}
        onValueChange={(values: number[]): Promise<boolean> =>
          zoomTo(values[0])
        }
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={(): Promise<boolean> => zoomIn({ duration: 300 })}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        className="min-w-20 tabular-nums"
        variant="ghost"
        onClick={(): Promise<boolean> => zoomTo(1, { duration: 300 })}
      >
        {(100 * zoom).toFixed(0)}%
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={(): Promise<boolean> => fitView({ duration: 300 })}
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </Panel>
  );
});

ZoomSlider.displayName = "ZoomSlider";
