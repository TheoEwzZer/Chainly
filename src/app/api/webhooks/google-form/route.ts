import { sendWorkflowExecution } from "@/inngest/utils";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma/enums";
import type { Node } from "@/generated/prisma/client";
import { verifyWebhookSecret } from "@/lib/webhook-security";
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
      `google-form-webhook:${workflowId ?? "unknown"}:${ip}`
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

    if (node.type !== NodeType.GOOGLE_FORM_TRIGGER) {
      return NextResponse.json(
        { success: false, error: "Node is not a Google Form trigger" },
        { status: 400 }
      );
    }

    const nodeData: Record<string, unknown> =
      (node.data as Record<string, unknown>) || {};
    const webhookSecret: string | undefined = nodeData.secret as
      | string
      | undefined;

    if (webhookSecret) {
      const providedSecret: string | null =
        request.headers.get("x-chainly-secret");

      if (!verifyWebhookSecret(providedSecret, webhookSecret)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid or missing X-Chainly-Secret header",
          },
          { status: 401 }
        );
      }
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

    const typedBody = body as Record<string, unknown>;
    const variableName: string =
      typeof nodeData.variableName === "string" && nodeData.variableName.length
        ? nodeData.variableName
        : "googleForm";

    const formData = {
      formId: typedBody.formId,
      formTitle: typedBody.formTitle,
      responseId: typedBody.responseId,
      timestamp: typedBody.timestamp,
      respondentEmail: typedBody.respondentEmail,
      responses: typedBody.responses,
      raw: body,
    };

    await sendWorkflowExecution({
      workflowId,
      triggerNodeId: nodeId,
      initialData: { [variableName]: formData },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Google Form webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process Google Form submission" },
      { status: 500 }
    );
  }
}
