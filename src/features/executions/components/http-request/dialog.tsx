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
import { HTTPRequestMethodEnum } from "./constants";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .max(30, "Variable name must be less than 30 characters")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    ),
  endpoint: z.url({ message: "Please enter a valid URL" }),
  method: z.enum(HTTPRequestMethodEnum),
  body: z.string().optional(),
});

export type HttpRequestFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<HttpRequestFormValues>;
}

export const HttpRequestDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      endpoint: defaultValues.endpoint || "",
      method: defaultValues.method || HTTPRequestMethodEnum.GET,
      body: defaultValues.body || "",
    },
  });

  useEffect((): void => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        endpoint: defaultValues.endpoint || "",
        method: defaultValues.method || HTTPRequestMethodEnum.GET,
        body: defaultValues.body || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchMethod: HTTPRequestMethodEnum = useWatch({
    control: form.control,
    name: "method",
  });
  const watchVariableName: string = useWatch({
    control: form.control,
    name: "variableName",
  });
  const showBodyField: boolean = [
    HTTPRequestMethodEnum.POST,
    HTTPRequestMethodEnum.PUT,
    HTTPRequestMethodEnum.PATCH,
  ].includes(watchMethod);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>HTTP Request</DialogTitle>
          <DialogDescription>
            Configure settings for the HTTP request node.
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
                  {`{{${watchVariableName || "myApiCall"}.httpResponse.data}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="myApiCall"
                  aria-invalid={fieldState.invalid}
                  maxLength={30}
                  minLength={1}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="method"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation="vertical" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FieldLabel htmlFor="http-request-method">Method</FieldLabel>
                  <FieldDescription>
                    Select the HTTP method for the request.
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
                    id="http-request-method"
                    aria-invalid={fieldState.invalid}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectItem value={HTTPRequestMethodEnum.GET}>
                      {HTTPRequestMethodEnum.GET}
                    </SelectItem>
                    <SelectItem value={HTTPRequestMethodEnum.POST}>
                      {HTTPRequestMethodEnum.POST}
                    </SelectItem>
                    <SelectItem value={HTTPRequestMethodEnum.PUT}>
                      {HTTPRequestMethodEnum.PUT}
                    </SelectItem>
                    <SelectItem value={HTTPRequestMethodEnum.PATCH}>
                      {HTTPRequestMethodEnum.PATCH}
                    </SelectItem>
                    <SelectItem value={HTTPRequestMethodEnum.DELETE}>
                      {HTTPRequestMethodEnum.DELETE}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            name="endpoint"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Endpoint URL</FieldLabel>
                <FieldDescription>
                  Static URL or use {"{{variables}}"} for simple values or{" "}
                  {"{{json variable}}"} to stringify objects
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  type="url"
                  placeholder="https://api.example.com/users/{{httpResponse.data.id}}"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          {showBodyField && (
            <Controller
              name="body"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Request Body</FieldLabel>
                  <FieldDescription>
                    JSON with template variables. Use {"{{variables}}"} for
                    simple values or {"{{json variable}}"} to stringify objects
                  </FieldDescription>
                  <Textarea
                    {...field}
                    id={field.name}
                    placeholder={`{\n  "userId": "{{httpResponse.data.id}}",\n  "name": "{{httpResponse.data.name}}",\n  "items": "{{httpResponse.data.items}}"\n}`}
                    aria-invalid={fieldState.invalid}
                    className="min-h-[120px] font-mono"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={(): void => onOpenChange(false)}
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
