"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReviewModal from "./ReviewModal";
import { getMyReviewAction } from "../actions/review-actions";
import type { ReviewItem } from "@/lib/api/reviews";

interface AddReviewButtonProps {
  bookId: string;
}

export default function AddReviewButton({ bookId }: AddReviewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [myReview, setMyReview] = useState<ReviewItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMyReview = async () => {
      try {
        const result = await getMyReviewAction(bookId);
        if (result.success && result.data) {
          setMyReview(result.data);
        }
      } catch {
        // Silently default to no review
      } finally {
        setIsLoading(false);
      }
    };

    void fetchMyReview();
  }, [bookId]);

  const handleSuccess = () => {
    setIsOpen(false);
    router.refresh();
  };

  const handleOpen = () => {
    // Refetch the latest review data when opening
    const fetchLatest = async () => {
      try {
        const result = await getMyReviewAction(bookId);
        if (result.success && result.data) {
          setMyReview(result.data);
        } else {
          setMyReview(null);
        }
      } catch {
        setMyReview(null);
      }
    };
    void fetchLatest();
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={isLoading}
        className="border border-white/20 px-5 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
      >
        {myReview ? "Edit Your Review" : "Write a Review"}
      </button>

      <ReviewModal
        key={`review-${bookId}-${isOpen ? myReview?.id ?? 'new' : 'closed'}`}
        bookId={bookId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={handleSuccess}
        initialReview={myReview}
      />
    </>
  );
}
