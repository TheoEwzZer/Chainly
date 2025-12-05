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
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactElement } from "react";
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

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (CET/CEST)" },
  { value: "Europe/Rome", label: "Europe/Rome (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam (CET/CEST)" },
  { value: "Europe/Brussels", label: "Europe/Brussels (CET/CEST)" },
  { value: "Europe/Zurich", label: "Europe/Zurich (CET/CEST)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (MSK)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Denver", label: "America/Denver (MST/MDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "America/Toronto", label: "America/Toronto (EST/EDT)" },
  { value: "America/Vancouver", label: "America/Vancouver (PST/PDT)" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo (BRT)" },
  { value: "America/Mexico_City", label: "America/Mexico_City (CST/CDT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong (HKT)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Seoul", label: "Asia/Seoul (KST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST/NZDT)" },
] as const;

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    ),
  credentialId: z.string().min(1, "Credential is required"),
  calendarId: z.string().optional(),
  date: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required"),
});

export type GoogleCalendarFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleCalendarFormValues) => void;
  defaultValues?: Partial<GoogleCalendarFormValues>;
}

export const GoogleCalendarDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const {
    data: credentials,
    isLoading: isLoadingCredentials,
    isPending: isPendingCredentials,
  } = useCredentialsByType("GOOGLE_CALENDAR");
  const [isConnecting, setIsConnecting] = useState(false);
  const browserTimezone: string = getBrowserTimezone();

  const form = useForm<GoogleCalendarFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      calendarId: defaultValues.calendarId || "primary",
      date: defaultValues.date || "",
      timezone: defaultValues.timezone || browserTimezone,
    },
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || credentials?.[0]?.id || "",
        calendarId: defaultValues.calendarId || "primary",
        date: defaultValues.date || "",
        timezone: defaultValues.timezone || browserTimezone,
      });
    }
  }, [open, defaultValues, form, credentials, browserTimezone]);

  const watchVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
  });

  const handleSubmit = (values: GoogleCalendarFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const handleConnectGoogle = async (): Promise<void> => {
    try {
      setIsConnecting(true);
      const response = await fetch(
        `/api/oauth/google-calendar?credentialId=${
          defaultValues.credentialId || ""
        }`
      );
      const data = await response.json();

      if (data.authUrl) {
        globalThis.location.href = data.authUrl;
      } else {
        throw new Error("Failed to get OAuth URL");
      }
    } catch (error) {
      console.error("Error connecting Google Calendar:", error);
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Google Calendar</DialogTitle>
          <DialogDescription>
            Configure Google Calendar to fetch events for a specific date.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-8 mt-4"
        >
          {credentials && credentials.length > 0 && (
            <Controller
              name="variableName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Variable Name</FieldLabel>
                  <FieldDescription>
                    Use this name to reference the result in other nodes:{" "}
                    {`{{${watchVariableName || "calendarEvents"}.events}}`}
                  </FieldDescription>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="calendarEvents"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}
          {(!credentials || credentials.length === 0) && (
            <div className="border rounded-md p-4 space-y-4">
              <div className="space-y-2">
                <p className="font-medium">Connect your Google Calendar</p>
                <p className="text-sm text-muted-foreground">
                  Click the button below to connect your Google Calendar
                  account. You&apos;ll be redirected to Google to authorize
                  access to your calendar. The connection will be saved
                  automatically and tokens will be refreshed automatically when
                  needed.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>Connecting...</>
                ) : (
                  <>
                    <Image
                      src="/logos/google-calendar.svg"
                      alt="Google Calendar"
                      width={16}
                      height={16}
                      className="mr-2"
                    />
                    Connect with Google Calendar
                  </>
                )}
              </Button>
            </div>
          )}
          <Controller
            name="credentialId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation="vertical" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldLabel htmlFor="google-calendar-credential">
                    Access Token
                  </FieldLabel>
                  <FieldDescription>
                    {!credentials?.length && (
                      <>
                        No access tokens available.{" "}
                        <Link href="/credentials" target="_blank">
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
                    id="google-calendar-credential"
                    aria-invalid={fieldState.invalid}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select access token" />
                  </SelectTrigger>
                  <SelectContent>
                    {credentials?.map((credential) => (
                      <SelectItem key={credential.id} value={credential.id}>
                        <Image
                          src={"/logos/google-calendar.svg"}
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
                <EmptyTitle>Access Token Required</EmptyTitle>
                <EmptyDescription>
                  You need to add a Google Calendar access token before
                  configuring this node. Create one in the{" "}
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
          {credentials && credentials.length > 0 && (
            <>
              <Controller
                name="calendarId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Calendar ID</FieldLabel>
                    <FieldDescription>
                      The calendar ID to fetch events from. Use
                      &quot;primary&quot; for your primary calendar. Use{" "}
                      {"{{variables}}"} to reference values from previous nodes.
                    </FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="primary"
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
                name="date"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Date (Optional)
                    </FieldLabel>
                    <FieldDescription>
                      The date to fetch events for (YYYY-MM-DD format). Leave
                      empty to use today&apos;s date. Use {"{{variables}}"} to
                      reference values from previous nodes.
                    </FieldDescription>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="2024-01-15"
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
                name="timezone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Timezone</FieldLabel>
                    <FieldDescription>
                      Select the timezone to determine &quot;today&quot; and
                      event times. Your detected timezone is: {browserTimezone}
                    </FieldDescription>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                        {!TIMEZONE_OPTIONS.some(
                          (tz) => tz.value === browserTimezone
                        ) && (
                          <SelectItem value={browserTimezone}>
                            {browserTimezone} (Your timezone)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
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
