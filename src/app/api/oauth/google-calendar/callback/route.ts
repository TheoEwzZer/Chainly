import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode } from "@/lib/google-oauth";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { CredentialType } from "@/generated/prisma/enums";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/credentials?error=${encodeURIComponent("OAuth authorization was denied")}`,
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(
          `/credentials?error=${encodeURIComponent("No authorization code received")}`,
          request.url
        )
      );
    }

    let parsedState: { userId: string; credentialId: string | null } | null = null;
    if (state) {
      try {
        parsedState = JSON.parse(state);
      } catch {
        // Invalid state, continue without it
      }
    }

    if (!parsedState?.userId) {
      return NextResponse.redirect(
        new URL(
          `/credentials?error=${encodeURIComponent("Invalid state parameter")}`,
          request.url
        )
      );
    }

    // Get tokens from Google
    const tokens = await getTokensFromCode(code);

    // Calculate expiration date
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    if (parsedState.credentialId) {
      // Update existing credential
      await prisma.credential.update({
        where: {
          id: parsedState.credentialId,
          userId: parsedState.userId,
        },
        data: {
          value: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token
            ? encrypt(tokens.refresh_token)
            : null,
          expiresAt,
        },
      });

      return NextResponse.redirect(
        new URL(
          `/credentials/${parsedState.credentialId}?success=${encodeURIComponent("Google Calendar connection updated successfully")}`,
          request.url
        )
      );
    } else {
      // Create new credential
      const credential = await prisma.credential.create({
        data: {
          name: "Google Calendar",
          value: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token
            ? encrypt(tokens.refresh_token)
            : null,
          expiresAt,
          type: CredentialType.GOOGLE_CALENDAR,
          userId: parsedState.userId,
        },
      });

      return NextResponse.redirect(
        new URL(
          `/credentials/${credential.id}?success=${encodeURIComponent("Google Calendar connected successfully")}`,
          request.url
        )
      );
    }
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.redirect(
      new URL(
        `/credentials?error=${encodeURIComponent("Failed to complete OAuth flow")}`,
        request.url
      )
    );
  }
}

