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
  code: z
    .string()
    .min(1, "Code is required")
    .max(50000, "Code must be less than 50000 characters"),
});

export type CodeFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CodeFormValues) => void;
  defaultValues?: Partial<CodeFormValues>;
}

const defaultCode = `// Access data from previous nodes via the 'context' object
// Example: context.httpResponse.data, context.gptResponse.text

// Your code here
const result = {
  message: "Hello from Code node!",
  timestamp: new Date().toISOString(),
};

// Return the value to store in the variable
return result;`;

export const CodeDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const form = useForm<CodeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "code",
      code: defaultValues.code || defaultCode,
    },
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "code",
        code: defaultValues.code || defaultCode,
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
  });

  const handleSubmit = (values: CodeFormValues): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Code</DialogTitle>
          <DialogDescription>
            Write custom JavaScript code to transform data or perform complex
            logic. The code runs in a sandboxed environment with access to the
            workflow context.
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
                  {`{{${watchVariableName || "code"}}}`} or{" "}
                  {`{{${watchVariableName || "code"}.propertyName}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="code"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="code"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>JavaScript Code</FieldLabel>
                <FieldDescription>
                  Write JavaScript code that processes the workflow context.
                  <br />
                  <br />
                  <strong>Available:</strong>
                  <br />• <code>context</code> - Object containing all data from
                  previous nodes
                  <br />• Pure JavaScript (ES2020): Array methods, Object
                  methods, Math, Date, JSON, etc.
                  <br />
                  <br />
                  <strong>Not available:</strong>
                  <br />• Browser APIs: window, document, fetch, localStorage
                  <br />• Node.js APIs: require, fs, path, process
                  <br />
                  <br />
                  <strong>Must return:</strong> The value to store (use{" "}
                  <code>return</code>)
                </FieldDescription>
                <Textarea
                  {...field}
                  id={field.name}
                  placeholder="// Your code here"
                  aria-invalid={fieldState.invalid}
                  className="min-h-[300px] font-mono text-sm"
                  maxLength={50000}
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
