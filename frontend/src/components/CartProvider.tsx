"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "@/lib/session-context";

interface CartCountPayload {
  itemsCount: number;
}

interface CartMutationPayload {
  cartId: string | null;
  bookId: string;
  added?: boolean;
  removed?: boolean;
}

interface CartStatusPayload {
  bookId: string;
  inCart: boolean;
  currentFormat?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface CartActionResult {
  success: boolean;
  needsAuth: boolean;
  message?: string;
  data?: CartMutationPayload;
}

interface CartItemStatusResult {
  inCart: boolean;
  needsAuth: boolean;
  currentFormat?: string | null;
}

interface CartContextValue {
  count: number;
  bumpKey: number;
  refreshCount: () => Promise<number>;
  getCartItemStatus: (bookId: string) => Promise<CartItemStatusResult>;
  addToCart: (bookId: string, format?: string) => Promise<CartActionResult>;
  removeFromCart: (bookId: string, format?: string) => Promise<CartActionResult>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Backend URL that works from the browser (client-side).
 * Uses the public env var, falling back to the Docker-exposed port 4000.
 */
const BACKEND_URL =
  (typeof process !== "undefined"
    ? process.env?.NEXT_PUBLIC_BACKEND_URL
    : undefined) ?? "http://localhost:4000";

export default function CartProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [count, setCount] = useState(0);
  const [bumpKey, setBumpKey] = useState(0);

  const accessToken = session?.accessToken;

  const refreshCount = useCallback(async (): Promise<number> => {
    // If no token is available yet, skip the call
    // The callers (useEffect, mutations) will re-invoke once the session is ready
    const token = session?.accessToken;
    if (!token) {
      setCount(0);
      return 0;
    }

    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}/api/cart/count`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
    } catch {
      setCount(0);
      return 0;
    }

    const payload = await parseJson<ApiResponse<CartCountPayload>>(response);

    if (response.status === 401) {
      setCount(0);
      return 0;
    }

    const nextCount =
      payload?.success && typeof payload.data?.itemsCount === "number"
        ? payload.data.itemsCount
        : 0;

    setCount(nextCount);
    return nextCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  useEffect(() => {
    if (status === "loading") return;

    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchWithRetry = async () => {
      if (cancelled) return;
      const nextCount = await refreshCount();
      // If count is 0 but we're authenticated, the session might not
      // have propagated yet (race after login). Retry with backoff.
      if (nextCount === 0 && status === "authenticated" && retryCount < maxRetries && !cancelled) {
        retryCount++;
        window.setTimeout(fetchWithRetry, 300 * retryCount);
      }
    };

    const timer = window.setTimeout(fetchWithRetry, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [refreshCount, status]);

  const getCartItemStatus = useCallback(
    async (bookId: string): Promise<CartItemStatusResult> => {
      if (status !== "authenticated" || !accessToken) {
        return { inCart: false, needsAuth: true, currentFormat: null };
      }

      let response: Response;
      try {
        response = await fetch(`${BACKEND_URL}/api/cart/items/${bookId}/status`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });
      } catch {
        return { inCart: false, needsAuth: false, currentFormat: null };
      }

      const payload = await parseJson<ApiResponse<CartStatusPayload>>(response);

      if (response.status === 401) {
        return { inCart: false, needsAuth: true, currentFormat: null };
      }

      if (!response.ok || !payload?.success) {
        return { inCart: false, needsAuth: false, currentFormat: null };
      }

      return {
        inCart: Boolean(payload.data?.inCart),
        needsAuth: false,
        currentFormat: payload.data?.currentFormat ?? null,
      };
    },
    [accessToken, status],
  );

  const addToCart = useCallback(
    async (bookId: string, format?: string): Promise<CartActionResult> => {
      if (status !== "authenticated" || !accessToken) {
        return {
          success: false,
          needsAuth: true,
          message: "Authentication required",
        };
      }

      let response: Response;
      try {
        response = await fetch(`${BACKEND_URL}/api/cart/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ bookId, format }),
        });
      } catch {
        return {
          success: false,
          needsAuth: false,
          message: "Failed to add item to cart",
        };
      }

      const payload = await parseJson<ApiResponse<CartMutationPayload>>(response);

      if (response.status === 401) {
        return {
          success: false,
          needsAuth: true,
          message: payload?.message ?? "Authentication required",
        };
      }

      if (!response.ok || !payload?.success) {
        return {
          success: false,
          needsAuth: false,
          message: payload?.message ?? "Failed to add item to cart",
          data: payload?.data,
        };
      }

      if (payload.data?.added) {
        setBumpKey((value) => value + 1);
      }

      await refreshCount();

      return {
        success: true,
        needsAuth: false,
        message: payload.message,
        data: payload.data,
      };
    },
    [accessToken, refreshCount, status],
  );

  const removeFromCart = useCallback(
    async (bookId: string, format?: string): Promise<CartActionResult> => {
      if (status !== "authenticated" || !accessToken) {
        return {
          success: false,
          needsAuth: true,
          message: "Authentication required",
        };
      }

      let response: Response;
      try {
        const removeUrl = format
          ? `${BACKEND_URL}/api/cart/items/${bookId}?format=${encodeURIComponent(format)}`
          : `${BACKEND_URL}/api/cart/items/${bookId}`;
        response = await fetch(removeUrl, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch {
        return {
          success: false,
          needsAuth: false,
          message: "Failed to remove item from cart",
        };
      }

      const payload = await parseJson<ApiResponse<CartMutationPayload>>(response);

      if (response.status === 401) {
        return {
          success: false,
          needsAuth: true,
          message: payload?.message ?? "Authentication required",
        };
      }

      if (!response.ok || !payload?.success) {
        return {
          success: false,
          needsAuth: false,
          message: payload?.message ?? "Failed to remove item from cart",
          data: payload?.data,
        };
      }

      if (payload.data?.removed) {
        await refreshCount();
      }

      return {
        success: true,
        needsAuth: false,
        message: payload.message,
        data: payload.data,
      };
    },
    [accessToken, refreshCount, status],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      count,
      bumpKey,
      refreshCount,
      getCartItemStatus,
      addToCart,
      removeFromCart,
    }),
    [count, bumpKey, refreshCount, getCartItemStatus, addToCart, removeFromCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
