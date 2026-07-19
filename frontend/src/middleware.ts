import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  Session,
  decodeSession,
} from "./lib/session";

/**
 * Edge-compatible session decoder that reads from the request cookie.
 * Reuses the same decodeSession logic from the core session module.
 */
async function decodeSessionFromRequest(
  request: NextRequest,
): Promise<Session | null> {
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) return null;
  return decodeSession(cookieValue);
}

/**
 * Middleware that protects routes based on session state.
 *
 * This replaces NextAuth's middleware and uses the same cookie-based
 * session that the rest of the app uses.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = await decodeSessionFromRequest(request);

  // ── MFA-pending redirect ────────────────────────────────────
  if (session?.mfaRequired && pathname !== "/login") {
    const callback = encodeURIComponent(pathname);
    return NextResponse.redirect(
      new URL(
        `/login?mfa_pending=true&callbackUrl=${callback}`,
        request.url,
      ),
    );
  }

  // ── Protected paths ─────────────────────────────────────────
  const protectedPaths = [
    "/cart",
    "/checkout",
    "/orders",
    "/profile",
    "/addresses",
    "/wishlist",
    "/mfa",
    "/admin",
  ];
  const isProtectedPath = protectedPaths.some((p) => pathname.startsWith(p));

  // If the session exists but has no accessToken (expired), redirect
  if (
    session?.user &&
    !session?.accessToken &&
    !session?.mfaRequired &&
    isProtectedPath
  ) {
    return NextResponse.redirect(
      new URL("/login?expired=true", request.url),
    );
  }

  // ── Admin route enforcement ─────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!session?.user) return NextResponse.redirect(new URL("/login", request.url));
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // ── Home page: redirect admins to /admin ─────────────────────
  if (pathname === "/" && session?.user?.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // ── Profile page: redirect admins to /admin/profile ──────────
  if (pathname === "/profile" && session?.user?.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/profile", request.url));
  }

  // ── Customer-only routes: block admins ───────────────────────
  if (session?.user?.role === "ADMIN") {
    const customerPaths = [
      "/cart",
      "/checkout",
      "/orders",
      "/addresses",
      "/wishlist",
    ];
    const isCustomerPath = customerPaths.some((p) => pathname.startsWith(p));
    if (isCustomerPath) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|books/raw|\\.well-known).*)",
  ],
};
