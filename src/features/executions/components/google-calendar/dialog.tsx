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

  const form = useForm<GoogleCalendarFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      calendarId: defaultValues.calendarId || "primary",
      date: defaultValues.date || "",
    },
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || credentials?.[0]?.id || "",
        calendarId: defaultValues.calendarId || "primary",
        date: defaultValues.date || "",
      });
    }
  }, [open, defaultValues, form, credentials]);

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
