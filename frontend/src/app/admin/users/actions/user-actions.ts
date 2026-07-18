"use server";

import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/server-config";

// ─── Types ─────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  provider: string;
  isMfaEnabled: boolean;
  emailVerified: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    orders: number;
    reviews: number;
    addresses: number;
  };
}

export interface UsersMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UsersResult {
  success: boolean;
  data?: AdminUser[];
  meta?: UsersMeta;
  error?: string;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

// ─── Server Actions ─────────────────────────────────────────────────

export async function fetchUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<UsersResult> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.search) searchParams.set("search", params.search);

    const response = await fetch(
      `${BACKEND_URL}/api/admin/users?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Failed to fetch users",
      };
    }

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch users",
    };
  }
}

export async function deleteUser(
  userId: string,
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const response = await fetch(
      `${BACKEND_URL}/api/admin/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Failed to delete user",
      };
    }

    return { success: true, message: result.message };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete user",
    };
  }
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const response = await fetch(
      `${BACKEND_URL}/api/admin/users/${userId}/role`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Failed to update user role",
      };
    }

    return { success: true, message: result.message };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update user role",
    };
  }
}
