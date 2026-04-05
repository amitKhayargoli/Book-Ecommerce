"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReviewModal from "./ReviewModal";

interface AddReviewButtonProps {
  bookId: string;
}

export default function AddReviewButton({ bookId }: AddReviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setIsOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="border border-white/20 px-5 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition-colors"
      >
        Write a Review
      </button>

      <ReviewModal
        bookId={bookId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
