import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "dmt_session";
const secret = process.env.SESSION_SECRET;

function signature(value: string) {
  if (!secret) throw new Error("SESSION_SECRET harus dikonfigurasi.");
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, nonce: randomBytes(16).toString("hex"), exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function readSession(value?: string) {
  if (!value || !secret) return null;
  const [payload, provided] = value.split(".");
  if (!payload || !provided) return null;
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId: string; exp: number };
    return parsed.exp > Date.now() ? parsed.userId : null;
  } catch {
    return null;
  }
}

export async function currentAdmin() {
  const jar = await cookies();
  return readSession(jar.get(cookieName)?.value);
}

export const sessionCookieName = cookieName;
