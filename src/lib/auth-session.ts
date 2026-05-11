import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "cm_auth_session";
const OAUTH_STATE_COOKIE = "cm_oauth_state";

type StoredSession = {
  accessToken: string;
  expiresAt: number;
  userId?: string;
  userName?: string;
  pageToken?: string;
  pageTokenExpiresAt?: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters.");
  }

  return secret;
}

function getKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function encryptPayload(payload: StoredSession, secret: string): string {
  const iv = randomBytes(12);
  const key = getKey(secret);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

function decryptPayload(encoded: string, secret: string): StoredSession | null {
  try {
    const blob = Buffer.from(encoded, "base64url");
    const iv = blob.subarray(0, 12);
    const authTag = blob.subarray(12, 28);
    const ciphertext = blob.subarray(28);
    const key = getKey(secret);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const payload = JSON.parse(decrypted.toString("utf8")) as StoredSession;

    if (!payload.accessToken || !payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getAuthSession(): Promise<StoredSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  const secret = getSessionSecret();
  const payload = decryptPayload(raw, secret);

  if (!payload) {
    return null;
  }

  return payload;
}

export async function setAuthSession(session: StoredSession): Promise<void> {
  const cookieStore = await cookies();
  const secret = getSessionSecret();
  const encoded = encryptPayload(session, secret);

  cookieStore.set(SESSION_COOKIE, encoded, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function setOAuthStateCookie(state: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
}

export async function consumeOAuthStateCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(OAUTH_STATE_COOKIE)?.value ?? null;

  cookieStore.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return value;
}

export type { StoredSession };
