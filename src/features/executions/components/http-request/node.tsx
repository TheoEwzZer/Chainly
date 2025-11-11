"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import { memo, ReactElement, useState } from "react";
import { HttpRequestFormValues, HttpRequestDialog } from "./dialog";
import { HTTPRequestMethodEnum } from "./constants";

type HttpRequestNodeData = {
  endpoint?: string;
  method?: HTTPRequestMethodEnum;
  body?: string;
};

type HttpRequestNodeType = Node<HttpRequestNodeData>;

export const HttpRequestNode = memo(
  (props: NodeProps<HttpRequestNodeType>): ReactElement => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = "initial";

    const handleSettings = (): void => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: HttpRequestFormValues): void => {
      setNodes((nodes: Node[]): Node[] =>
        nodes.map((node: Node): Node => {
          if (node.id === props.id) {
            return {
              ...node,
              data: {
                ...node.data,
                ...values,
              },
            };
          }
          return node;
        })
      );
    };

    const nodeData = props.data as HttpRequestNodeData;
    const description: string = nodeData?.endpoint
      ? `${nodeData.method || HTTPRequestMethodEnum.GET}: ${nodeData.endpoint}`
      : "Not configured";

    return (
      <>
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={GlobeIcon}
          name="HTTP Request"
          status={nodeStatus}
          description={description}
          onSettings={handleSettings}
          onDoubleClick={handleSettings}
        />
        <HttpRequestDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
      </>
    );
  }
);

HttpRequestNode.displayName = "HttpRequestNode";
