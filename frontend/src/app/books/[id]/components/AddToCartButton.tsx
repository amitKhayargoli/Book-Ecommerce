"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";

interface AddToCartButtonProps {
  bookId: string;
}

export default function AddToCartButton({ bookId }: AddToCartButtonProps) {
  const router = useRouter();
  const { addToCart, removeFromCart, getCartItemStatus } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isInCart, setIsInCart] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      setIsHydrating(true);
      const result = await getCartItemStatus(bookId);

      if (!isMounted) return;
      setIsInCart(result.inCart);
      setIsHydrating(false);
    };

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, [bookId, getCartItemStatus]);

  const handleToggleCart = async () => {
    if (isLoading || isHydrating) return;

    setIsLoading(true);
    try {
      const result = isInCart ? await removeFromCart(bookId) : await addToCart(bookId);

      if (result.needsAuth) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/books/${bookId}`)}`);
        return;
      }

      if (!result.success) {
        return;
      }

      if (isInCart) {
        if (result.data?.removed) {
          setIsInCart(false);
        }
      } else {
        setIsInCart(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = isHydrating
    ? "Loading..."
    : isLoading
      ? isInCart
        ? "Removing..."
        : "Adding..."
      : isInCart
        ? "Remove from cart"
        : "Add to Cart";

  return (
    <button
      type="button"
      onClick={handleToggleCart}
      disabled={isLoading || isHydrating}
      className="flex-1 bg-white text-black font-semibold py-4 px-8 rounded-full hover:bg-gray-200 transition-colors duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {buttonText}
    </button>
  );
}
