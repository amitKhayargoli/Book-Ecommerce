/**
 * Server-side Backend URL.
 *
 * - In Docker: set `BACKEND_URL=http://backend:3001` (Docker service name)
 * - In local dev: falls back to `NEXT_PUBLIC_BACKEND_URL` / default
 *
 * ⚠️  This file is never imported from client components - only from
 *    API route handlers and the auth config.
 */
export const BACKEND_URL: string =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://localhost:4500";
