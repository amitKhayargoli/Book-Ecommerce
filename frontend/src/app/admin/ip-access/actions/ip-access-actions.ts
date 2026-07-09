"use server";

import { auth } from "@/auth";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://localhost:4000";

export interface IpAccessRule {
  id: string;
  ip: string;
  type: "ALLOW" | "BLOCK";
  label: string;
  isActive: boolean;
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IpAccessRulesResult {
  success: boolean;
  data?: IpAccessRule[];
  error?: string;
}

export async function fetchIpAccessRules(): Promise<IpAccessRulesResult> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const response = await fetch(`${BACKEND_URL}/api/admin/ip-rules`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.message || "Failed to fetch IP access rules",
      };
    }

    return { success: true, data: result.data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch IP access rules",
    };
  }
}

export async function createIpAccessRule(data: {
  ip: string;
  type: string;
  label: string;
  isActive?: boolean;
  expiresAt?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const response = await fetch(`${BACKEND_URL}/api/admin/ip-rules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.message || "Failed to create IP access rule" };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create IP access rule",
    };
  }
}

export async function updateIpAccessRule(
  id: string,
  data: {
    ip?: string;
    type?: string;
    label?: string;
    isActive?: boolean;
    expiresAt?: string | null;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const response = await fetch(`${BACKEND_URL}/api/admin/ip-rules/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.message || "Failed to update IP access rule" };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update IP access rule",
    };
  }
}

export async function deleteIpAccessRule(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const response = await fetch(`${BACKEND_URL}/api/admin/ip-rules/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.message || "Failed to delete IP access rule" };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete IP access rule",
    };
  }
}
