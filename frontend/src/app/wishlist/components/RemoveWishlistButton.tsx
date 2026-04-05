"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RemoveWishlistButtonProps {
  bookId: string;
}

export default function RemoveWishlistButton({ bookId }: RemoveWishlistButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleRemove = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/wishlist/items/${bookId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent("/wishlist")}`);
        return;
      }

      if (!response.ok) {
        return;
      }

      setShowModal(false);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}
        disabled={isLoading}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-lg group z-20"
        aria-label="Remove from wishlist"
      >
        <Heart className="w-5 h-5 fill-current" />
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="bg-[#111111] border border-white/10 shadow-2xl rounded-2xl p-6 max-w-sm w-full relative overflow-hidden"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-romance to-purple-500" />
              <h3 className="font-display text-xl font-bold mb-2">Remove from wishlist?</h3>
              <p className="text-text-secondary text-sm mb-6">
                Are you sure you want to remove this book from your wishlist?
              </p>
              
              <div className="flex gap-3 justify-end items-center mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowModal(false);
                  }}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-full text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove();
                  }}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50 group"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart className="w-4 h-4 fill-black group-hover:scale-110 transition-transform" />
                  )}
                  {isLoading ? "Removing..." : "Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
