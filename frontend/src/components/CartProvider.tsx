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
import { useSession } from "next-auth/react";

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

interface CartContextValue {
  count: number;
  bumpKey: number;
  refreshCount: () => Promise<number>;
  getCartItemStatus: (bookId: string) => Promise<{ inCart: boolean; needsAuth: boolean }>;
  addToCart: (bookId: string) => Promise<CartActionResult>;
  removeFromCart: (bookId: string) => Promise<CartActionResult>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [count, setCount] = useState(0);
  const [bumpKey, setBumpKey] = useState(0);

  const refreshCount = useCallback(async (): Promise<number> => {
    let response: Response;
    try {
      response = await fetch("/api/cart/count", { method: "GET", cache: "no-store" });
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
  }, []);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshCount();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refreshCount, status]);

  const addToCart = useCallback(
    async (bookId: string): Promise<CartActionResult> => {
      if (status !== "authenticated") {
        return {
          success: false,
          needsAuth: true,
          message: "Authentication required",
        };
      }

      let response: Response;
      try {
        response = await fetch("/api/cart/items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bookId }),
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
    [refreshCount, status],
  );

  const getCartItemStatus = useCallback(
    async (bookId: string): Promise<{ inCart: boolean; needsAuth: boolean }> => {
      if (status !== "authenticated") {
        return { inCart: false, needsAuth: true };
      }

      let response: Response;
      try {
        response = await fetch(`/api/cart/items/${bookId}/status`, {
          method: "GET",
          cache: "no-store",
        });
      } catch {
        return { inCart: false, needsAuth: false };
      }

      const payload = await parseJson<ApiResponse<CartStatusPayload>>(response);

      if (response.status === 401) {
        return { inCart: false, needsAuth: true };
      }

      if (!response.ok || !payload?.success) {
        return { inCart: false, needsAuth: false };
      }

      return {
        inCart: Boolean(payload.data?.inCart),
        needsAuth: false,
      };
    },
    [status],
  );

  const removeFromCart = useCallback(
    async (bookId: string): Promise<CartActionResult> => {
      if (status !== "authenticated") {
        return {
          success: false,
          needsAuth: true,
          message: "Authentication required",
        };
      }

      let response: Response;
      try {
        response = await fetch(`/api/cart/items/${bookId}`, {
          method: "DELETE",
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
    [refreshCount, status],
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
