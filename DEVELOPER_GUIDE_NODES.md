# Developer Guide - Adding New Nodes

This guide explains how to add new nodes to Chainly, a workflow automation platform similar to n8n, Zapier, or IFTTT.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Node Overview](#node-overview)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Advanced Patterns](#advanced-patterns)
5. [Reference Examples](#reference-examples)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Execution Flow

```
┌─────────────────┐
│   Workflow      │
│   Execution     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│   Inngest       │─────▶│   Node Executor  │
│   Functions     │      │   Registry       │
└─────────────────┘      └────────┬─────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│   Realtime      │      │   Individual     │
│   Channels      │      │   Executor       │
└─────────────────┘      └──────────────────┘
         │
         ▼
┌─────────────────┐
│   Node UI       │
│   Component     │
└─────────────────┘
```

### Main Components

A complete node requires the following files:

**For Execution Nodes:**

```
src/features/executions/components/{node-name}/
├── node.tsx           # React Flow UI component
├── dialog.tsx         # Configuration dialog
├── executor.ts        # Backend execution logic
└── actions.ts         # Server actions for realtime tokens
```

**For Trigger Nodes:**

```
src/features/triggers/components/{node-name}/
├── node.tsx           # React Flow UI component
├── dialog.tsx         # Configuration dialog
├── executor.ts        # Backend execution logic
└── actions.ts         # Server actions for realtime tokens
```

**Shared Files:**

```
src/inngest/channels/
└── {node-name}.ts     # Realtime communication channel

prisma/
└── schema.prisma      # DB schema update

src/config/
├── node-types.ts      # Node metadata
├── node-component.ts  # Component registration
└── ...
```

---

## Node Overview

### Node Types

There are two main categories:

1. **Trigger Nodes**: Start workflow execution (located in `src/features/triggers/`)

   - `MANUAL_TRIGGER`: Manual trigger button
   - `GOOGLE_FORM_TRIGGER`: Google Forms submission
   - `WEBHOOK_TRIGGER`: Incoming HTTP webhooks
   - `GITHUB_TRIGGER`: GitHub events (push, PR, issues)
   - `SCHEDULE_TRIGGER`: Cron/scheduled execution

2. **Execution Nodes**: Execute actions in the workflow (located in `src/features/executions/`)

   - `HTTP_REQUEST`: HTTP API calls
   - `OPENAI`, `GEMINI`, `ANTHROPIC`: AI text generation
   - `DISCORD`: Send Discord messages
   - `GOOGLE_CALENDAR`: Fetch calendar events
   - `GMAIL`: Fetch and filter emails
   - `EMAIL`: Send emails via Resend
   - `HUMAN_APPROVAL`: Pause for human approval
   - `LOOP`: Iterate over arrays
   - `CONDITIONAL`: If/else branching
   - `SWITCH`: Multi-way branching

### Node Lifecycle

1. **Configuration**: User configures the node via a dialog
2. **Registration**: Data is stored in `node.data`
3. **Execution**: Executor processes the node with workflow context
4. **Status Updates**: Status is communicated via realtime channels
5. **Result**: Results are added to the workflow context

---

## Step-by-Step Guide

### Step 1: Add Node Type in Prisma

**File: `prisma/schema.prisma`**

```prisma
enum NodeType {
  INITIAL
  MANUAL_TRIGGER
  HTTP_REQUEST
  GOOGLE_FORM_TRIGGER
  WEBHOOK_TRIGGER
  GITHUB_TRIGGER
  SCHEDULE_TRIGGER
  ANTHROPIC
  GEMINI
  OPENAI
  DISCORD
  GOOGLE_CALENDAR
  GMAIL
  HUMAN_APPROVAL
  LOOP
  CONDITIONAL
  SWITCH
  EMAIL
  YOUR_NEW_NODE  // ← Add your type here
}
```

If your node requires credentials (API keys, tokens, etc.), also add the type to the `CredentialType` enum:

```prisma
enum CredentialType {
  OPENAI
  ANTHROPIC
  GEMINI
  DISCORD
  GOOGLE_CALENDAR
  GMAIL
  RESEND
  YOUR_CREDENTIAL_TYPE  // ← Add your type here
}
```

**Commands to run after modification:**

```bash
pnpx prisma format
pnpx prisma generate
pnpx prisma migrate dev --name add_your_node_type
```

---

### Step 2: Create Realtime Channel

Channels enable real-time communication of node execution status.

**File: `src/inngest/channels/{your-node-name}.ts`**

```typescript
import { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { channel, topic } from "@inngest/realtime";

export const yourNodeChannel = channel("your-node-execution").addTopic(
  topic("status").type<{
    nodeId: string;
    status: NodeStatus;
  }>()
);
```

**Key Points:**

- Channel name must be unique: `"your-node-execution"`
- Topic `"status"` is standard for all nodes
- `NodeStatus` can be: `"loading"`, `"success"`, `"error"`, or `"initial"`

**Advanced: Multi-Topic Channels**

Some nodes need additional topics. For example, the Loop node has an `iteration` topic:

```typescript
import { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { channel, topic } from "@inngest/realtime";

export const loopChannel = channel("loop-execution")
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: NodeStatus;
    }>()
  )
  .addTopic(
    topic("iteration").type<{
      nodeId: string;
      current: number;
      total: number;
    }>()
  );
```

---

### Step 3: Create Configuration Dialog

The dialog allows users to configure the node.

**File: `src/features/executions/components/{your-node-name}/dialog.tsx`**

```typescript
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
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactElement } from "react";
import z from "zod";

// Define validation schema with Zod
const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(
      /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      "Variable name must start with a letter or underscore"
    ),
  // Add your specific fields here
  yourField: z.string().min(1, "Your field is required"),
  // If you need credentials:
  credentialId: z.string().min(1, "Credential is required"),
});

export type YourNodeFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: YourNodeFormValues) => void;
  defaultValues?: Partial<YourNodeFormValues>;
}

export const YourNodeDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props): ReactElement => {
  // If you use credentials:
  // const { data: credentials } = useCredentialsByType("YOUR_CREDENTIAL_TYPE");

  const form = useForm<YourNodeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      yourField: defaultValues.yourField || "",
      credentialId: defaultValues.credentialId || "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        yourField: defaultValues.yourField || "",
        credentialId: defaultValues.credentialId || "",
      });
    }
  }, [open, defaultValues, form]);

  // To display an example of variable usage
  const watchVariableName = useWatch({
    control: form.control,
    name: "variableName",
  });

  const handleSubmit = (values: YourNodeFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your Node Name</DialogTitle>
          <DialogDescription>
            Configure your node settings here.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-8 mt-4"
        >
          {/* Variable Name field (required for all nodes) */}
          <Controller
            name="variableName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Variable Name</FieldLabel>
                <FieldDescription>
                  Use this name to reference the result in other nodes:{" "}
                  {`{{${watchVariableName || "myVariable"}.result}}`}
                </FieldDescription>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="myVariable"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {/* Add your custom fields here */}
          <Controller
            name="yourField"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Your Field</FieldLabel>
                <FieldDescription>
                  Description of your field. Use {"{{variables}}"} to reference
                  previous nodes.
                </FieldDescription>
                <Textarea
                  {...field}
                  id={field.name}
                  placeholder="Enter your value here"
                  aria-invalid={fieldState.invalid}
                  className="min-h-[60px] font-mono"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
```

**Key Points:**

- Always include a `variableName` field to store results
- Use Zod for form validation
- Support Handlebars variables `{{variableName}}` in text fields
- Handle credentials if necessary

---

### Step 4: Create Executor

The executor contains the business logic that runs on the server side.

**File: `src/features/executions/components/{your-node-name}/executor.ts`**

```typescript
import {
  NodeExecutor,
  WorkflowContext,
} from "@/features/executions/components/types";
import { NonRetriableError } from "inngest";
import Handlebars, { SafeString } from "handlebars";
import { yourNodeChannel } from "@/inngest/channels/your-node-name";
import { YourNodeFormValues } from "./dialog";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption"; // If you use credentials

// Register Handlebars helpers for templating
Handlebars.registerHelper("json", (context: any): SafeString => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

Handlebars.registerHelper("lookup", (obj: any, key: string): any => {
  if (obj == null || typeof obj !== "object") {
    return undefined;
  }
  return obj[key];
});

// Transform bracket notation to lookup helper
const transformBracketNotation = (template: string): string => {
  return template.replaceAll(
    /\{\{([^}]*?)\[["']([^"']+)["']\]\}\}/g,
    (_: string, path: string, key: string): string => {
      const trimmedPath = path.trim();
      return `{{lookup ${trimmedPath} "${key}"}}`;
    }
  );
};

export const yourNodeExecutor: NodeExecutor<YourNodeFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  // 1. Publish "loading" status
  // IMPORTANT: Wrap publish() in step.run() with unique ID to avoid conflicts in parallel execution
  await step.run(`publish-loading-${nodeId}`, async (): Promise<void> => {
    await publish(
      yourNodeChannel().status({
        nodeId,
        status: "loading",
      })
    );
  });

  // 2. Validate required fields
  if (!data.variableName) {
    await step.run(
      `publish-error-variable-${nodeId}`,
      async (): Promise<void> => {
        await publish(
          yourNodeChannel().status({
            nodeId,
            status: "error",
          })
        );
      }
    );
    throw new NonRetriableError("Your Node: Variable name is required");
  }

  if (!data.yourField) {
    await step.run(`publish-error-field-${nodeId}`, async (): Promise<void> => {
      await publish(
        yourNodeChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw new NonRetriableError("Your Node: Your field is required");
  }

  // 3. Retrieve credentials if necessary
  if (data.credentialId) {
    const credential = await step.run(
      `get-credential-${nodeId}`,
      async (): Promise<void> => {
        return await prisma.credential.findUnique({
          where: { id: data.credentialId, userId },
          select: { value: true },
        });
      }
    );

    if (!credential) {
      await step.run(
        `publish-error-credential-not-found-${nodeId}`,
        async () => {
          await publish(
            yourNodeChannel().status({
              nodeId,
              status: "error",
            })
          );
        }
      );
      throw new NonRetriableError("Your Node: Credential not found");
    }

    // Decrypt API key
    const apiKey = decrypt(credential.value);
  }

  try {
    // 4. Process Handlebars templates
    const fieldTemplate = transformBracketNotation(data.yourField);
    const renderedField = Handlebars.compile(fieldTemplate)(context);

    // 5. Execute business logic in an Inngest step
    const result: WorkflowContext = await step.run(
      `your-node-logic-${nodeId}`,
      async () => {
        // *** YOUR BUSINESS LOGIC HERE ***
        // Example: API call, data processing, etc.

        const processedResult = {
          // Your results
          result: "Your processed result",
          data: renderedField,
        };

        // Return enriched context
        return {
          ...context,
          [data.variableName]: processedResult,
        };
      }
    );

    // 6. Publish "success" status
    await step.run(`publish-success-${nodeId}`, async (): Promise<void> => {
      await publish(
        yourNodeChannel().status({
          nodeId,
          status: "success",
        })
      );
    });

    return result;
  } catch (error) {
    // 7. Handle errors
    await step.run(`publish-error-final-${nodeId}`, async (): Promise<void> => {
      await publish(
        yourNodeChannel().status({
          nodeId,
          status: "error",
        })
      );
    });
    throw error;
  }
};
```

**Key Points:**

- **CRITICAL**: Always wrap `publish()` calls in `step.run()` with unique IDs (e.g., `publish-loading-${nodeId}`)
  - This prevents Inngest from creating duplicate step IDs when nodes execute in parallel
  - Without this, you'll get `AUTOMATIC_PARALLEL_INDEXING` warnings
- Always publish status via the channel (`loading`, `success`, `error`)
- Use `step.run()` for all important operations (enables retry and monitoring)
- Validate all required fields at the beginning
- Handle errors and update status accordingly
- Return a new enriched context with the node's results
- Support Handlebars templates for dynamic variables

---

### Step 5: Create Server Actions

Server actions generate tokens for realtime connections.

**File: `src/features/executions/components/{your-node-name}/actions.ts`**

```typescript
"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { yourNodeChannel } from "@/inngest/channels/your-node-name";
import { inngest } from "@/inngest/client";

export type YourNodeSubscriptionToken = Realtime.Token<
  typeof yourNodeChannel,
  ["status"]
>;

export async function fetchYourNodeRealtimeToken(): Promise<YourNodeSubscriptionToken> {
  return await getSubscriptionToken(inngest, {
    channel: yourNodeChannel(),
    topics: ["status"],
  });
}
```

---

### Step 6: Create Node UI Component

The Node component is displayed in the React Flow canvas.

**File: `src/features/executions/components/{your-node-name}/node.tsx`**

```typescript
import { memo, useState, type ReactElement } from "react";
import { type NodeProps, type Node, useReactFlow } from "@xyflow/react";
import { BaseExecutionNode } from "../base-execution-node";
import { YourNodeDialog, YourNodeFormValues } from "./dialog";
import { yourNodeChannel } from "@/inngest/channels/your-node-name";
import { fetchYourNodeRealtimeToken } from "./actions";
import { useNodeStatus } from "@/hooks/use-node-status";

type YourNodeType = Node<YourNodeFormValues>;

export const YourNode = memo((props: NodeProps<YourNodeType>): ReactElement => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { setNodes } = useReactFlow();

  // Hook to manage realtime status
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: yourNodeChannel().name,
    topic: "status",
    refreshToken: fetchYourNodeRealtimeToken,
  });

  const handleSettings = (): void => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: YourNodeFormValues): void => {
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

  const nodeData = props.data as YourNodeFormValues;

  // Display a short description of the node
  const description: string = nodeData?.yourField
    ? nodeData.yourField.slice(0, 50) +
      (nodeData.yourField.length > 50 ? "..." : "")
    : "Not configured";

  return (
    <>
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/your-node-logo.svg" // Add your logo
        name="Your Node Name"
        status={nodeStatus}
        description={description}
        onSettings={handleSettings}
        onDoubleClick={handleSettings}
      />
      <YourNodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
    </>
  );
});

YourNode.displayName = "YourNode";
```

**Key Points:**

- Use `BaseExecutionNode` for standard appearance
- Handle dialog opening on settings click or double-click
- Display a short description based on configuration
- Add a logo in `public/logos/`

---

### Step 7: Register Node in Configuration

#### 7.1 Add to Metadata

**File: `src/config/node-types.ts`**

```typescript
import { NodeType } from "@/generated/prisma/enums";
import { YourIcon } from "lucide-react"; // or import an icon

export const executionNodes: NodeTypeOption[] = [
  // ... existing nodes
  {
    type: NodeType.YOUR_NEW_NODE,
    label: "Your Node Name",
    description: "Description of what your node does.",
    icon: "/logos/your-node-logo.svg", // or YourIcon
  },
];
```

#### 7.2 Register Component

**File: `src/config/node-component.ts`**

```typescript
import { YourNode } from "@/features/executions/components/your-node-name/node";
import { NodeType } from "@/generated/prisma/enums";
import type { NodeTypes } from "@xyflow/react";

export const nodeComponents = {
  // ... existing nodes
  [NodeType.YOUR_NEW_NODE]: YourNode,
} as const satisfies NodeTypes;
```

#### 7.3 Register Executor

**File: `src/features/executions/lib/executor-registry.ts`**

```typescript
import { yourNodeExecutor } from "../components/your-node-name/executor";
import { NodeType } from "@/generated/prisma/enums";

export const executorRegistry: Record<NodeType, NodeExecutor<any>> = {
  // ... existing executors
  [NodeType.YOUR_NEW_NODE]: yourNodeExecutor,
} as const;
```

#### 7.4 Add Channel to Inngest

**File: `src/inngest/functions.ts`**

```typescript
import { yourNodeChannel } from "./channels/your-node-name";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    // ... configuration
  },
  {
    event: "workflow/execute.workflow",
    channels: [
      // ... existing channels
      yourNodeChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    // ... execution logic
  }
);
```

**Important: Update `getChannelForNodeType` function**

When adding a new node type, you must also update the `getChannelForNodeType` helper function in the same file. This function is used to reset all node statuses to "initial" at the start of workflow execution.

```typescript
// Helper function to get the channel for a node type
const getChannelForNodeType = (nodeType: NodeType) => {
  switch (nodeType) {
    case NodeType.MANUAL_TRIGGER:
      return manualTriggerChannel();
    // ... existing cases
    case NodeType.YOUR_NEW_NODE:
      return yourNodeChannel();
    case NodeType.INITIAL:
    default:
      return null; // INITIAL nodes don't have status channels
  }
};
```

**Why this is important:**

- At the start of each workflow execution, all nodes are automatically reset to "initial" status
- This ensures a clean state even if nodes had different statuses from previous executions
- The function maps each `NodeType` to its corresponding channel for status updates
- If you forget to add your node type here, its status won't be reset at execution start

---

### Step 8: Add Credentials Support (Optional)

If your node requires credentials:

#### 8.1 Update Credentials Component

**File: `src/features/credentials/components/credential.tsx`**

```typescript
import { CredentialType } from "@/generated/prisma/enums";

const credentialTypeOptions = [
  // ... existing options
  {
    label: "Your Service",
    value: CredentialType.YOUR_CREDENTIAL_TYPE,
    logo: "/logos/your-service.svg",
  },
];
```

#### 8.2 Update Credentials List

**File: `src/features/credentials/components/credentials.tsx`**

```typescript
const credentialLogos: Record<CredentialType, string> = {
  // ... existing logos
  [CredentialType.YOUR_CREDENTIAL_TYPE]: "/logos/your-service.svg",
};
```

---

## Advanced Patterns

### Control Flow Nodes

Control flow nodes (Conditional, Switch, Loop) use special patterns.

#### Using JEXL Expressions

For condition evaluation, use [JEXL](https://github.com/TomFrost/jexl) instead of Handlebars:

```typescript
import jexl from "jexl";

// Convert Handlebars-style syntax to JEXL
const convertToJexlSyntax = (condition: string): string => {
  return condition.replaceAll(/\{\{([^}]+)\}\}/g, "$1").trim();
};

// Evaluate condition
const evaluateCondition = (
  condition: string,
  context: WorkflowContext
): boolean => {
  try {
    const jexlExpression: string = convertToJexlSyntax(condition);
    const result: any = jexl.evalSync(jexlExpression, context);
    return Boolean(result);
  } catch (error) {
    throw new NonRetriableError(
      `Conditional Node: Failed to evaluate condition "${condition}". ${
        error instanceof Error ? error.message : "Invalid condition syntax"
      }`
    );
  }
};
```

**JEXL Expression Examples:**

- `myVar.count > 10` - Compare values
- `user.email == "test@example.com"` - String equality
- `items.length > 0 && status == "active"` - Logical operators
- `response.data.items[0].name` - Nested access

#### Human Approval Pattern

For nodes that pause execution waiting for user input:

```typescript
// Custom error class
export class PauseExecutionError extends Error {
  constructor(
    public approvalId: string,
    message: string = "Execution paused for human approval"
  ) {
    super(message);
    this.name = "PauseExecutionError";
  }
}

// In the executor
export const humanApprovalExecutor: NodeExecutor<
  HumanApprovalFormValues
> = async ({ data, nodeId, context, step, publish, userId, executionId }) => {
  // ... validation and setup ...

  // Create approval record
  const approval = await step.run(
    `create-approval-${nodeId}`,
    async (): Promise<void> => {
      return await prisma.approval.create({
        data: {
          executionId: executionId,
          nodeId: nodeId,
          userId: userId,
          status: ApprovalStatus.PENDING,
          message: renderedMessage,
          context: context as any,
        },
      });
    }
  );

  // Pause execution
  await step.run(`pause-execution-${nodeId}`, async (): Promise<void> => {
    await prisma.execution.update({
      where: { id: executionId },
      data: { status: ExecutionStatus.PAUSED },
    });
  });

  // Throw special error to pause workflow
  throw new PauseExecutionError(approval.id, "Waiting for human approval");
};
```

The `functions.ts` handles this error specially:

```typescript
if (error instanceof PauseExecutionError) {
  return {
    workflowId,
    result: context,
    paused: true,
    approvalId: error.approvalId,
  };
}
```

#### Loop Node Pattern

For iterating over arrays with progress tracking:

```typescript
// Channel with iteration topic
export const loopChannel = channel("loop-execution")
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: NodeStatus;
    }>()
  )
  .addTopic(
    topic("iteration").type<{
      nodeId: string;
      current: number;
      total: number;
    }>()
  );

// Publishing iteration progress
await step.run(`publish-iteration-${node.id}-${i}`, async (): Promise<void> => {
  await publish(
    loopChannel().iteration({
      nodeId: node.id,
      current: i + 1,
      total: items.length,
    })
  );
});
```

---

## Reference Examples

### Simple Example: Discord Node

The Discord node is an excellent example of a node without complex credentials:

```
src/features/executions/components/discord/
├── node.tsx
├── dialog.tsx
├── executor.ts
└── actions.ts
```

**Features:**

- Send messages via webhook
- Support Handlebars templates
- No encrypted credentials (webhook URL in plain text)

### Example with Credentials: OpenAI Node

The OpenAI node shows how to handle API keys:

```
src/features/executions/components/openai/
├── node.tsx
├── dialog.tsx
├── executor.ts
└── actions.ts
```

**Features:**

- Use encrypted credentials
- Model selection
- Support system and user prompts
- Integration with Vercel AI SDK

### Control Flow: Conditional Node

The Conditional node demonstrates branching:

```
src/features/executions/components/conditional/
├── node.tsx
├── dialog.tsx
└── executor.ts
```

**Features:**

- JEXL expression evaluation
- True/false output paths
- Context-aware conditions

### Control Flow: Switch Node

The Switch node demonstrates multi-way branching:

```
src/features/executions/components/switch/
├── node.tsx
├── dialog.tsx
└── executor.ts
```

**Features:**

- Multiple case values
- Default fallback
- Expression evaluation

### Control Flow: Loop Node

The Loop node demonstrates array iteration:

```
src/features/executions/components/loop/
├── node.tsx
├── dialog.tsx
└── executor.ts
```

**Features:**

- Array path resolution
- Item variable injection
- Iteration progress tracking

### Human-in-the-Loop: Human Approval Node

The Human Approval node demonstrates workflow pausing:

```
src/features/executions/components/human-approval/
├── node.tsx
├── dialog.tsx
└── executor.ts
```

**Features:**

- Pause execution
- Store approval request in database
- Resume on approval/rejection

---

## Best Practices

### 1. Error Handling

```typescript
try {
  // Your logic
} catch (error) {
  // IMPORTANT: Wrap publish in step.run with unique ID
  await step.run(`publish-error-final-${nodeId}`, async (): Promise<void> => {
    await publish(
      yourNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
  });

  // Use NonRetriableError for business errors
  if (error instanceof YourBusinessError) {
    throw new NonRetriableError(`Your Node: ${error.message}`);
  }

  // Rethrow other errors (they will be retried by Inngest)
  throw error;
}
```

### 2. Data Validation

- Validate on the client side with Zod in the dialog
- Re-validate on the server side in the executor
- Provide clear and actionable error messages

### 3. Handlebars Templates

Always support variables in text fields:

```typescript
const template = transformBracketNotation(data.yourField);
const rendered = Handlebars.compile(template)(context);
```

**Supported Formats:**

- `{{variableName}}`: simple access
- `{{variableName.property}}`: property access
- `{{variableName["property"]}}`: bracket notation (transformed to lookup helper)
- `{{json variableName}}`: JSON stringification

### 4. JEXL Expressions (for control flow)

For condition evaluation, prefer JEXL over Handlebars:

```typescript
import jexl from "jexl";

const result = jexl.evalSync(expression, context);
```

**Advantages:**

- Better operator support (`>`, `<`, `==`, `&&`, `||`)
- Cleaner syntax without curly braces
- Type-aware comparisons

### 5. Variable Naming

- Use descriptive names for `variableName`
- Suggest a default name in the placeholder
- Validate that the name is a valid JavaScript identifier

### 6. Realtime Status

**IMPORTANT**: Always wrap `publish()` in `step.run()` with unique IDs to avoid conflicts in parallel execution.

Always publish status in this order:

```typescript
// 1. At the beginning
await step.run(`publish-loading-${nodeId}`, async (): Promise<void> => {
  await publish(channel().status({ nodeId, status: "loading" }));
});

// 2. On success
await step.run(`publish-success-${nodeId}`, async (): Promise<void> => {
  await publish(channel().status({ nodeId, status: "success" }));
});

// 3. On error (in catch block)
await step.run(`publish-error-final-${nodeId}`, async (): Promise<void> => {
  await publish(channel().status({ nodeId, status: "error" }));
});
```

**Why wrap publish() in step.run()?**

- When multiple nodes of the same type execute in parallel, Inngest internally creates steps for each `publish()` call
- Without unique IDs, these internal steps would have the same ID, causing `AUTOMATIC_PARALLEL_INDEXING` warnings
- By wrapping in `step.run()` with `${nodeId}`, each node gets unique step IDs

### 7. Workflow Context

The context is an object shared between all nodes:

```typescript
// Read
const previousNodeData = context.myPreviousNode;

// Write
return {
  ...context,
  [data.variableName]: {
    result: "your result",
    metadata: "additional data",
  },
};
```

### 8. Performance

- Use `step.run()` for all I/O operations (including `publish()` calls)
- Avoid blocking synchronous operations
- Limit the size of data stored in context
- Each `step.run()` creates a checkpoint in Inngest for retry/debugging
- Use unique step IDs (with `${nodeId}`) to prevent conflicts in parallel execution

### 9. Security

- Always decrypt credentials on the server side
- Never expose API keys in logs
- Validate URLs and user inputs
- Use `userId` to verify permissions

---

## Troubleshooting

### Node doesn't appear in the list

- ✅ Check that the type is added in `prisma/schema.prisma`
- ✅ Run `pnpx prisma generate`
- ✅ Check that the node is added in `node-types.ts`
- ✅ Restart the development server

### Status doesn't update

- ✅ Check that the channel is created in `src/inngest/channels/`
- ✅ Check that the channel is added in `src/inngest/functions.ts`
- ✅ Check that `useNodeStatus` uses the correct channel name
- ✅ Check that server actions return the correct token
- ✅ Check that your node type is added to `getChannelForNodeType` function in `src/inngest/functions.ts` (required for status reset at execution start)

### Handlebars templates don't work

- ✅ Call `transformBracketNotation()` on templates
- ✅ Register the `json` and `lookup` helpers
- ✅ Check that the context contains the referenced variables

### JEXL expressions don't work

- ✅ Remove `{{}}` wrappers from expressions
- ✅ Use `jexl.evalSync()` for synchronous evaluation
- ✅ Check that context variables exist and have expected types

### Executor doesn't run

- ✅ Check that the executor is registered in `executor-registry.ts`
- ✅ Check that the type matches exactly in all files
- ✅ Check Inngest logs to see errors
- ✅ Check that the workflow doesn't have cyclic dependencies

### Credentials are not available

- ✅ Add the type in `CredentialType` enum (schema.prisma)
- ✅ Update `credential.tsx` with the new type
- ✅ Update `credentials.tsx` with the logo
- ✅ Create a credential via the interface before testing

### TypeScript compilation error

- ✅ Run `pnpx prisma generate` to regenerate types
- ✅ Check imports from `@/generated/prisma/`
- ✅ Restart TypeScript server in your IDE

### Inngest warning: AUTOMATIC_PARALLEL_INDEXING

If you see this warning in the console:

```
We detected that you have multiple steps with the same ID.
Code: AUTOMATIC_PARALLEL_INDEXING
```

**Solution:**

- ✅ Wrap ALL `publish()` calls in `step.run()` with unique IDs
- ✅ Use `${nodeId}` in step IDs to make them unique per node
- ✅ Example: `await step.run(\`publish-loading-\${nodeId}\`, async (): Promise<void> => { await publish(...); })`
- ✅ Check that you didn't forget any `publish()` calls (loading, success, error, validation errors)

---

## Complete Checklist

Use this checklist to ensure all files are in place:

### Required Files

- [ ] `prisma/schema.prisma` - Add NodeType
- [ ] `src/inngest/channels/{node-name}.ts` - Realtime channel
- [ ] `src/features/executions/components/{node-name}/node.tsx` - UI component
- [ ] `src/features/executions/components/{node-name}/dialog.tsx` - Configuration dialog
- [ ] `src/features/executions/components/{node-name}/executor.ts` - Execution logic
- [ ] `src/features/executions/components/{node-name}/actions.ts` - Server actions
- [ ] `src/config/node-types.ts` - Node metadata
- [ ] `src/config/node-component.ts` - Component registration
- [ ] `src/features/executions/lib/executor-registry.ts` - Executor registration
- [ ] `src/inngest/functions.ts` - Channel addition and `getChannelForNodeType` update

### Optional Files

- [ ] `src/features/executions/components/{node-name}/constants.ts` - Specific constants
- [ ] `public/logos/{node-name}.svg` - Node logo
- [ ] `prisma/schema.prisma` - CredentialType (if needed)
- [ ] `src/features/credentials/components/credential.tsx` - Credentials support
- [ ] `src/features/credentials/components/credentials.tsx` - Credential logo

### Commands to Run

- [ ] `pnpx prisma format` - Format schema
- [ ] `pnpx prisma generate` - Generate types
- [ ] `pnpx prisma migrate dev --name add_{node_name}` - Create migration
- [ ] Restart development server

### Tests

- [ ] Node appears in the nodes list
- [ ] Dialog opens on settings click
- [ ] Form validates correctly
- [ ] Executor runs without errors
- [ ] Realtime statuses update
- [ ] Results are accessible in subsequent nodes
- [ ] Handlebars templates work
- [ ] JEXL expressions work (if applicable)
- [ ] Credentials are retrieved and decrypted (if applicable)

---

## Additional Resources

### External Documentation

- [Inngest Documentation](https://www.inngest.com/docs) - To understand steps, retry, and realtime
- [React Flow Documentation](https://reactflow.dev/) - To customize node appearance
- [Handlebars Documentation](https://handlebarsjs.com/) - For templates
- [JEXL Documentation](https://github.com/TomFrost/jexl) - For expression evaluation
- [Zod Documentation](https://zod.dev/) - For form validation
- [Prisma Documentation](https://www.prisma.io/docs) - For database schema
- [Vercel AI SDK](https://sdk.vercel.ai/) - For AI integrations

### Reference Source Code

Existing nodes are your best references:

1. **Simple Node**: `discord` - Basic example without complexity
2. **AI Node**: `openai`, `gemini`, `anthropic` - AI SDK integration
3. **HTTP Node**: `http-request` - External API calls
4. **Control Flow**: `conditional`, `switch`, `loop` - Branching and iteration
5. **Human-in-the-Loop**: `human-approval` - Pausing for user input
6. **Trigger Node**: `manual-trigger`, `webhook-trigger`, `schedule-trigger` - Workflow triggering

---

## Support and Contribution

If you encounter problems or have questions:

1. Review existing node examples
2. Check Inngest logs for execution errors
3. Use React development tools to debug the UI
4. Consult external dependency documentation

Happy coding! 🚀
