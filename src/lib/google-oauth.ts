import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
const BASE_URL: string =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

export const GOOGLE_CALENDAR_SCOPES: string[] = [
  "https://www.googleapis.com/auth/calendar.readonly",
];

export const GMAIL_SCOPES: string[] = [
  "https://www.googleapis.com/auth/gmail.readonly",
];

export type GoogleOAuthService = "google-calendar" | "gmail";

export function getGoogleOAuth2Client(
  service: GoogleOAuthService = "google-calendar"
): OAuth2Client {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials are not configured");
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${BASE_URL}/api/oauth/${service}/callback`
  );
}

export function getGoogleOAuth2AuthUrl(
  service: GoogleOAuthService = "google-calendar",
  state?: string
): string {
  const oauth2Client = getGoogleOAuth2Client(service);
  const scopes: string[] = service === "gmail" ? GMAIL_SCOPES : GOOGLE_CALENDAR_SCOPES;

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: state || undefined,
  });
}

export async function getTokensFromCode(
  code: string,
  service: GoogleOAuthService = "google-calendar"
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const oauth2Client = getGoogleOAuth2Client(service);
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Failed to get access token");
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || undefined,
    expires_in: tokens.expiry_date
      ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
      : undefined,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  service: GoogleOAuthService = "google-calendar"
): Promise<{
  access_token: string;
  expires_in?: number;
}> {
  const oauth2Client = getGoogleOAuth2Client(service);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return {
    access_token: credentials.access_token,
    expires_in: credentials.expiry_date
      ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
      : undefined,
  };
}
