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

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    ),
  credentialId: z.string().min(1, "Resend API key is required"),
  from: z.string().min(1, "From address is required"),
  to: z.string().min(1, "To address is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  isHtml: z.boolean(),
});

export type EmailFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EmailFormValues) => void;
  defaultValues?: Partial<EmailFormValues>;
}

export const EmailDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const {
    data: credentials,
    isLoading: isLoadingCredentials,
    isPending: isPendingCredentials,
  } = useCredentialsByType("RESEND");

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      from: defaultValues.from || "",
      to: defaultValues.to || "",
      subject: defaultValues.subject || "",
      body: defaultValues.body || "",
      isHtml: defaultValues.isHtml ?? false,
    },
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        from: defaultValues.from || "",
        to: defaultValues.to || "",
        subject: defaultValues.subject || "",
        body: defaultValues.body || "",
        isHtml: defaultValues.isHtml ?? false,
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
  });

  const watchIsHtml: boolean = useWatch({
    control: form.control,
    name: "isHtml",
  });

  const handleSubmit = (values: EmailFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email</DialogTitle>
          <DialogDescription>
            Configure the email settings for this node. Emails are sent using
            Resend.
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
                  {`{{${watchVariableName || "emailResponse"}.id}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="emailResponse"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

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
                  How to get a Resend API key
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <p className="font-medium">
                      Step 1: Create a Resend Account
                    </p>
                    <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                      <li>
                        Go to{" "}
                        <Link
                          href="https://resend.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          resend.com
                        </Link>
                      </li>
                      <li>Sign up for a free account</li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Step 2: Get your API Key</p>
                    <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                      <li>Go to the API Keys section in your dashboard</li>
                      <li>Click &quot;Create API Key&quot;</li>
                      <li>Give it a name and select permissions</li>
                      <li>
                        <strong className="text-foreground">
                          Copy the API key - you&apos;ll only see it once!
                        </strong>
                      </li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">
                      Step 3: Add a Domain (Optional)
                    </p>
                    <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                      <li>
                        For production, add and verify your domain in Resend
                      </li>
                      <li>
                        For testing, you can use onboarding@resend.dev as the
                        &quot;from&quot; address
                      </li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">
                      Step 4: Add the API Key as a Credential
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
                      <li>Select &quot;RESEND&quot; as the type</li>
                      <li>Paste your API key as the value</li>
                      <li>Save the credential</li>
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
              <Field orientation="vertical" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldLabel htmlFor="email-credential">
                    Resend API Key
                  </FieldLabel>
                  <FieldDescription>
                    {!credentials?.length && (
                      <>
                        No API keys available.{" "}
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
                    id="email-credential"
                    aria-invalid={fieldState.invalid}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select API key" />
                  </SelectTrigger>
                  <SelectContent>
                    {credentials?.map((credential) => (
                      <SelectItem key={credential.id} value={credential.id}>
                        <Image
                          src={"/logos/resend.svg"}
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
                <EmptyTitle>Resend API Key Required</EmptyTitle>
                <EmptyDescription>
                  You need to add a Resend API key before configuring this node.
                  Create one in the{" "}
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
            name="from"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>From</FieldLabel>
                <FieldDescription>
                  The sender email address. Use your verified domain or
                  onboarding@resend.dev for testing. Supports {"{{variables}}"}.
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="Your Name <you@yourdomain.com>"
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
            name="to"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>To</FieldLabel>
                <FieldDescription>
                  The recipient email address. Separate multiple addresses with
                  commas. Use {"{{variables}}"} to reference values from
                  previous nodes.
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="recipient@example.com"
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
            name="subject"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Subject</FieldLabel>
                <FieldDescription>
                  The email subject line. Use {"{{variables}}"} to include
                  dynamic content.
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="Hello from Chainly!"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="isHtml"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation="vertical" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldLabel htmlFor="email-format">Email Format</FieldLabel>
                  <FieldDescription>
                    Choose between plain text or HTML for the email body
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldContent>
                <Select
                  name={field.name}
                  value={field.value ? "html" : "text"}
                  onValueChange={(value) => field.onChange(value === "html")}
                >
                  <SelectTrigger
                    id="email-format"
                    aria-invalid={fieldState.invalid}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Plain Text</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <Controller
            name="body"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  {watchIsHtml ? "HTML Body" : "Email Body"}
                </FieldLabel>
                <FieldDescription>
                  {watchIsHtml
                    ? "Write your HTML email content. Use {{variables}} for dynamic values."
                    : "Write your plain text email content. Use {{variables}} for dynamic values."}
                </FieldDescription>
                <Textarea
                  {...field}
                  id={field.name}
                  placeholder={
                    watchIsHtml
                      ? "<h1>Hello {{name}}!</h1>\n<p>Your order #{{orderId}} has been confirmed.</p>"
                      : "Hello {{name}}!\n\nYour order #{{orderId}} has been confirmed."
                  }
                  aria-invalid={fieldState.invalid}
                  className="min-h-[150px] font-mono"
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
              disabled={!credentials || credentials.length === 0}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
