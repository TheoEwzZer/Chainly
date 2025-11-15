import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const getEncryptionKey = (): Buffer => {
  const envKey: string | undefined = process.env.ENCRYPTION_KEY;

  if (!envKey) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  if (envKey.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY must be at least 32 characters long for AES-256"
    );
  }

  return crypto.createHash("sha256").update(envKey).digest();
};

export const encrypt = (value: string): string => {
  try {
    if (!value) {
      throw new Error("Cannot encrypt empty value");
    }

    const key: Buffer = getEncryptionKey();

    const iv: Buffer = crypto.randomBytes(IV_LENGTH);

    const cipher: crypto.CipherGCM = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted: string = cipher.update(value, "utf8", "base64url");
    encrypted += cipher.final("base64url");

    const authTag: Buffer = cipher.getAuthTag();

    return `${iv.toString("base64url")}:${authTag.toString(
      "base64url"
    )}:${encrypted}`;
  } catch (error) {
    throw new Error(
      `Encryption failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

export const decrypt = (encryptedValue: string): string => {
  try {
    if (!encryptedValue) {
      throw new Error("Cannot decrypt empty value");
    }

    const parts: string[] = encryptedValue.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const [ivBase64, authTagBase64, encryptedData] = parts;

    const key: Buffer = getEncryptionKey();
    const iv: Buffer = Buffer.from(ivBase64, "base64url");
    const authTag: Buffer = Buffer.from(authTagBase64, "base64url");

    if (iv.length !== IV_LENGTH) {
      throw new Error("Invalid IV length");
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid auth tag length");
    }

    const decipher: crypto.DecipherGCM = crypto.createDecipheriv(
      ALGORITHM,
      key,
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted: string = decipher.update(encryptedData, "base64url", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
