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
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactElement } from "react";
import z from "zod";
import { Plus, Trash2 } from "lucide-react";

const caseSchema = z.object({
  label: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Value is required"),
});

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    ),
  expression: z
    .string()
    .min(1, "Expression is required")
    .max(1000, "Expression must be less than 1000 characters"),
  cases: z
    .array(caseSchema)
    .min(1, "At least one case is required")
    .max(10, "Maximum 10 cases allowed"),
  hasDefault: z.boolean(),
});

export type SwitchFormValues = z.infer<typeof formSchema>;
export type SwitchCase = z.infer<typeof caseSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SwitchFormValues) => void;
  defaultValues?: Partial<SwitchFormValues>;
}

export const SwitchDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const form = useForm<SwitchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      expression: defaultValues.expression || "",
      cases: defaultValues.cases || [{ label: "Case 1", value: "" }],
      hasDefault: defaultValues.hasDefault ?? true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cases",
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        expression: defaultValues.expression || "",
        cases: defaultValues.cases || [{ label: "Case 1", value: "" }],
        hasDefault: defaultValues.hasDefault ?? true,
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
  });

  const handleSubmit = (values: SwitchFormValues): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  const addCase = (): void => {
    if (fields.length < 10) {
      append({ label: `Case ${fields.length + 1}`, value: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Switch</DialogTitle>
          <DialogDescription>
            Evaluate an expression and route the workflow to different paths
            based on matching case values. Use {"{{variables}}"} to reference
            values from previous nodes.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 mt-4"
        >
          <Controller
            name="variableName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Variable Name</FieldLabel>
                <FieldDescription>
                  Use this name to reference the result in other nodes:{" "}
                  {`{{${watchVariableName || "switchResult"}.matchedCase}}`} or{" "}
                  {`{{${watchVariableName || "switchResult"}.value}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="switchResult"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="expression"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Expression</FieldLabel>
                <FieldDescription>
                  Enter the value or expression to evaluate. The result will be
                  compared against case values.
                  <br />
                  <br />
                  Examples:
                  <br />
                  {`• {{myVariable.status}}`}
                  <br />
                  {`• {{myVariable.type}}`}
                  <br />
                  {`• {{trigger.data.action}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="{{myVariable.status}}"
                  aria-invalid={fieldState.invalid}
                  className="font-mono"
                  maxLength={1000}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FieldLabel>Cases</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCase}
                disabled={fields.length >= 10}
              >
                <Plus className="size-4 mr-1" />
                Add Case
              </Button>
            </div>
            <FieldDescription>
              Define the case values to match against the expression. A
              &quot;default&quot; route is always available for unmatched
              values.
            </FieldDescription>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1 space-y-3">
                    <Controller
                      name={`cases.${index}.label`}
                      control={form.control}
                      render={({ field: labelField, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel
                            htmlFor={labelField.name}
                            className="text-xs"
                          >
                            Label
                          </FieldLabel>
                          <Input
                            {...labelField}
                            id={labelField.name}
                            placeholder="Case label"
                            aria-invalid={fieldState.invalid}
                            className="h-8"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Controller
                      name={`cases.${index}.value`}
                      control={form.control}
                      render={({ field: valueField, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel
                            htmlFor={valueField.name}
                            className="text-xs"
                          >
                            Value to Match
                          </FieldLabel>
                          <Input
                            {...valueField}
                            id={valueField.name}
                            placeholder="Value to match"
                            aria-invalid={fieldState.invalid}
                            className="h-8 font-mono"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-6 text-destructive hover:text-destructive"
                      onClick={(): void => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Controller
              name="hasDefault"
              control={form.control}
              render={({ field }) => (
                <div className="p-3 border rounded-lg bg-muted/50 border-dashed">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <div>
                      <p className="text-sm font-medium">Enable Default Case</p>
                      <p className="text-xs text-muted-foreground">
                        Route to a default path when no case matches. If disabled
                        and no match is found, the workflow will fail.
                      </p>
                    </div>
                  </label>
                </div>
              )}
            />
          </div>

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
