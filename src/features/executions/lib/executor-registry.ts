import { NodeType } from "@/generated/prisma/enums";
import {
  NodeExecutor,
  NodeExecutorParams,
  WorkflowContext,
} from "../components/types";
import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { httpRequestExecutor } from "../components/http-request/executor";

const initialExecutor: NodeExecutor<Record<string, unknown>> = async ({
  context,
}: NodeExecutorParams<Record<string, unknown>>): Promise<WorkflowContext> => {
  return context;
};

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  [NodeType.INITIAL]: initialExecutor,
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor, // TODO: fix types
} as const;

export const getExecutor = (nodeType: NodeType): NodeExecutor => {
  const executor: NodeExecutor = executorRegistry[nodeType];

  if (!executor) {
    throw new Error(`Executor for node type ${nodeType} not found`);
  }

  return executor;
};
