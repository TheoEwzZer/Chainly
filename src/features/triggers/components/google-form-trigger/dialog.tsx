"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { generateGoogleFormScript } from "./utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId?: string;
}

export const GoogleFormTriggerDialog = ({ open, onOpenChange, nodeId }: Props) => {
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

  const baseUrl: string =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl: string = nodeId
    ? `${baseUrl}/api/webhooks/google-form?workflowId=${workflowId}&nodeId=${nodeId}`
    : `${baseUrl}/api/webhooks/google-form?workflowId=${workflowId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Google Form Trigger Configuration</DialogTitle>
          <DialogDescription>
            Use this script in your Google Form&apos;s Apps Script to trigger
            this flow when a form is submitted.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="font-medium text-sm">Setup instructions</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Open your Google Form</li>
            <li>Click on the three dots menu &gt; Apps Script</li>
            <li>Copy and paste the script below</li>
            <li>Save and click Triggers &gt; Add Trigger</li>
            <li>Choose: From from &gt; On form submit &gt; Save</li>
          </ol>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-3">
          <h4 className="font-medium text-sm">Google Apps Script</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={(): void =>
              copyScriptToClipboard(generateGoogleFormScript(webhookUrl))
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
          <p className="text-xs text-muted-foreground">
            This script include your webhook URL and handles form submissions
          </p>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="font-medium text-sm">Available variables</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              <code className="bg-background px-1 py-0.5 rounded">
                {"{{googleForm.respondentEmail}}"}
              </code>
              - Respondent&apos;s email
            </li>
            <li>
              <code className="bg-background px-1 py-0.5 rounded">
                {"{{googleForm.responses['Question Name']}}"}
              </code>
              - Specific answer
            </li>
            <li>
              <code className="bg-background px-1 py-0.5 rounded">
                {"{{json googleForm.responses}}"}
              </code>
              - All responses as JSON
            </li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};
