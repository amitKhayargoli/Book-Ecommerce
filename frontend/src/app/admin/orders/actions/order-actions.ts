"use server";

import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/server-config";

// ─── Types ─────────────────────────────────────────────────────────

export interface OrderUser {
  id: string;
  name: string;
  email: string;
}

export interface OrderAddress {
  fullName: string;
  street: string;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
}

export interface OrderItemBook {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  author: { name: string } | null;
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  book: OrderItemBook;
}

export interface AdminOrder {
  id: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentProvider: string;
  paymentTransactionUuid: string;
  paymentRefId: string | null;
  createdAt: string;
  updatedAt: string;
  user: OrderUser;
  address: OrderAddress | null;
  items: OrderItem[];
}

export interface OrdersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OrdersResult {
  success: boolean;
  orders?: AdminOrder[];
  pagination?: OrdersPagination;
  error?: string;
}

// ─── Server Action ─────────────────────────────────────────────────

export async function fetchOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<OrdersResult> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.status) searchParams.set("status", params.status);
    if (params.search) searchParams.set("search", params.search);

    const response = await fetch(
      `${BACKEND_URL}/api/admin/orders?${searchParams.toString()}`,
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
        error: result.message || "Failed to fetch orders",
      };
    }

    return {
      success: true,
      orders: result.orders,
      pagination: result.pagination,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch orders",
    };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const response = await fetch(
      `${BACKEND_URL}/api/admin/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Failed to update order status",
      };
    }

    return { success: true, message: result.message };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update order status",
    };
  }
}
