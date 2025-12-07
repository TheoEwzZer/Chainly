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
      "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    ),
});

export type ErrorHandlerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ErrorHandlerFormValues) => void;
  defaultValues?: Partial<ErrorHandlerFormValues>;
}

export const ErrorHandlerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const form = useForm<ErrorHandlerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "errorHandler",
    },
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "errorHandler",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
  });

  const handleSubmit = (values: ErrorHandlerFormValues): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Error Handler</DialogTitle>
          <DialogDescription>
            Check if the previous node(s) failed and route the workflow
            accordingly. Connect this node after any node that might fail.
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
                  Use this name to access error information in the error path:
                  <br />
                  <br />
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {`{{${watchVariableName || "errorHandler"}.hasError}}`}
                  </code>{" "}
                  - Boolean indicating if an error occurred
                  <br />
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {`{{${watchVariableName || "errorHandler"}.error}}`}
                  </code>{" "}
                  - Error message (if any)
                  <br />
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {`{{${watchVariableName || "errorHandler"}.failedNodeId}}`}
                  </code>{" "}
                  - ID of the failed node
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="errorHandler"
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
