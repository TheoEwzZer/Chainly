import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { refreshAccessToken } from "@/lib/google-oauth";

export async function getValidAccessToken(
  credentialId: string,
  userId: string
): Promise<string> {
  const credential: {
    value: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  } | null = await prisma.credential.findUnique({
    where: {
      id: credentialId,
      userId,
    },
    select: {
      value: true,
      refreshToken: true,
      expiresAt: true,
    },
  });

  if (!credential) {
    throw new Error("Credential not found");
  }

  const accessToken: string = decrypt(credential.value);
  const now = new Date();

  const isExpired: boolean | null =
    credential.expiresAt &&
    new Date(credential.expiresAt.getTime() - 5 * 60 * 1000) <= now;

  if (!isExpired) {
    return accessToken;
  }

  if (!credential.refreshToken) {
    throw new Error(
      "Access token expired and no refresh token available. Please reconnect your Google Calendar account."
    );
  }

  try {
    const refreshTokenValue: string = decrypt(credential.refreshToken);
    const newTokens: {
      access_token: string;
      expires_in?: number;
    } = await refreshAccessToken(refreshTokenValue);

    const expiresAt: Date | null = newTokens.expires_in
      ? new Date(Date.now() + newTokens.expires_in * 1000)
      : null;

    await prisma.credential.update({
      where: {
        id: credentialId,
      },
      data: {
        value: encrypt(newTokens.access_token),
        expiresAt,
      },
    });

    return newTokens.access_token;
  } catch (error) {
    throw new Error(
      `Failed to refresh access token: ${
        error instanceof Error ? error.message : "Unknown error"
      }. Please reconnect your Google Calendar account.`
    );
  }
}
