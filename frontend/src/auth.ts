import { cookies } from "next/headers";
import {
  Session,
  decodeSession,
} from "./lib/session";

/**
 * Read and verify the current session from the httpOnly cookie.
 *
 * This is the server-side replacement for NextAuth's `auth()`.
 * Import it the same way:
 *   import { auth } from "@/auth";
 *
 * Usage in server components / API routes:
 *   const session = await auth();
 *   const token = session?.accessToken;
 */
export async function auth(): Promise<Session | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session")?.value;
  if (!cookie) return null;
  return decodeSession(cookie);
}

// Re-export the Session type for convenience
export type { Session, SessionUser } from "./lib/session";
