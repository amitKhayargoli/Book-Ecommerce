"use client";

import { ReactNode } from "react";
import { SessionProvider } from "@/lib/session-context";

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
