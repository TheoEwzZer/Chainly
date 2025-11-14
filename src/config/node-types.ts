import { NodeType } from "@/generated/prisma/enums";
import { GlobeIcon, MousePointerIcon } from "lucide-react";
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
];
