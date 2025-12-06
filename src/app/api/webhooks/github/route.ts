import { sendWorkflowExecution } from "@/inngest/utils";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma/enums";
import type { Node } from "@/generated/prisma/client";
import { verifyGitHubSignature } from "@/lib/webhook-security";
import { checkRateLimit, rateLimitResponse, RateLimitResult } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    const url = new URL(request.url);
    const workflowId: string | null = url.searchParams.get("workflowId");
    const nodeId: string | null = url.searchParams.get("nodeId");

    const ip: string =
      request.headers.get("x-forwarded-for")?.split(",")[0] ??
      request.headers.get("x-real-ip") ??
      "anonymous";
    const rateLimitResult: RateLimitResult = checkRateLimit(
      `github-webhook:${workflowId ?? "unknown"}:${ip}`
    );

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

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
    const webhookSecret: string | undefined = nodeData.secret as
      | string
      | undefined;

    const githubEvent: string | null = request.headers.get("x-github-event");
    const githubDelivery: string | null =
      request.headers.get("x-github-delivery");
    const githubSignature: string | null = request.headers.get(
      "x-hub-signature-256"
    );

    if (!githubEvent) {
      return NextResponse.json(
        { success: false, error: "Missing X-GitHub-Event header" },
        { status: 400 }
      );
    }

    const rawBody: string = await request.text();

    if (webhookSecret) {
      if (!githubSignature) {
        return NextResponse.json(
          { success: false, error: "Missing X-Hub-Signature-256 header" },
          { status: 401 }
        );
      }

      const isValidSignature: boolean = verifyGitHubSignature(
        rawBody,
        githubSignature,
        webhookSecret
      );

      if (!isValidSignature) {
        return NextResponse.json(
          { success: false, error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
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
      body = JSON.parse(rawBody);
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
    console.error("GitHub webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process GitHub webhook",
      },
      { status: 500 }
    );
  }
}
