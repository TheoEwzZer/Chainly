import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma/enums";
import { sendWorkflowExecution } from "@/inngest/utils";
import { NextURL } from "next/dist/server/web/next-url";
import type { Node } from "@/generated/prisma/client";
import { verifyWebhookSecret } from "@/lib/webhook-security";

const buildHeadersRecord = (request: NextRequest): Record<string, string> => {
  const record: Record<string, string> = {};
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() === "x-chainly-secret") {
      continue;
    }
    record[key] = value;
  }
  return record;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    const { workflowId } = await params;
    const url: NextURL = request.nextUrl;
    const nodeId: string | null = url.searchParams.get("nodeId");

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: "Workflow ID is required" },
        { status: 400 }
      );
    }

    if (!nodeId) {
      return NextResponse.json(
        { success: false, error: "nodeId query parameter is required" },
        { status: 400 }
      );
    }

    const node: Node | null = await prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (node?.workflowId !== workflowId) {
      return NextResponse.json(
        { success: false, error: "Node not found for this workflow" },
        { status: 404 }
      );
    }

    if (node.type !== NodeType.WEBHOOK_TRIGGER) {
      return NextResponse.json(
        { success: false, error: "Node is not a webhook trigger" },
        { status: 400 }
      );
    }

    const nodeData: Record<string, unknown> =
      (node?.data as Record<string, unknown>) || {};
    const storedSecret: unknown = nodeData.secret;

    if (typeof storedSecret !== "string" || storedSecret.length === 0) {
      return NextResponse.json(
        { success: false, error: "Webhook secret is not configured" },
        { status: 400 }
      );
    }

    const providedSecret: string | null =
      request.headers.get("x-chainly-secret");

    if (!verifyWebhookSecret(providedSecret, storedSecret)) {
      return NextResponse.json(
        { success: false, error: "Invalid X-Chainly-Secret header" },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Request body must be valid JSON" },
        { status: 400 }
      );
    }

    const variableName: string =
      typeof nodeData.variableName === "string" && nodeData.variableName.length
        ? nodeData.variableName
        : "webhook";

    await sendWorkflowExecution({
      workflowId,
      triggerNodeId: nodeId,
      initialData: {
        [variableName]: {
          body,
          headers: buildHeadersRecord(request),
          query: Object.fromEntries(url.searchParams.entries()),
          nodeId,
          receivedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook trigger error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to enqueue workflow execution" },
      { status: 500 }
    );
  }
}
