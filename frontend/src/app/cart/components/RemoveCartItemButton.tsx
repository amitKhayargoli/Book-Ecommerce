"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { useCart } from "@/components/CartProvider";

interface RemoveCartItemButtonProps {
  bookId: string;
}

export default function RemoveCartItemButton({ bookId }: RemoveCartItemButtonProps) {
  const router = useRouter();
  const { removeFromCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);

  const handleRemove = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const result = await removeFromCart(bookId);

      if (result.needsAuth) {
        router.push(`/login?callbackUrl=${encodeURIComponent("/cart")}`);
        return;
      }

      if (!result.success) {
        return;
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isLoading}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-text-secondary hover:text-white hover:border-white/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {isLoading ? "Removing..." : "Remove"}
    </button>
  );
}
