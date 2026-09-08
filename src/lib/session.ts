import { cookies } from "next/headers";
import { nanoid } from "nanoid";

const SESSION_COOKIE = "sb_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_MAX_AGE,
  path: "/",
};

/** Read-only. Safe in Server Components — never sets cookies. */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/** Create the session cookie. Call only from a Server Action or Route Handler. */
export async function ensureSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const sessionId = nanoid(32);
  cookieStore.set(SESSION_COOKIE, sessionId, SESSION_COOKIE_OPTIONS);
  return sessionId;
}

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "story"}-${nanoid(8)}`;
}
