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
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactElement } from "react";
import { Plus, Trash2 } from "lucide-react";
import z from "zod";

const fieldSchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, "Key must be a valid identifier"),
  value: z.string(),
});

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    ),
  fields: z.array(fieldSchema).min(1, "At least one field is required"),
});

export type SetFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SetFormValues) => void;
  defaultValues?: Partial<SetFormValues>;
}

export const SetDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const form = useForm<SetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "data",
      fields: defaultValues.fields || [{ key: "", value: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "data",
        fields: defaultValues.fields || [{ key: "", value: "" }],
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
  });

  const handleSubmit = (values: SetFormValues): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set</DialogTitle>
          <DialogDescription>
            Define variables to transform or create new data. Use{" "}
            {"{{variables}}"} to reference values from previous nodes.
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
                  Access the result in other nodes using{" "}
                  {`{{${watchVariableName || "data"}.fieldName}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="data"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FieldLabel>Fields</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ key: "", value: "" })}
              >
                <Plus className="size-4 mr-1" />
                Add Field
              </Button>
            </div>
            <FieldDescription>
              Define key-value pairs. Values can be static or use expressions
              like {`{{previousNode.value}}`} or {`{{previousNode.count + 1}}`}
            </FieldDescription>

            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <Controller
                  name={`fields.${index}.key`}
                  control={form.control}
                  render={({ field: keyField, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="flex-1">
                      <Input
                        {...keyField}
                        placeholder="key"
                        aria-invalid={fieldState.invalid}
                        className="font-mono"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name={`fields.${index}.value`}
                  control={form.control}
                  render={({ field: valueField, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="flex-2">
                      <Input
                        {...valueField}
                        placeholder="value or {{expression}}"
                        aria-invalid={fieldState.invalid}
                        className="font-mono"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="shrink-0"
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
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
