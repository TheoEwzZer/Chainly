"use client";

import { useEffect, type ReactElement } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { CheckIcon, CopyIcon, RefreshCcwIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Variable name must start with a letter or underscore"
    ),
});

export type WebhookTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WebhookTriggerFormValues) => void;
  nodeId: string;
  secret?: string;
  defaultValues?: Partial<WebhookTriggerFormValues>;
  onRegenerateSecret: () => void;
}

export const WebhookTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  nodeId,
  secret,
  defaultValues,
  onRegenerateSecret,
}: Props): ReactElement => {
  const params: { workflowId: string } = useParams<{ workflowId: string }>();
  const workflowId: string = params?.workflowId;

  const form = useForm<WebhookTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "webhook",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues?.variableName || "webhook",
      });
    }
  }, [defaultValues?.variableName, form, open]);

  const baseUrl: string =
    process.env.NEXT_PUBLIC_APP_URL ||
    (globalThis.window === undefined
      ? "http://localhost:3000"
      : globalThis.location.origin);
  const webhookUrl: string =
    workflowId && nodeId
      ? `${baseUrl}/api/webhooks/${workflowId}?nodeId=${nodeId}`
      : `${baseUrl}/api/webhooks/{workflowId}?nodeId={nodeId}`;

  const {
    copyToClipboard: copyUrl,
    isCopied: isUrlCopied,
    copyToClipboard: copySecret,
    isCopied: isSecretCopied,
  } = useCopyToClipboard();

  const handleSubmit = (values: WebhookTriggerFormValues): void => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Webhook Trigger</DialogTitle>
          <DialogDescription>
            Configure your webhook trigger. Send POST requests with the secret
            header to start this workflow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Controller
            name="variableName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Variable Name</FieldLabel>
                <FieldDescription>
                  Reference the payload in other nodes via{" "}
                  <code className="bg-muted px-1 rounded">{`{{${
                    field.value || "webhook"
                  }.body}}`}</code>
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="webhook"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <section className="space-y-2 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Webhook URL</p>
                <p className="text-xs text-muted-foreground">
                  Send POST requests to this endpoint with your JSON payload.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(): void => copyUrl(webhookUrl)}
                disabled={!workflowId || !nodeId}
              >
                {isUrlCopied ? (
                  <>
                    <CheckIcon className="size-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="size-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <code className="block rounded bg-background p-2 text-xs break-all">
              {webhookUrl}
            </code>
          </section>

          <section className="space-y-2 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">X-Chainly-Secret</p>
                <p className="text-xs text-muted-foreground">
                  Include this header with every request to authenticate.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRegenerateSecret}
                >
                  <RefreshCcwIcon className="size-4" />
                  Regenerate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => secret && copySecret(secret)}
                  disabled={!secret}
                >
                  {isSecretCopied ? (
                    <>
                      <CheckIcon className="size-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
            <code
              className={cn(
                "block rounded bg-background p-2 text-xs break-all",
                !secret && "text-muted-foreground"
              )}
            >
              {secret || "Secret will appear here once generated."}
            </code>
          </section>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={(): void => onOpenChange(false)}
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
