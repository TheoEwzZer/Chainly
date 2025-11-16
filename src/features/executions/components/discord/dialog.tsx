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
  FieldContent,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactElement } from "react";
import z from "zod";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import Image from "next/image";
import Link from "next/link";
import { KeyIcon } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const formSchema = z
  .object({
    variableName: z
      .string()
      .min(1, "Variable name is required")
      .regex(
        /^[A-Za-z_$][A-Za-z0-9_$]*$/,
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
      ),
    mode: z.enum(["webhook", "bot"]),
    username: z.string().optional(),
    content: z
      .string()
      .min(1, "Message content is required")
      .max(2000, "Message content must be less than 2000 characters"),
    webhookUrl: z.string().optional(),
    credentialId: z.string().optional(),
    userId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.mode === "webhook") {
        return !!data.webhookUrl;
      }
      return true;
    },
    {
      message: "Webhook URL is required for webhook mode",
      path: ["webhookUrl"],
    }
  )
  .refine(
    (data) => {
      if (data.mode === "bot") {
        return !!data.credentialId;
      }
      return true;
    },
    {
      message: "Bot token credential is required for bot mode",
      path: ["credentialId"],
    }
  )
  .refine(
    (data) => {
      if (data.mode === "bot") {
        return !!data.userId;
      }
      return true;
    },
    {
      message: "Discord user ID is required for bot mode",
      path: ["userId"],
    }
  );

export type DiscordFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<DiscordFormValues>;
}

