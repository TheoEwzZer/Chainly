"use client";

import { memo, ReactElement, useState, useEffect } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { NodeProps, useReactFlow, type Node } from "@xyflow/react";
import { GitHubTriggerDialog, GitHubTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { githubTriggerChannel } from "@/inngest/channels/github-trigger";
import { fetchGitHubTriggerRealtimeToken } from "./actions";

const generateSecret = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replaceAll("-", "");
  }
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
};

export type GitHubTriggerData = GitHubTriggerFormValues & {
  nodeId?: string;
  secret?: string;
};

type GitHubTriggerNodeType = Node<GitHubTriggerData>;

export const GitHubTriggerNode = memo(
  (props: NodeProps<GitHubTriggerNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: githubTriggerChannel().name,
      topic: "status",
      refreshToken: fetchGitHubTriggerRealtimeToken,
    });

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: GitHubTriggerFormValues): void => {
      setNodes((nodes: Node[]): Node[] =>
        nodes.map((node: Node): Node => {
          if (node.id === props.id) {
            const currentData: GitHubTriggerData = (node.data as GitHubTriggerData) || {};
            return {
              ...node,
              data: {
                ...node.data,
                ...values,
                nodeId: props.id,
                secret: currentData.secret || generateSecret(),
              },
            };
          }
          return node;
        })
      );
    };

    const handleRegenerateSecret = (): void => {
      setNodes((nodes: Node[]): Node[] =>
        nodes.map((node: Node): Node => {
          if (node.id === props.id) {
            return {
              ...node,
              data: {
                ...node.data,
                secret: generateSecret(),
              },
            };
          }
          return node;
        })
      );
    };

    const nodeData = (props.data || {}) as Partial<GitHubTriggerData>;

    useEffect((): void => {
      if (!nodeData.secret) {
        const newSecret: string = generateSecret();
        setNodes((nodes: Node[]): Node[] =>
          nodes.map((node: Node): Node => {
            if (node.id === props.id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  secret: newSecret,
                },
              };
            }
            return node;
          })
        );
      }
    }, [nodeData.secret, props.id, setNodes]);

    const selectedEvents: string[] = nodeData?.events || [];
    const description: string =
      selectedEvents.length > 0
        ? `Listening to: ${selectedEvents.join(", ")}`
        : "Not configured";

    return (
      <>
        <BaseTriggerNode
          {...props}
          icon="/logos/github.svg"
          name="GitHub"
          description={description}
          status={nodeStatus}
          onSettings={handleSettings}
          onDoubleClick={handleSettings}
        />
        <GitHubTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={{
            variableName: nodeData.variableName,
            events: nodeData.events,
            secret: nodeData.secret,
            nodeId: props.id,
          }}
          onRegenerateSecret={handleRegenerateSecret}
        />
      </>
    );
  }
);

GitHubTriggerNode.displayName = "GitHubTriggerNode";
