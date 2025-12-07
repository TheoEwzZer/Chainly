"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactElement } from "react";
import z from "zod";

const formSchema = z.object({
  duration: z
    .number()
    .min(1, "Duration must be at least 1")
    .max(86400, "Duration cannot exceed 86400 (24 hours in seconds)"),
  unit: z.enum(["seconds", "minutes", "hours", "days"]),
});

export type WaitFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WaitFormValues) => void;
  defaultValues?: Partial<WaitFormValues>;
}

export const WaitDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const form = useForm<WaitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      duration: defaultValues.duration || 5,
      unit: defaultValues.unit || "seconds",
    },
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        duration: defaultValues.duration || 5,
        unit: defaultValues.unit || "seconds",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: WaitFormValues): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wait</DialogTitle>
          <DialogDescription>
            Pause the workflow execution for a specified duration before
            continuing to the next node.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 mt-4"
        >
          <div className="flex gap-4">
            <Controller
              name="duration"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="flex-1">
                  <FieldLabel htmlFor={field.name}>Duration</FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={1}
                    placeholder="5"
                    aria-invalid={fieldState.invalid}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="unit"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="flex-1">
                  <FieldLabel htmlFor={field.name}>Unit</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">Seconds</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <FieldDescription>
            The workflow will pause for the specified duration. During this
            time, the execution will be suspended and resumed automatically.
          </FieldDescription>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={(): void => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
