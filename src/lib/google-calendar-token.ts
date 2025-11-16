import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { refreshAccessToken } from "@/lib/google-oauth";

/**
 * Gets a valid access token for Google Calendar, refreshing if necessary
 */
export async function getValidAccessToken(
  credentialId: string,
  userId: string
): Promise<string> {
  const credential = await prisma.credential.findUnique({
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

  const accessToken = decrypt(credential.value);
  const now = new Date();

  // Check if token is expired or will expire in the next 5 minutes
  const isExpired =
    credential.expiresAt &&
    new Date(credential.expiresAt.getTime() - 5 * 60 * 1000) <= now;

  // If token is still valid, return it
  if (!isExpired) {
    return accessToken;
  }

  // Token is expired, try to refresh
  if (!credential.refreshToken) {
    throw new Error(
      "Access token expired and no refresh token available. Please reconnect your Google Calendar account."
    );
  }

  try {
    const refreshTokenValue = decrypt(credential.refreshToken);
    const newTokens = await refreshAccessToken(refreshTokenValue);

    // Update credential with new token
    const expiresAt = newTokens.expires_in
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

