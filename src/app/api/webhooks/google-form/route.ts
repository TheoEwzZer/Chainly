import { sendWorkflowExecution } from "@/inngest/utils";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma/enums";
import { Node } from "@/generated/prisma/client";

export async function POST(request: NextRequest): Promise<NextResponse<{success: boolean;}>> {
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

    if (nodeId) {
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
    }

    const body = await request.json();

    const formData = {
      formId: body.formId,
      formTitle: body.formTitle,
      responseId: body.responseId,
      timestamp: body.timestamp,
      respondentEmail: body.respondentEmail,
      responses: body.responses,
      raw: body,
    };

    await sendWorkflowExecution({
      workflowId,
      triggerNodeId: nodeId || undefined,
      initialData: { googleForm: formData },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Google Form Webhook Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process Google Form submission" },
      { status: 500 }
    );
  }
}
