"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { SessionUser } from "./session";

// ─── Types ───────────────────────────────────────────────────────────

export interface ClientSession {
  user?: SessionUser;
  accessToken?: string;
  mfaRequired?: boolean;
  mfaToken?: string;
  expiresAt?: number;
}

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface SessionContextValue {
  data: ClientSession | null;
  status: SessionStatus;
  update: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

// ─── Provider ────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ClientSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const pathname = usePathname();

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) {
        setData(null);
        setStatus("unauthenticated");
        return;
      }

      const session = (await res.json()) as ClientSession;

      if (session.user && session.accessToken) {
        setData(session);
        setStatus("authenticated");
      } else if (session.mfaRequired) {
        // MFA-pending session — still treat as authenticated (has a user)
        setData(session);
        setStatus("authenticated");
      } else {
        setData(null);
        setStatus("unauthenticated");
      }
    } catch {
      setData(null);
      setStatus("unauthenticated");
    }
  }, []);

  // Fetch on mount AND re-fetch on route change (catches login/logout redirects)
  useEffect(() => {
    fetchSession();
  }, [pathname, fetchSession]);

  // Re-fetch when the window regains focus (covers tab switch after OAuth)
  useEffect(() => {
    const onFocus = () => {
      setStatus((prev) => {
        if (prev !== "loading") {
          fetchSession();
        }
        return prev;
      });
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchSession]);

  return (
    <SessionContext.Provider
      value={{ data, status, update: () => fetchSession() }}
    >
      {children}
    </SessionContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
