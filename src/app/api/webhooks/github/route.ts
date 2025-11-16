import { sendWorkflowExecution } from "@/inngest/utils";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma/enums";
import { Node } from "@/generated/prisma/client";

export async function POST(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    const url = new URL(request.url);
    const workflowId: string | null = url.searchParams.get("workflowId");
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

    if (!node) {
      return NextResponse.json(
        { success: false, error: "Node not found" },
        { status: 404 }
      );
    }

    if (node.workflowId !== workflowId) {
      return NextResponse.json(
        { success: false, error: "Node not found for this workflow" },
        { status: 404 }
      );
    }

    if (node.type !== NodeType.GITHUB_TRIGGER) {
      return NextResponse.json(
        { success: false, error: "Node is not a GitHub trigger" },
        { status: 400 }
      );
    }

    const nodeData: Record<string, unknown> =
      (node.data as Record<string, unknown>) || {};
    const configuredEvents: string[] = (nodeData.events as string[]) || [];
    const variableName: string = (nodeData.variableName as string) || "github";

    const githubEvent: string | null = request.headers.get("x-github-event");
    const githubDelivery: string | null =
      request.headers.get("x-github-delivery");

    if (!githubEvent) {
      return NextResponse.json(
        { success: false, error: "Missing X-GitHub-Event header" },
        { status: 400 }
      );
    }

    if (
      configuredEvents.length > 0 &&
      !configuredEvents.includes(githubEvent)
    ) {
      return NextResponse.json({
        success: true,
        message: "Event ignored (not in configured events list)",
      });
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

    const action = (body as Record<string, unknown>)?.action as
      | string
      | undefined;

    const githubData = {
      event: githubEvent,
      action: action || null,
      delivery: githubDelivery,
      repository: (body as Record<string, unknown>)?.repository || {},
      sender: (body as Record<string, unknown>)?.sender || {},
      payload: body,
      raw: body,
    };

    await sendWorkflowExecution({
      workflowId,
      triggerNodeId: nodeId,
      initialData: {
        [variableName]: githubData,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("GitHub Webhook Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process GitHub webhook",
      },
      { status: 500 }
    );
  }
}
