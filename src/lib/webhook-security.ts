import crypto from "node:crypto";

export function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  if (!signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature: string = signature.slice(7);

  const computedSignature: string = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(computedSignature, "hex")
    );
  } catch {
    return false;
  }
}

export function generateWebhookSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

export function createSignedState(data: Record<string, unknown>): string {
  const secret: string = getStateSigningKey();
  const payload: string = Buffer.from(JSON.stringify(data)).toString(
    "base64url"
  );
  const signature: string = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifySignedState<T = Record<string, unknown>>(
  state: string | null
): T | null {
  if (!state) {
    return null;
  }

  const parts: string[] = state.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;
  const secret: string = getStateSigningKey();

  const expectedSignature: string = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  try {
    const isValid: boolean = crypto.timingSafeEqual(
      Buffer.from(signature, "base64url"),
      Buffer.from(expectedSignature, "base64url")
    );

    if (!isValid) {
      return null;
    }

    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function verifyWebhookSecret(
  provided: string | null,
  expected: string
): boolean {
  if (!provided || !expected) {
    return false;
  }

  const maxLength: number = Math.max(provided.length, expected.length);
  const paddedProvided: string = provided.padEnd(maxLength, "\0");
  const paddedExpected: string = expected.padEnd(maxLength, "\0");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(paddedProvided, "utf8"),
      Buffer.from(paddedExpected, "utf8")
    );
  } catch {
    return false;
  }
}

function getStateSigningKey(): string {
  const key: string | undefined = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  return crypto
    .createHash("sha256")
    .update(`state-signing:${key}`)
    .digest("hex");
}
