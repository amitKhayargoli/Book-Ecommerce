"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";

interface WishlistButtonProps {
  bookId: string;
}

interface WishlistMutationResponse {
  success: boolean;
  message?: string;
  data?: {
    wishlistId: string | null;
    bookId: string;
    added?: boolean;
    removed?: boolean;
  };
}

interface WishlistStatusResponse {
  success: boolean;
  message?: string;
  data?: {
    bookId: string;
    inWishlist: boolean;
  };
}

export default function WishlistButton({ bookId }: WishlistButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      setIsHydrating(true);

      try {
        const response = await fetch(`/api/wishlist/items/${bookId}/status`, {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 401) {
          if (isMounted) setIsAdded(false);
          return;
        }

        const result = (await response.json()) as WishlistStatusResponse;
        if (!response.ok || !result.success) {
          return;
        }

        if (isMounted) {
          setIsAdded(Boolean(result.data?.inWishlist));
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, [bookId]);

  const handleToggleWishlist = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = isAdded
        ? await fetch(`/api/wishlist/items/${bookId}`, {
            method: "DELETE",
          })
        : await fetch("/api/wishlist/items", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ bookId }),
          });

      const result = (await response.json()) as WishlistMutationResponse;

      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/books/${bookId}`)}`);
        return;
      }

      if (!response.ok || !result.success) {
        return;
      }

      if (isAdded) {
        const removed = Boolean(result.data?.removed);
        setIsAdded(!removed);
      } else {
        setIsAdded(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleWishlist}
      disabled={isLoading || isHydrating}
      aria-label={isAdded ? "Added to wishlist" : "Add to wishlist"}
      className="h-[56px] w-[56px] flex items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors duration-300 flex-shrink-0 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <Heart
        className={`w-5 h-5 transition-colors ${isAdded ? "fill-romance text-romance" : "fill-transparent"}`}
      />
    </button>
  );
}
