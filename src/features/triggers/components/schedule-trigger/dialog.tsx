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
import { Button } from "@/components/ui/button";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactElement } from "react";
import z from "zod";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Définir le schéma de validation avec Zod
const formSchema = z
  .object({
    variableName: z
      .string()
      .min(1, "Variable name is required")
      .regex(
        /^[A-Za-z_$][A-Za-z0-9_$]*$/,
        "Variable name must start with a letter or underscore"
      ),
    scheduleMode: z.enum(["cron", "datetime", "interval"]),
    cronExpression: z.string().optional(),
    datetime: z.string().optional(),
    intervalValue: z.number().min(1).optional(),
    intervalUnit: z.enum(["minutes", "hours", "days"]).optional(),
  })
  .refine(
    (data) => {
      if (data.scheduleMode === "cron") {
        return data.cronExpression && data.cronExpression.length > 0;
      }
      if (data.scheduleMode === "datetime") {
        return data.datetime && data.datetime.length > 0;
      }
      if (data.scheduleMode === "interval") {
        return (
          data.intervalValue && data.intervalValue > 0 && data.intervalUnit
        );
      }
      return true;
    },
    {
      message:
        "Please fill in all required fields for the selected schedule mode",
    }
  );

export type ScheduleTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ScheduleTriggerFormValues) => void;
  defaultValues?: Partial<ScheduleTriggerFormValues>;
}

export const ScheduleTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const form = useForm<ScheduleTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "schedule",
      scheduleMode: defaultValues.scheduleMode || "cron",
      cronExpression: defaultValues.cronExpression || "",
      datetime: defaultValues.datetime || "",
      intervalValue: defaultValues.intervalValue || 1,
      intervalUnit: defaultValues.intervalUnit || "minutes",
    },
  });

  // Réinitialiser le formulaire quand le dialog s'ouvre
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "schedule",
        scheduleMode: defaultValues.scheduleMode || "cron",
        cronExpression: defaultValues.cronExpression || "",
        datetime: defaultValues.datetime || "",
        intervalValue: defaultValues.intervalValue || 1,
        intervalUnit: defaultValues.intervalUnit || "minutes",
      });
    }
  }, [open, defaultValues, form]);

  // Pour afficher un exemple d'utilisation de la variable
  const watchVariableName = useWatch({
    control: form.control,
    name: "variableName",
  });

  const watchScheduleMode = useWatch({
    control: form.control,
    name: "scheduleMode",
  });

  const handleSubmit = (values: ScheduleTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Trigger</DialogTitle>
          <DialogDescription>
            Configure when this workflow should be executed automatically.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 mt-4"
        >
          {/* Champ Variable Name (obligatoire pour tous les nodes) */}
          <Controller
            name="variableName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Variable Name</FieldLabel>
                <FieldDescription>
                  Use this name to reference the trigger date/time in other
                  nodes: {`{{${watchVariableName || "schedule"}.triggeredAt}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="schedule"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Mode de schedule */}
          <Controller
            name="scheduleMode"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Schedule Mode</FieldLabel>
                <FieldDescription>
                  Choose how you want to schedule the workflow execution.
                </FieldDescription>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cron" id="cron"></RadioGroupItem>
                    <Label htmlFor="cron" className="cursor-pointer">
                      Cron Expression (e.g., &quot;0 9 * * *&quot; for daily at
                      9 AM)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="datetime" id="datetime" />
                    <Label htmlFor="datetime" className="cursor-pointer">
                      Specific Date & Time
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="interval" id="interval" />
                    <Label htmlFor="interval" className="cursor-pointer">
                      Recurring Interval (every X seconds/minutes/hours/days)
                    </Label>
                  </div>
                </RadioGroup>
              </Field>
            )}
          />

          {/* Cron Expression */}
          {watchScheduleMode === "cron" && (
            <Controller
              name="cronExpression"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Cron Expression</FieldLabel>
                  <FieldDescription>
                    Use standard cron syntax: minute hour day month weekday
                    <br />
                    Example: &quot;0 9 * * *&quot; = Every day at 9:00 AM
                    <br />
                    Example: &quot;0 */2 * * *&quot; = Every 2 hours
                    <br />
                    Example: &quot;*/15 * * * *&quot; = Every 15 minutes
                  </FieldDescription>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="0 9 * * *"
                    aria-invalid={fieldState.invalid}
                    className="font-mono"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}

          {/* Date & Time précise */}
          {watchScheduleMode === "datetime" && (
            <Controller
              name="datetime"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Date & Time</FieldLabel>
                  <FieldDescription>
                    Select a specific date and time when the workflow should
                    execute.
                  </FieldDescription>
                  <Input
                    {...field}
                    id={field.name}
                    type="datetime-local"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}

          {/* Intervalle récurrent */}
          {watchScheduleMode === "interval" && (
            <div className="space-y-4">
              <Controller
                name="intervalValue"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Interval Value</FieldLabel>
                    <FieldDescription>
                      How often should the workflow execute?
                    </FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      min={1}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(Number.parseInt(e.target.value, 10) || 1)
                      }
                      placeholder="1"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="intervalUnit"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Interval Unit</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
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
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
