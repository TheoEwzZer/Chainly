"use client";

import { CredentialType } from "@/generated/prisma/enums";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import {
  useCreateCredential,
  useSuspenseCredential,
  useUpdateCredential,
} from "../hooks/use-credentials";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import Image from "next/image";
import Link from "next/link";
import { ReactElement } from "react";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.string().min(1, "Value is required"),
  type: z.enum(CredentialType),
});

export type CredentialFormValues = z.infer<typeof formSchema>;

const credentialTypeOptions = [
  { label: "OpenAI", value: CredentialType.OPENAI, logo: "/logos/openai.svg" },
  {
    label: "Anthropic",
    value: CredentialType.ANTHROPIC,
    logo: "/logos/anthropic.svg",
  },
  { label: "Gemini", value: CredentialType.GEMINI, logo: "/logos/gemini.svg" },
  {
    label: "Discord",
    value: CredentialType.DISCORD,
    logo: "/logos/discord.svg",
  },
  {
    label: "Google Calendar",
    value: CredentialType.GOOGLE_CALENDAR,
    logo: "/logos/google-calendar.svg",
  },
  {
    label: "Resend",
    value: CredentialType.RESEND,
    logo: "/logos/resend.svg",
  },
];

interface CredentialFormProps {
  initialData?: {
    id?: string;
    name: string;
    value: string;
    type: CredentialType;
  };
}

export const CredentialForm = ({ initialData }: CredentialFormProps) => {
  const router: AppRouterInstance = useRouter();
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();

  const isEdit: boolean = Boolean(initialData?.id);

  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      value: "",
      type: CredentialType.OPENAI,
    },
  });

  const handleSubmit = async (values: CredentialFormValues) => {
    if (isEdit && initialData?.id) {
      await updateCredential.mutateAsync({
        id: initialData.id,
        ...values,
      });
    } else {
      await createCredential.mutateAsync(values, {
        onSuccess: (data: Credential): void => {
          router.push(`/credentials/${data.id}`);
        },
        onError: (error) => {
          toast.error(`Failed to create credential: ${error.message}`);
        },
      });
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>
          {isEdit ? "Edit Credential" : "Create Credential"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <FieldDescription>
                  A descriptive name for this credential
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="My API Key Name"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="type"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation="vertical" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldLabel htmlFor="credential-type">Type</FieldLabel>
                  <FieldDescription>
                    Select the service provider for this credential
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
                    id="credential-type"
                    aria-invalid={fieldState.invalid}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {credentialTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Image
                            src={option.logo}
                            alt={option.label}
                            width={16}
                            height={16}
                          />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <Controller
            name="value"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>API Key</FieldLabel>
                <FieldDescription>
                  The API key or token for authentication
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  type="password"
                  placeholder="sk-..."
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              asChild
              disabled={
                createCredential.isPending || updateCredential.isPending
              }
            >
              <Link href="/credentials">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={
                createCredential.isPending || updateCredential.isPending
              }
            >
              {isEdit ? "Update" : "Create"} Credential
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export const CredentialView = ({
  credentialId,
}: {
  credentialId: string;
}): ReactElement => {
  const { data: credential } = useSuspenseCredential(credentialId);

  return <CredentialForm initialData={credential} />;
};
