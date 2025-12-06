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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactElement } from "react";
import z from "zod";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import Image from "next/image";
import Link from "next/link";
import { KeyIcon, Mail, Calendar, Filter, Settings } from "lucide-react";
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
  credentialId: z.string().min(1, "Credential is required"),

  // Date filters
  dateFilter: z.enum([
    "today",
    "yesterday",
    "this_week",
    "this_month",
    "specific_date",
    "date_range",
    "all",
  ]),
  specificDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),

  // Status filters
  readStatus: z.enum(["all", "unread", "read"]),
  starred: z.boolean(),
  important: z.boolean(),

  // Location filters
  mailbox: z.enum(["inbox", "sent", "drafts", "all"]),

  // Advanced filters
  from: z.string().optional(),
  to: z.string().optional(),
  subject: z.string().optional(),
  hasAttachment: z.boolean(),
  label: z.string().optional(),

  // Options
  maxResults: z.number().min(1).max(500),
  includeSpamTrash: z.boolean(),

  // Content
  fetchBody: z.enum(["metadata", "full"]),
});

export type GmailFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GmailFormValues) => void;
  defaultValues?: Partial<GmailFormValues>;
}

export const GmailDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const {
    data: credentials,
    isLoading: isLoadingCredentials,
    isPending: isPendingCredentials,
  } = useCredentialsByType("GMAIL");
  const [isConnecting, setIsConnecting] = useState(false);

  const form = useForm<GmailFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      dateFilter: defaultValues.dateFilter || "today",
      specificDate: defaultValues.specificDate || "",
      startDate: defaultValues.startDate || "",
      endDate: defaultValues.endDate || "",
      readStatus: defaultValues.readStatus || "all",
      starred: defaultValues.starred || false,
      important: defaultValues.important || false,
      mailbox: defaultValues.mailbox || "inbox",
      from: defaultValues.from || "",
      to: defaultValues.to || "",
      subject: defaultValues.subject || "",
      hasAttachment: defaultValues.hasAttachment || false,
      label: defaultValues.label || "",
      maxResults: defaultValues.maxResults || 50,
      includeSpamTrash: defaultValues.includeSpamTrash || false,
      fetchBody: defaultValues.fetchBody || "metadata",
    },
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || credentials?.[0]?.id || "",
        dateFilter: defaultValues.dateFilter || "today",
        specificDate: defaultValues.specificDate || "",
        startDate: defaultValues.startDate || "",
        endDate: defaultValues.endDate || "",
        readStatus: defaultValues.readStatus || "all",
        starred: defaultValues.starred || false,
        important: defaultValues.important || false,
        mailbox: defaultValues.mailbox || "inbox",
        from: defaultValues.from || "",
        to: defaultValues.to || "",
        subject: defaultValues.subject || "",
        hasAttachment: defaultValues.hasAttachment || false,
        label: defaultValues.label || "",
        maxResults: defaultValues.maxResults || 50,
        includeSpamTrash: defaultValues.includeSpamTrash || false,
        fetchBody: defaultValues.fetchBody || "metadata",
      });
    }
  }, [open, defaultValues, form, credentials]);

  const watchVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
  });

  const watchDateFilter = useWatch({
    control: form.control,
    name: "dateFilter",
  });

  const handleSubmit = (values: GmailFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const handleConnectGmail = async (): Promise<void> => {
    try {
      setIsConnecting(true);
      const response = await fetch(
        `/api/oauth/gmail?credentialId=${defaultValues.credentialId || ""}`
      );
      const data = await response.json();

      if (data.authUrl) {
        globalThis.location.href = data.authUrl;
      } else {
        throw new Error("Failed to get OAuth URL");
      }
    } catch (error) {
      console.error("Error connecting Gmail:", error);
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail
          </DialogTitle>
          <DialogDescription>
            Fetch emails from your Gmail account with advanced filters.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 mt-4"
        >
          {/* Connect Gmail Section */}
          {(!credentials || credentials.length === 0) && (
            <div className="border rounded-md p-4 space-y-4">
              <div className="space-y-2">
                <p className="font-medium">Connect your Gmail</p>
                <p className="text-sm text-muted-foreground">
                  Click the button below to connect your Gmail account.
                  You&apos;ll be redirected to Google to authorize read-only
                  access to your emails.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleConnectGmail}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>Connecting...</>
                ) : (
                  <>
                    <Image
                      src="/logos/gmail.svg"
                      alt="Gmail"
                      width={16}
                      height={16}
                      className="mr-2"
                    />
                    Connect with Gmail
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Variable Name */}
          {credentials && credentials.length > 0 && (
            <Controller
              name="variableName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Variable Name</FieldLabel>
                  <FieldDescription>
                    Use this name to reference the result in other nodes:{" "}
                    {`{{${watchVariableName || "gmailEmails"}.emails}}`},{" "}
                    {`{{${watchVariableName || "gmailEmails"}.count}}`}
                  </FieldDescription>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="gmailEmails"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}

          {/* Credential Selector */}
          <Controller
            name="credentialId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation="vertical" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldLabel htmlFor="gmail-credential">
                    Gmail Account
                  </FieldLabel>
                  <FieldDescription>
                    {!credentials?.length && (
                      <>
                        No Gmail accounts connected.{" "}
                        <Link href="/credentials" target="_blank">
                          Connect one in Credentials
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
                    id="gmail-credential"
                    aria-invalid={fieldState.invalid}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select Gmail account" />
                  </SelectTrigger>
                  <SelectContent>
                    {credentials?.map((credential) => (
                      <SelectItem key={credential.id} value={credential.id}>
                        <Image
                          src={"/logos/gmail.svg"}
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

          {/* Empty State */}
          {(!credentials || credentials.length === 0) && (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <KeyIcon />
                </EmptyMedia>
                <EmptyTitle>Gmail Connection Required</EmptyTitle>
                <EmptyDescription>
                  You need to connect a Gmail account before configuring this
                  node.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleConnectGmail}
                  disabled={isConnecting}
                >
                  {isConnecting ? "Connecting..." : "Connect Gmail"}
                </Button>
              </EmptyContent>
            </Empty>
          )}

          {/* Main Configuration - Only show when credentials exist */}
          {credentials && credentials.length > 0 && (
            <>
              <Separator />

              {/* Date Filter Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">Date Filter</h4>
                </div>
                <Controller
                  name="dateFilter"
                  control={form.control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-2 gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="today" id="date-today" />
                        <Label htmlFor="date-today">Today</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yesterday" id="date-yesterday" />
                        <Label htmlFor="date-yesterday">Yesterday</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="this_week" id="date-week" />
                        <Label htmlFor="date-week">This Week</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="this_month" id="date-month" />
                        <Label htmlFor="date-month">This Month</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="specific_date"
                          id="date-specific"
                        />
                        <Label htmlFor="date-specific">Specific Date</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="date_range" id="date-range" />
                        <Label htmlFor="date-range">Date Range</Label>
                      </div>
                      <div className="flex items-center space-x-2 col-span-2">
                        <RadioGroupItem value="all" id="date-all" />
                        <Label htmlFor="date-all">All Time</Label>
                      </div>
                    </RadioGroup>
                  )}
                />

                {/* Specific Date Input */}
                {watchDateFilter === "specific_date" && (
                  <Controller
                    name="specificDate"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Date</FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          type="date"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                )}

                {/* Date Range Inputs */}
                {watchDateFilter === "date_range" && (
                  <div className="grid grid-cols-2 gap-4">
                    <Controller
                      name="startDate"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Start Date
                          </FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            type="date"
                            aria-invalid={fieldState.invalid}
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      name="endDate"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>End Date</FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            type="date"
                            aria-invalid={fieldState.invalid}
                          />
                        </Field>
                      )}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Mailbox Filter */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">Mailbox</h4>
                </div>
                <Controller
                  name="mailbox"
                  control={form.control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-4 gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="inbox" id="mailbox-inbox" />
                        <Label htmlFor="mailbox-inbox">Inbox</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sent" id="mailbox-sent" />
                        <Label htmlFor="mailbox-sent">Sent</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="drafts" id="mailbox-drafts" />
                        <Label htmlFor="mailbox-drafts">Drafts</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="mailbox-all" />
                        <Label htmlFor="mailbox-all">All Mail</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>

              <Separator />

              {/* Read Status */}
              <div className="space-y-4">
                <h4 className="font-medium">Read Status</h4>
                <Controller
                  name="readStatus"
                  control={form.control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-3 gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="read-all" />
                        <Label htmlFor="read-all">All</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unread" id="read-unread" />
                        <Label htmlFor="read-unread">Unread Only</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="read" id="read-read" />
                        <Label htmlFor="read-read">Read Only</Label>
                      </div>
                    </RadioGroup>
                  )}
                />

                {/* Additional Status Filters */}
                <div className="flex flex-wrap gap-4">
                  <Controller
                    name="starred"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="starred"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="starred">Starred only</Label>
                      </div>
                    )}
                  />
                  <Controller
                    name="important"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="important"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="important">Important only</Label>
                      </div>
                    )}
                  />
                  <Controller
                    name="hasAttachment"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasAttachment"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="hasAttachment">Has attachment</Label>
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Advanced Filters - Collapsible */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Advanced Filters
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <Controller
                      name="from"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>From</FieldLabel>
                          <FieldDescription>
                            Filter by sender email. Supports {"{{variables}}"}
                          </FieldDescription>
                          <Input
                            {...field}
                            id={field.name}
                            placeholder="sender@example.com"
                            className="font-mono"
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      name="to"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>To</FieldLabel>
                          <FieldDescription>
                            Filter by recipient email. Supports {"{{variables}}"}
                          </FieldDescription>
                          <Input
                            {...field}
                            id={field.name}
                            placeholder="recipient@example.com"
                            className="font-mono"
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      name="subject"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>
                            Subject Contains
                          </FieldLabel>
                          <FieldDescription>
                            Filter emails where subject contains these words
                          </FieldDescription>
                          <Input
                            {...field}
                            id={field.name}
                            placeholder="important meeting"
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      name="label"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>Label</FieldLabel>
                          <FieldDescription>
                            Filter by Gmail label name
                          </FieldDescription>
                          <Input
                            {...field}
                            id={field.name}
                            placeholder="work"
                          />
                        </Field>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="options">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Options
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <Controller
                      name="fetchBody"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Content to Fetch</FieldLabel>
                          <FieldDescription>
                            Metadata is faster. Full content includes email body
                            (slower).
                          </FieldDescription>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="grid grid-cols-2 gap-2 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="metadata"
                                id="fetch-metadata"
                              />
                              <Label htmlFor="fetch-metadata">
                                Metadata only (fast)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="full" id="fetch-full" />
                              <Label htmlFor="fetch-full">
                                Full content (slower)
                              </Label>
                            </div>
                          </RadioGroup>
                        </Field>
                      )}
                    />
                    <Controller
                      name="maxResults"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>
                            Max Results
                          </FieldLabel>
                          <FieldDescription>
                            Maximum number of emails to fetch (1-500)
                          </FieldDescription>
                          <Input
                            {...field}
                            id={field.name}
                            type="number"
                            min={1}
                            max={500}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 50)
                            }
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                    <Controller
                      name="includeSpamTrash"
                      control={form.control}
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="includeSpamTrash"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <Label htmlFor="includeSpamTrash">
                            Include spam and trash
                          </Label>
                        </div>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          )}

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
