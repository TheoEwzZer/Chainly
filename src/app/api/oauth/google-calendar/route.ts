import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuth2AuthUrl } from "@/lib/google-oauth";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

    const state: string = JSON.stringify({
      userId: session.user.id,
      credentialId: credentialId || null,
    });

    const authUrl: string = getGoogleOAuth2AuthUrl(state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error generating OAuth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate OAuth URL" },
      { status: 500 }
    );
  }
}
