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

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Variable name must start with a letter or underscore"
    ),
  arrayPath: z.string().min(1, "Array path is required"),
  itemVariableName: z
    .string()
    .min(1, "Item variable name is required")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Item variable name must start with a letter or underscore"
    ),
});

export type LoopFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: LoopFormValues) => void;
  defaultValues?: Partial<LoopFormValues>;
}

export const LoopDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const form = useForm<LoopFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      arrayPath: defaultValues.arrayPath || "",
      itemVariableName: defaultValues.itemVariableName || "item",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        arrayPath: defaultValues.arrayPath || "",
        itemVariableName: defaultValues.itemVariableName || "item",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = useWatch({
    control: form.control,
    name: "variableName",
  });

  const watchItemVariableName = useWatch({
    control: form.control,
    name: "itemVariableName",
  });

  const handleSubmit = (values: LoopFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Loop</DialogTitle>
          <DialogDescription>
            Iterate over an array and execute the following nodes for each item.
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
                  Use this name to reference the loop results in other nodes:{" "}
                  {`{{${watchVariableName || "loopResults"}.items}}`} or{" "}
                  {`{{${watchVariableName || "loopResults"}.count}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="loopResults"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="arrayPath"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Array Path</FieldLabel>
                <FieldDescription>
                  Path to the array to iterate over. Use {"{{variables}}"} to reference
                  values from previous nodes. Example: {"{{previous.data.items}}"}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="{{previous.data.items}}"
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
            name="itemVariableName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Item Variable Name</FieldLabel>
                <FieldDescription>
                  Variable name for the current item in the loop. Use this in nodes inside the loop:{" "}
                  {`{{${watchItemVariableName || "item"}.property}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="item"
                  aria-invalid={fieldState.invalid}
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

