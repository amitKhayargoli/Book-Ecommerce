// ─── Custom Session Types ──────────────────────────────────────────
//
// These types replace the NextAuth type augmentations.
// The Session type is defined in @/lib/session and exported via @/auth.
//
// For server components / API routes:
//   import { auth } from "@/auth";
//   const session = await auth();  // Session | null
//
// For client components:
//   import { useSession } from "@/lib/session-context";
//   const { data: session, status } = useSession();

export type { Session, SessionUser } from "@/lib/session";
