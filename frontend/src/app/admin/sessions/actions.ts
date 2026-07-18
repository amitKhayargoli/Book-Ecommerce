"use server";

import { auth } from "@/auth";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://localhost:4000";

export interface RecentSession {
  ip: string;
  userAgent: string;
  email: string | null;
  userId: string | null;
  lastSeen: string;
  firstSeen: string;
  events: number;
}

export interface CreateRuleResult {
  success: boolean;
  error?: string;
}

export async function createIpAccessRuleFromSession(
  ip: string,
  type: "ALLOW" | "BLOCK",
): Promise<CreateRuleResult> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const label = `${type === "ALLOW" ? "Allow" : "Block"} via Sessions - ${ip}`;

    const response = await fetch(`${BACKEND_URL}/api/admin/ip-rules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ ip, type, label }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: text || "Failed to create rule" };
    }

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.message || "Failed to create rule" };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create rule",
    };
  }
}

export async function getRecentSessions(): Promise<{
  success: boolean;
  data?: RecentSession[];
  error?: string;
}> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const response = await fetch(`${BACKEND_URL}/api/admin/ip-rules/sessions`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: text || "Failed to fetch sessions" };
    }

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.message || "Failed to fetch sessions",
      };
    }

    return { success: true, data: result.data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch sessions",
    };
  }
}
