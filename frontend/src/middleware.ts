export { auth as middleware } from "@/auth";

// Run middleware on all page routes (excludes API routes, static files, and internal Next.js paths)
// This ensures the MFA-pending redirect fires no matter which page the user lands on
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|books/raw|\.well-known).*)",
  ],
};
