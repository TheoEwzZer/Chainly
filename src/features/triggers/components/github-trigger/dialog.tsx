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
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactElement } from "react";
import z from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const GITHUB_EVENTS = [
  {
    value: "push",
    label: "Push",
    description: "When code is pushed to a branch",
  },
  {
    value: "pull_request",
    label: "Pull Request",
    description: "When a PR is opened, closed, or merged",
  },
  {
    value: "issues",
    label: "Issues",
    description: "When an issue is opened, closed, or commented",
  },
  {
    value: "issue_comment",
    label: "Issue Comment",
    description: "When a comment is added to an issue",
  },
  {
    value: "pull_request_review",
    label: "PR Review",
    description: "When a PR review is submitted",
  },
  {
    value: "release",
    label: "Release",
    description: "When a release is published",
  },
  {
    value: "create",
    label: "Create",
    description: "When a branch or tag is created",
  },
  {
    value: "delete",
    label: "Delete",
    description: "When a branch or tag is deleted",
  },
  { value: "fork", label: "Fork", description: "When a repository is forked" },
  { value: "star", label: "Star", description: "When a repository is starred" },
  {
    value: "watch",
    label: "Watch",
    description: "When a repository is watched",
  },
] as const;

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Variable name must start with a letter or underscore"
    ),
  events: z
    .array(z.enum(GITHUB_EVENTS.map((event) => event.value)))
    .min(1, "At least one event must be selected"),
  secret: z.string().optional(),
});

export type GitHubTriggerFormValues = z.infer<typeof formSchema> & {
  nodeId?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GitHubTriggerFormValues) => void;
  defaultValues?: Partial<GitHubTriggerFormValues>;
  onRegenerateSecret?: () => void;
}

export const GitHubTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const params: { workflowId: string } = useParams<{ workflowId: string }>();
  const { workflowId } = params;

  const { copyToClipboard: copyUrlToClipboard, isCopied: isUrlCopied } =
    useCopyToClipboard({
      onCopy: (): void => {
        toast.success("Webhook URL copied to clipboard");
      },
      onError: (): void => {
        toast.error("Failed to copy webhook URL");
      },
    });

  const form = useForm<GitHubTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "github",
      events: defaultValues.events || ["push"],
      secret: defaultValues.secret || "",
    },
  });

  const watchedVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
    defaultValue: defaultValues.variableName || "github",
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "github",
        events: defaultValues.events || ["push"],
        secret: defaultValues.secret || "",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: GitHubTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const baseUrl: string =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const nodeId: string = (defaultValues as any).nodeId || "";
  const webhookUrl: string = nodeId
    ? `${baseUrl}/api/webhooks/github?workflowId=${workflowId}&nodeId=${nodeId}`
    : `${baseUrl}/api/webhooks/github?workflowId=${workflowId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>GitHub Trigger Configuration</DialogTitle>
          <DialogDescription>
            Configure which GitHub events should trigger this workflow. Add this
            webhook URL to your GitHub repository settings.
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
              const variableName: string = field.value || "github";
              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Variable Name</FieldLabel>
                  <FieldDescription>
                    Use this name to reference the GitHub event data in other
                    nodes: {`{{${variableName}.event}}`}
                  </FieldDescription>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="github"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              );
            }}
          />

          {/* Events Selection */}
          <Controller
            name="events"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>GitHub Events</FieldLabel>
                <FieldDescription>
                  Select which GitHub events should trigger this workflow. You
                  can select multiple events.
                </FieldDescription>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {GITHUB_EVENTS.map((event) => (
                    <div
                      key={event.value}
                      className="flex items-start space-x-2 p-2 rounded-md border hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`event-${event.value}`}
                        checked={field.value?.includes(event.value)}
                        onCheckedChange={(checked: boolean) => {
                          const currentEvents = field.value || [];
                          if (checked) {
                            field.onChange([...currentEvents, event.value]);
                          } else {
                            field.onChange(
                              currentEvents.filter((e) => e !== event.value)
                            );
                          }
                        }}
                      />
                      <Label
                        htmlFor={`event-${event.value}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        <div className="font-medium">{event.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {event.description}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Webhook URL */}
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <h4 className="font-medium text-sm">Payload URL (GitHub)</h4>
            <p className="text-xs text-muted-foreground">
              Copy this URL and paste it in the &quot;Payload URL&quot; field
              when creating the webhook on GitHub.
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="text-xs font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyUrlToClipboard(webhookUrl)}
              >
                {isUrlCopied ? (
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
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium text-sm">Setup instructions</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>
                Go to your GitHub repository → <strong>Settings</strong> →{" "}
                <strong>Webhooks</strong> → <strong>Add webhook</strong>
              </li>
              <li>
                <strong>Payload URL:</strong> Paste the webhook URL above
              </li>
              <li>
                <strong>Content type:</strong> Select{" "}
                <code className="bg-background px-1 py-0.5 rounded">
                  application/json
                </code>
              </li>
              <li>
                <strong>Secret:</strong> Leave empty (optional - for HMAC
                validation)
              </li>
              <li>
                <strong>SSL verification:</strong> Keep enabled (recommended)
              </li>
              <li>
                <strong>Which events:</strong> Select{" "}
                <code className="bg-background px-1 py-0.5 rounded">
                  Let me select individual events
                </code>{" "}
                and check the events you configured above (or select{" "}
                <code className="bg-background px-1 py-0.5 rounded">
                  Send me everything
                </code>
                )
              </li>
              <li>
                <strong>Active:</strong> Keep checked (enabled)
              </li>
              <li>
                Click <strong>&quot;Add webhook&quot;</strong>
              </li>
            </ol>
          </div>

          {/* Available Variables */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium text-sm">Available variables</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {`{{${watchedVariableName || "github"}.event}}`}
                </code>{" "}
                - Event type (push, pull_request, etc.)
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {`{{${watchedVariableName || "github"}.action}}`}
                </code>{" "}
                - Action (opened, closed, created, etc.)
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {`{{${watchedVariableName || "github"}.repository.name}}`}
                </code>{" "}
                - Repository name
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {`{{${watchedVariableName || "github"}.sender.login}}`}
                </code>{" "}
                - User who triggered the event
              </li>
              <li>
                <code className="bg-background px-1 py-0.5 rounded">
                  {`{{json ${watchedVariableName || "github"}}}`}
                </code>{" "}
                - Full event data as JSON
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
