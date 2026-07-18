"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";

interface AddToCartButtonProps {
  bookId: string;
  format?: string;
}

export default function AddToCartButton({ bookId, format }: AddToCartButtonProps) {
  const router = useRouter();
  const { addToCart, removeFromCart, getCartItemStatus } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isInCart, setIsInCart] = useState(false);
  const [cartFormat, setCartFormat] = useState<string | null | undefined>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load cart status whenever bookId or selected format changes
  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      setIsHydrating(true);
      setErrorMessage(null);
      const result = await getCartItemStatus(bookId);

      if (!isMounted) return;
      setIsInCart(result.inCart);
      setCartFormat(result.currentFormat);
      setIsHydrating(false);
    };

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, [bookId, format, getCartItemStatus]);

  const sameFormatInCart = isInCart && cartFormat === (format ?? null);
  const otherFormatInCart = isInCart && !sameFormatInCart;

  const handleToggleCart = async () => {
    if (isLoading || isHydrating) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      let result;

      if (sameFormatInCart) {
        // Exact same format in cart → remove it
        result = await removeFromCart(bookId, format);
      } else {
        // Not in cart, or same book different format → add / switch format
        // Backend handles: if different format exists, it removes old + adds new
        result = await addToCart(bookId, format);
      }

      if (result.needsAuth) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/books/${bookId}`)}`);
        return;
      }

      if (!result.success) {
        setErrorMessage(result.message ?? "Failed to update cart. Please try again.");
        return;
      }

      // Re-fetch status to reflect the new state
      const newStatus = await getCartItemStatus(bookId);
      setIsInCart(newStatus.inCart);
      setCartFormat(newStatus.currentFormat);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = isHydrating
    ? "Loading..."
    : isLoading
      ? sameFormatInCart
        ? "Removing..."
        : "Adding..."
      : sameFormatInCart
        ? "Remove from cart"
        : otherFormatInCart
          ? `In Cart (${cartFormat})`
          : "Add to Cart";

  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={handleToggleCart}
        disabled={isLoading || isHydrating}
        className="w-full bg-white text-black font-semibold py-4 px-8 rounded-full hover:bg-gray-200 transition-colors duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {buttonText}
      </button>
      {errorMessage && (
        <p className="mt-2 text-xs text-red-400 text-center">{errorMessage}</p>
      )}
      {otherFormatInCart && !isLoading && (
        <p className="mt-1.5 text-xs text-gray-400 text-center">
          Click to switch to {format}
        </p>
      )}
    </div>
  );
}
