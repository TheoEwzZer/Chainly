import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuth2AuthUrl } from "@/lib/google-oauth";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createSignedState } from "@/lib/webhook-security";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const credentialId: string | null = searchParams.get("credentialId");

    const state: string = createSignedState({
      userId: session.user.id,
      credentialId: credentialId || null,
      exp: Date.now() + 10 * 60 * 1000,
    });

    const authUrl: string = getGoogleOAuth2AuthUrl("gmail", state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: "gmail-oauth" },
    });
    return NextResponse.json(
      { error: "Failed to generate OAuth URL" },
      { status: 500 }
    );
  }
}
