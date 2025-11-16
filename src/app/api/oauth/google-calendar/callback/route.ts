import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode } from "@/lib/google-oauth";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { CredentialType } from "@/generated/prisma/enums";
import { Credential } from "@/generated/prisma/client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const code: string | null = searchParams.get("code");
    const state: string | null = searchParams.get("state");
    const error: string | null = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/credentials?error=${encodeURIComponent(
            "OAuth authorization was denied"
          )}`,
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(
          `/credentials?error=${encodeURIComponent(
            "No authorization code received"
          )}`,
          request.url
        )
      );
    }

    let parsedState: { userId: string; credentialId: string | null } | null =
      null;
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

    const tokens: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    } = await getTokensFromCode(code);

    const expiresAt: Date | null = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    if (parsedState.credentialId) {
      const existingCredential: Credential | null =
        await prisma.credential.findUnique({
          where: {
            id: parsedState.credentialId,
            userId: parsedState.userId,
          },
        });

      if (existingCredential) {
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
            `/credentials/${
              parsedState.credentialId
            }?success=${encodeURIComponent(
              "Google Calendar connection updated successfully"
            )}`,
            request.url
          )
        );
      }
    }

    const credential: Credential = await prisma.credential.create({
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
        `/credentials/${credential.id}?success=${encodeURIComponent(
          "Google Calendar connected successfully"
        )}`,
        request.url
      )
    );
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.redirect(
      new URL(
        `/credentials?error=${encodeURIComponent(
          "Failed to complete OAuth flow"
        )}`,
        request.url
      )
    );
  }
}
