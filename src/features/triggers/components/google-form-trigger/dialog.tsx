"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
  CheckIcon,
  CopyIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { generateGoogleFormScript } from "./utils";
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
  secret: z.string().optional(),
});

export type GoogleFormTriggerFormValues = z.infer<typeof formSchema> & {
  nodeId?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleFormTriggerFormValues) => void;
  nodeId?: string;
  defaultValues?: Partial<GoogleFormTriggerFormValues>;
  onRegenerateSecret: () => void;
}

export const GoogleFormTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  nodeId,
  defaultValues = {},
  onRegenerateSecret,
}: Props): ReactElement => {
  const params: { workflowId: string } = useParams<{ workflowId: string }>();
  const { workflowId } = params;

  const { copyToClipboard: copyScriptToClipboard, isCopied: isScriptCopied } =
    useCopyToClipboard({
      onCopy: (): void => {
        toast.success("Google Apps Script copied to clipboard");
      },
      onError: (): void => {
        toast.error("Failed to copy Google Apps Script");
      },
    });

  const { copyToClipboard: copySecretToClipboard, isCopied: isSecretCopied } =
    useCopyToClipboard({
      onCopy: (): void => {
        toast.success("Secret copied to clipboard");
      },
      onError: (): void => {
        toast.error("Failed to copy secret");
      },
    });

  const form = useForm<GoogleFormTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "googleForm",
      secret: defaultValues.secret || "",
    },
  });

  const watchedVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
    defaultValue: defaultValues.variableName || "googleForm",
  });

  const watchedSecret: string =
    useWatch({
      control: form.control,
      name: "secret",
      defaultValue: defaultValues.secret || "",
    }) || "";

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "googleForm",
        secret: defaultValues.secret || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: GoogleFormTriggerFormValues): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  const baseUrl: string =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl: string = nodeId
    ? `${baseUrl}/api/webhooks/google-form?workflowId=${workflowId}&nodeId=${nodeId}`
    : `${baseUrl}/api/webhooks/google-form?workflowId=${workflowId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Google Form Trigger Configuration</DialogTitle>
          <DialogDescription>
            Configure this trigger and use the generated Apps Script in your
            Google Form to trigger this workflow on form submissions.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 mt-4"
        >
          {/* Variable Name */}
          <Controller
            name="variableName"
            control={form.control}
            render={({ field, fieldState }) => {
              const variableName: string = field.value || "googleForm";
              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Variable Name</FieldLabel>
                  <FieldDescription>
                    Use this name to reference the form data in other nodes:{" "}
                    {`{{${variableName}.respondentEmail}}`}
                  </FieldDescription>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="googleForm"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              );
            }}
          />

          {/* Webhook Secret */}
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-green-600" />
              <h4 className="font-medium text-sm">
                Webhook Secret (Recommended)
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">
              The Apps Script will include this secret in the X-Chainly-Secret
              header to authenticate requests.
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={watchedSecret || "Click 'Generate' to create a secret"}
                placeholder="Click 'Generate' to create a secret"
                className="text-xs font-mono flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onRegenerateSecret();
                  toast.success("New secret generated");
                }}
              >
                <RefreshCcwIcon className="size-4" />
                {watchedSecret ? "Regenerate" : "Generate"}
              </Button>
              {watchedSecret && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copySecretToClipboard(watchedSecret)}
                >
                  {isSecretCopied ? (
                    <>
                      <CheckIcon className="size-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-4" />
                      Copy
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium text-sm">Setup instructions</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open your Google Form</li>
              <li>
                Click on the three dots menu → <strong>Apps Script</strong>
              </li>
              <li>Delete any existing code and paste the script below</li>
              <li>
                Save the project (Ctrl+S) and click <strong>Triggers</strong>{" "}
                (clock icon)
              </li>
              <li>
                Click <strong>+ Add Trigger</strong> → Choose function:{" "}
                <code className="bg-background px-1 py-0.5 rounded">
                  onFormSubmit
                </code>
              </li>
              <li>
                Select event type:{" "}
                <code className="bg-background px-1 py-0.5 rounded">
                  On form submit
                </code>{" "}
                → Save
              </li>
              <li>Authorize the script when prompted</li>
            </ol>
          </div>

          {/* Google Apps Script */}
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <h4 className="font-medium text-sm">Google Apps Script</h4>
            <p className="text-xs text-muted-foreground">
              {watchedSecret
                ? "This script includes your webhook URL and secret for secure authentication."
                : "Generate a secret above for secure authentication (recommended)."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(): void =>
                copyScriptToClipboard(
                  generateGoogleFormScript(webhookUrl, watchedSecret)
                )
              }
              className="w-full"
            >
              {isScriptCopied ? (
                <>
                  <CheckIcon className="size-4" />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon className="size-4" />
                  Copy Google Apps Script
                </>
              )}
            </Button>
          </div>

          {/* Available Variables */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium text-sm">Available variables</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {`{{${watchedVariableName || "googleForm"}.respondentEmail}}`}
                </code>{" "}
                - Respondent&apos;s email
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {`{{${watchedVariableName || "googleForm"}.formTitle}}`}
                </code>{" "}
                - Form title
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {`{{${
                    watchedVariableName || "googleForm"
                  }.responses['Question Name']}}`}
                </code>{" "}
                - Specific answer
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {`{{json ${watchedVariableName || "googleForm"}.responses}}`}
                </code>{" "}
                - All responses as JSON
              </li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