export const DiscordDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const {
    data: credentials,
    isLoading: isLoadingCredentials,
    isPending: isPendingCredentials,
  } = useCredentialsByType("DISCORD");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      mode: (defaultValues.mode as "webhook" | "bot") || "webhook",
      username: defaultValues.username || "",
      content: defaultValues.content || "",
      webhookUrl: defaultValues.webhookUrl || "",
      credentialId: defaultValues.credentialId || "",
      userId: defaultValues.userId || "",
    },
  });

  const watchMode = useWatch({
    control: form.control,
    name: "mode",
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        mode: (defaultValues.mode as "webhook" | "bot") || "webhook",
        username: defaultValues.username || "",
        content: defaultValues.content || "",
        webhookUrl: defaultValues.webhookUrl || "",
        credentialId: defaultValues.credentialId || "",
        userId: defaultValues.userId || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discord</DialogTitle>
          <DialogDescription>
            Configure the Discord message for this node. Choose between webhook
            or bot mode.
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
                  {`{{${watchVariableName || "discordResponse"}.message}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="discordResponse"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="mode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation="vertical" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldLabel htmlFor="discord-mode">Mode</FieldLabel>
                  <FieldDescription>
                    Choose between webhook (channel messages) or bot (direct
                    messages)
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldContent>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="discord-mode"
                    aria-invalid={fieldState.invalid}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webhook">Webhook (Channel)</SelectItem>
                    <SelectItem value="bot">Bot (Direct Message)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          {watchMode === "webhook" && (
            <Controller
              name="webhookUrl"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Webhook URL</FieldLabel>
                  <FieldDescription>
                    Get this from Discord: Channel Settings &gt; Integrations
                    &gt; Webhooks
                  </FieldDescription>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="https://discord.com/api/webhooks/..."
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}
          {watchMode === "bot" && (
            <>
              <Accordion
                type="single"
                collapsible
                defaultValue={
                  !credentials || credentials.length === 0
                    ? "instructions"
                    : undefined
                }
                className="w-full"
              >
                <AccordionItem
                  value="instructions"
                  className="border rounded-md last:border-b"
                >
                  <AccordionTrigger className="px-4">
                    <span className="text-sm font-medium">
                      How to create a Discord bot and get its token
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <p className="font-medium">
                          Step 1: Create a Discord Application
                        </p>
                        <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                          <li>
                            Go to the{" "}
                            <Link
                              href="https://discord.com/developers/applications"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Discord Developer Portal
                            </Link>
                          </li>
                          <li>Click on &quot;New Application&quot;</li>
                          <li>
                            Give your application a name and click
                            &quot;Create&quot;
                          </li>
                        </ol>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium">Step 2: Create a Bot</p>
                        <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                          <li>
                            Go to the &quot;Bot&quot; section in the left
                            sidebar
                          </li>
                          <li>Click &quot;Add Bot&quot; and confirm</li>
                          <li>
                            Under &quot;Token&quot;, click &quot;Reset
                            Token&quot; or &quot;Copy&quot; to get your bot
                            token
                          </li>
                          <li>
                            <strong className="text-foreground">
                              Save this token securely - you&apos;ll need it for
                              the credential
                            </strong>
                          </li>
                        </ol>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium">
                          Step 3: Enable Required Permissions
                        </p>
                        <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                          <li>
                            In the &quot;Bot&quot; section, scroll down to
                            &quot;Privileged Gateway Intents&quot;
                          </li>
                          <li>
                            Enable &quot;MESSAGE CONTENT INTENT&quot; (required
                            for sending messages)
                          </li>
                        </ol>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium">
                          Step 4: Add the Bot Token as a Credential
                        </p>
                        <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                          <li>
                            Go to the{" "}
                            <Link
                              href="/credentials"
                              target="_blank"
                              className="text-primary hover:underline"
                            >
                              Credentials
                            </Link>{" "}
                            page
                          </li>
                          <li>Click &quot;Create Credential&quot;</li>
                          <li>Select &quot;DISCORD&quot; as the type</li>
                          <li>Paste your bot token as the value</li>
                          <li>Save the credential</li>
                        </ol>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium">
                          Step 5: Get the Discord User ID
                        </p>
                        <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                          <li>
                            Enable Developer Mode in Discord: Settings →
                            Advanced → Developer Mode
                          </li>
                          <li>
                            Right-click on the user you want to message and
                            select &quot;Copy User ID&quot;
                          </li>
                          <li>
                            Paste the ID in the &quot;Discord User ID&quot;
                            field below
                          </li>
                        </ol>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Controller
                name="credentialId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    orientation="vertical"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldContent>
                      <FieldLabel htmlFor="discord-credential">
                        Bot Token
                      </FieldLabel>
                      <FieldDescription>
                        {!credentials?.length && (
                          <>
                            No bot tokens available.{" "}
                            <Link
                              href="/credentials"
                              className="text-primary hover:underline"
                              target="_blank"
                            >
                              Create one in Credentials
                            </Link>
                          </>
                        )}
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldContent>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={
                        isLoadingCredentials ||
                        isPendingCredentials ||
                        !credentials ||
                        credentials.length === 0
                      }
                    >
                      <SelectTrigger
                        id="discord-credential"
                        aria-invalid={fieldState.invalid}
                        className="w-full"
                      >
                        <SelectValue placeholder="Select bot token" />
                      </SelectTrigger>
                      <SelectContent>
                        {credentials?.map((credential) => (
                          <SelectItem key={credential.id} value={credential.id}>
                            <Image
                              src={"/logos/discord.svg"}
                              alt={credential.name}
                              width={16}
                              height={16}
                            />
                            {credential.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              {(!credentials || credentials.length === 0) && (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <KeyIcon />
                    </EmptyMedia>
                    <EmptyTitle>Bot Token Required</EmptyTitle>
                    <EmptyDescription>
                      You need to add a Discord bot token before configuring
                      this node. Create one in the{" "}
                      <Link href="/credentials" target="_blank">
                        Credentials
                      </Link>{" "}
                      page to get started.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Link href="/credentials" target="_blank">
                      <Button type="button" variant="default">
                        Go to Credentials
                      </Button>
                    </Link>
                  </EmptyContent>
                </Empty>
              )}
              <Controller
                name="userId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Discord User ID
                    </FieldLabel>
                    <FieldDescription>
                      The Discord user ID to send a direct message to. Use{" "}
                      {"{{variables}}"} to reference values from previous nodes.
                    </FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="123456789012345678"
                      aria-invalid={fieldState.invalid}
                      className="font-mono"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </>
          )}
          {watchMode === "webhook" && (
            <Controller
              name="username"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Username (Optional)
                  </FieldLabel>
                  <FieldDescription>
                    Override the default webhook username. Use {"{{variables}}"}{" "}
                    to reference values from previous nodes.
                  </FieldDescription>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Custom Bot Name"
                    aria-invalid={fieldState.invalid}
                    className="font-mono"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}
          <Controller
            name="content"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Message Content</FieldLabel>
                <FieldDescription>
                  The message content to send. Use {"{{variables}}"} for simple
                  values or {"{{json variable}}"} to stringify objects.
                </FieldDescription>
                <Textarea
                  {...field}
                  id={field.name}
                  placeholder="Hello! The result is: {{myGemini.text}}"
                  aria-invalid={fieldState.invalid}
                  className="min-h-[95] font-mono"
                  maxLength={2000}
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
            <Button
              type="submit"
              disabled={
                watchMode === "bot" &&
                (!credentials || credentials.length === 0)
              }
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
