import { NodeType } from "@/generated/prisma/enums";
import {
  ArrowLeftRight,
  Check,
  ClockIcon,
  GlobeIcon,
  GitBranch,
  MailIcon,
  MousePointerIcon,
  Repeat,
  ShieldAlert,
  WebhookIcon,
} from "lucide-react";
import type { ComponentType } from "react";

export type NodeTypeOption = {
  type: NodeType;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }> | string;
};

export const triggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.MANUAL_TRIGGER,
    label: "Trigger Manually",
    description:
      "Runs the flow on clicking a button. Good for getting started quickly.",
    icon: MousePointerIcon,
  },
  {
    type: NodeType.GOOGLE_FORM_TRIGGER,
    label: "Google Form",
    description:
      "Runs the flow when a Google Form is submitted. Good for collecting data from a form.",
    icon: "/logos/google-form.svg",
  },
  {
    type: NodeType.WEBHOOK_TRIGGER,
    label: "Incoming Webhook",
    description:
      "Runs the flow when an authenticated HTTP request hits your webhook URL.",
    icon: WebhookIcon,
  },
  {
    type: NodeType.GITHUB_TRIGGER,
    label: "GitHub",
    description:
      "Runs the flow when GitHub events occur (push, pull request, issues, etc.).",
    icon: "/logos/github.svg",
  },
  {
    type: NodeType.SCHEDULE_TRIGGER,
    label: "Schedule",
    description:
      "Runs the flow on a schedule (cron, specific date/time, or recurring interval).",
    icon: ClockIcon,
  },
];

export const executionNodes: NodeTypeOption[] = [
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Makes an HTTP request to a URL. Good for making API calls.",
    icon: GlobeIcon,
  },
  {
    type: NodeType.GEMINI,
    label: "Gemini",
    description: "Generates text using the Gemini API.",
    icon: "/logos/gemini.svg",
  },
  {
    type: NodeType.ANTHROPIC,
    label: "Anthropic Claude",
    description: "Generates text using Claude AI.",
    icon: "/logos/anthropic.svg",
  },
  {
    type: NodeType.OPENAI,
    label: "OpenAI",
    description: "Generates text using GPT models.",
    icon: "/logos/openai.svg",
  },
  {
    type: NodeType.DISCORD,
    label: "Discord",
    description: "Sends a message to a Discord channel.",
    icon: "/logos/discord.svg",
  },
  {
    type: NodeType.GOOGLE_CALENDAR,
    label: "Google Calendar",
    description: "Fetches events from a Google Calendar for a specific date.",
    icon: "/logos/google-calendar.svg",
  },
  {
    type: NodeType.GMAIL,
    label: "Gmail",
    description:
      "Fetches emails from Gmail with advanced filters (date, read status, sender, etc.).",
    icon: "/logos/gmail.svg",
  },
  {
    type: NodeType.HUMAN_APPROVAL,
    label: "Human Approval",
    description:
      "Pause the workflow and wait for human approval before continuing.",
    icon: Check,
  },
  {
    type: NodeType.LOOP,
    label: "Loop",
    description:
      "Iterate over an array and execute the following nodes for each item.",
    icon: Repeat,
  },
  {
    type: NodeType.CONDITIONAL,
    label: "Conditional",
    description:
      "Evaluate a condition and route the workflow to different paths based on the result.",
    icon: GitBranch,
  },
  {
    type: NodeType.SWITCH,
    label: "Switch",
    description:
      "Evaluate an expression and route the workflow to one of multiple paths based on matching case values.",
    icon: ArrowLeftRight,
  },
  {
    type: NodeType.EMAIL,
    label: "Email",
    description: "Sends an email using Resend. Supports HTML and plain text.",
    icon: MailIcon,
  },
  {
    type: NodeType.ERROR_HANDLER,
    label: "Error Handler",
    description:
      "Check if the previous node(s) failed and route the workflow to success or error paths.",
    icon: ShieldAlert,
  },
];
