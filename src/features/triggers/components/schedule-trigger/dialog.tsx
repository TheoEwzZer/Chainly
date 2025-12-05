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

const TIMEZONE_OPTIONS = [
  // UTC
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  // Europe
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (CET/CEST)" },
  { value: "Europe/Rome", label: "Europe/Rome (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam (CET/CEST)" },
  { value: "Europe/Brussels", label: "Europe/Brussels (CET/CEST)" },
  { value: "Europe/Zurich", label: "Europe/Zurich (CET/CEST)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (MSK)" },
  // Americas
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Denver", label: "America/Denver (MST/MDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "America/Toronto", label: "America/Toronto (EST/EDT)" },
  { value: "America/Vancouver", label: "America/Vancouver (PST/PDT)" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo (BRT)" },
  { value: "America/Mexico_City", label: "America/Mexico_City (CST/CDT)" },
  // Asia
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong (HKT)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Seoul", label: "Asia/Seoul (KST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  // Oceania
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST/NZDT)" },
] as const;

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function isHourlyOrLessFrequent(cronExpression: string): boolean {
  const parts: string[] = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  const minuteField: string = parts[0];

  if (
    minuteField === "*" ||
    minuteField.includes("/") ||
    minuteField.includes(",") ||
    minuteField.includes("-")
  ) {
    return false;
  }

  const minute: number = Number.parseInt(minuteField, 10);
  return !Number.isNaN(minute) && minute >= 0 && minute <= 59;
}

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
    timezone: z.string().min(1, "Timezone is required"),
    cronExpression: z.string().optional(),
    datetime: z.string().optional(),
    intervalValue: z.number().min(1).optional(),
    intervalUnit: z.enum(["hours", "days"]).optional(),
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
  )
  .refine(
    (data) => {
      if (data.scheduleMode === "cron" && data.cronExpression) {
        return isHourlyOrLessFrequent(data.cronExpression);
      }
      return true;
    },
    {
      message:
        "Cron expression cannot run more frequently than once per hour. The minute field must be a fixed number (e.g., '0 9 * * *' for 9:00 AM).",
      path: ["cronExpression"],
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
  const browserTimezone: string = getBrowserTimezone();

  const getIntervalUnit = (unit?: string): "hours" | "days" => {
    if (unit === "days") {
      return "days";
    }
    return "hours"; 
  };

  const form = useForm<ScheduleTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "schedule",
      scheduleMode: defaultValues.scheduleMode || "cron",
      timezone: defaultValues.timezone || browserTimezone,
      cronExpression: defaultValues.cronExpression || "",
      datetime: defaultValues.datetime || "",
      intervalValue: defaultValues.intervalValue || 1,
      intervalUnit: getIntervalUnit(defaultValues.intervalUnit),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "schedule",
        scheduleMode: defaultValues.scheduleMode || "cron",
        timezone: defaultValues.timezone || browserTimezone,
        cronExpression: defaultValues.cronExpression || "",
        datetime: defaultValues.datetime || "",
        intervalValue: defaultValues.intervalValue || 1,
        intervalUnit: getIntervalUnit(defaultValues.intervalUnit),
      });
    }
  }, [open, defaultValues, form, browserTimezone]);

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
                      Recurring Interval (every X hours/days)
                    </Label>
                  </div>
                </RadioGroup>
              </Field>
            )}
          />

          {/* Timezone selector */}
          <Controller
            name="timezone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Timezone</FieldLabel>
                <FieldDescription>
                  Select the timezone for schedule evaluation. Your detected
                  timezone is: {browserTimezone}
                </FieldDescription>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                    {/* Show browser timezone if not in list */}
                    {!TIMEZONE_OPTIONS.some(
                      (tz) => tz.value === browserTimezone
                    ) && (
                      <SelectItem value={browserTimezone}>
                        {browserTimezone} (Your timezone)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
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
                    Note: Minimum frequency is hourly. The minute field must be
                    a fixed number.
                    <br />
                    Example: &quot;0 9 * * *&quot; = Every day at 9:00 AM
                    <br />
                    Example: &quot;0 */2 * * *&quot; = Every 2 hours at minute 0
                    <br />
                    Example: &quot;30 8 * * 1-5&quot; = Weekdays at 8:30 AM
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
