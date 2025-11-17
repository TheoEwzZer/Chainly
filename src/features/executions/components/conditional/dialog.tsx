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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactElement } from "react";
import z from "zod";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    ),
  condition: z
    .string()
    .min(1, "Condition is required")
    .max(1000, "Condition must be less than 1000 characters"),
});

export type ConditionalFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ConditionalFormValues) => void;
  defaultValues?: Partial<ConditionalFormValues>;
}

export const ConditionalDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const form = useForm<ConditionalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      condition: defaultValues.condition || "",
    },
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        condition: defaultValues.condition || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
  });

  const handleSubmit = (values: ConditionalFormValues): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conditional</DialogTitle>
          <DialogDescription>
            Evaluate a condition and route the workflow to different paths based
            on the result. Use {"{{variables}}"} to reference values from
            previous nodes.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-8 mt-4"
        >
          <Controller
            name="variableName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Variable Name</FieldLabel>
                <FieldDescription>
                  Use this name to reference the result in other nodes:{" "}
                  {`{{${watchVariableName || "conditionalResult"}.result}}`} or{" "}
                  {`{{${watchVariableName || "conditionalResult"}.passed}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="conditionalResult"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="condition"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Condition</FieldLabel>
                <FieldDescription>
                  Enter a JavaScript expression that evaluates to true or false.
                  Use
                  {" {{variables}}"} to reference values from previous nodes.
                  <br />
                  <br />
                  Examples:
                  <br />• {`{{myVariable.count}} > 10`}
                  <br />• {`{{myVariable.status}} == "active"`}
                  <br />• {`{{myVariable.items}}.length > 0`}
                  <br />•{" "}
                  {`{{myVariable.value}} != null && {{myVariable.value}} != undefined`}
                </FieldDescription>
                <Textarea
                  {...field}
                  id={field.name}
                  placeholder="{{myVariable.count}} > 10"
                  aria-invalid={fieldState.invalid}
                  className="min-h-[100px] font-mono"
                  maxLength={1000}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

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
