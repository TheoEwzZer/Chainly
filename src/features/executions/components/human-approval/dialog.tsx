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
import Link from "next/link";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Variable name must start with a letter or underscore"
    ),
  message: z.string().min(1, "Approval message is required"),
});

export type HumanApprovalFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: HumanApprovalFormValues) => void;
  defaultValues?: Partial<HumanApprovalFormValues>;
}

export const HumanApprovalDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const form = useForm<HumanApprovalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      message: defaultValues.message || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        message: defaultValues.message || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = useWatch({
    control: form.control,
    name: "variableName",
  });

  const handleSubmit = (values: HumanApprovalFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Human Approval</DialogTitle>
          <DialogDescription>
            Pause the workflow and wait for human approval before continuing.
            Approvals will appear on the{" "}
            <Link href="/approvals" target="_blank">
              Approvals
            </Link>{" "}
            page where they can be reviewed and approved or rejected.
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
                  Use this name to reference the approval result in other nodes:{" "}
                  {`{{${watchVariableName || "approval"}.status}}`} or{" "}
                  {`{{${watchVariableName || "approval"}.response}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="approval"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="message"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Approval Message</FieldLabel>
                <FieldDescription>
                  The message that will be shown to the approver on the{" "}
                  <Link href="/approvals" target="_blank">
                    Approvals
                  </Link>{" "}
                  page. Use {"{{variables}}"} to reference values from previous
                  nodes.
                </FieldDescription>
                <Textarea
                  {...field}
                  id={field.name}
                  placeholder="Please review and approve this action: {{previous.data}}"
                  aria-invalid={fieldState.invalid}
                  className="min-h-[100px] font-mono"
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
