"use client";

import { useState, useRef } from "react";
import { Star, X, ImagePlus, Loader2 } from "lucide-react";
import { addReviewAction, updateReviewAction } from "../actions/review-actions";
import Image from "next/image";

interface InitialReviewData {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
}

interface ReviewModalProps {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialReview?: InitialReviewData | null;
}

const MAX_IMAGES = 5;

export default function ReviewModal({ bookId, isOpen, onClose, onSuccess, initialReview }: ReviewModalProps) {
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(initialReview?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(initialReview?.images ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!initialReview;

  // Reset form when modal opens with new initialReview
  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - imageFiles.length - existingImages.length;
    const selected = files.slice(0, remaining);

    setImageFiles((prev) => [...prev, ...selected]);
    setImagePreviews((prev) => [
      ...prev,
      ...selected.map((f) => URL.createObjectURL(f)),
    ]);

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      URL.revokeObjectURL(imagePreviews[index]);
      setImageFiles((prev) => prev.filter((_, i) => i !== index));
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const allImages = [...existingImages];
      const payload = { rating, comment: comment || undefined, images: allImages.length > 0 ? allImages : undefined };

      let response;
      if (isEditing && initialReview) {
        response = await updateReviewAction(bookId, initialReview.id, payload, imageFiles);
      } else {
        response = await addReviewAction(bookId, payload, imageFiles);
      }

      if (response.success) {
        // Cleanup object URLs
        imagePreviews.forEach((p) => URL.revokeObjectURL(p));
        setRating(0);
        setComment("");
        setImageFiles([]);
        setImagePreviews([]);
        setExistingImages([]);
        onSuccess();
      } else {
        setError(response.message || "Failed to save review.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6">
          <h2 className="text-xl font-bold text-foreground">{isEditing ? "Edit Your Review" : "Write a Review"}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          {error && (
            <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={`${
                      star <= (hoverRating || rating)
                        ? "fill-romance text-romance"
                        : "text-muted-foreground/30"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="comment">
              Comment <span className="text-muted-foreground/50 text-xs font-normal">(Optional)</span>
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-3 text-foreground focus:ring-2 ring-romance focus:outline-none placeholder:text-muted-foreground/50 resize-none h-32 transition-all"
              placeholder="What did you think about this book?"
            />
          </div>

          {/* Image Upload Section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              Photos <span className="text-muted-foreground/50 text-xs font-normal">(Optional, max {MAX_IMAGES})</span>
            </label>

            {/* All images: existing + new uploads */}
            {(existingImages.length > 0 || imagePreviews.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-2">
                {/* Existing images (from previous review) */}
                {existingImages.map((url, idx) => (
                  <div key={`existing-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                    <Image
                      src={url}
                      alt={`Review photo ${idx + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx, true)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}

                {/* New image previews */}
                {imagePreviews.map((preview, idx) => (
                  <div key={`new-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                    <Image
                      src={preview}
                      alt={`New photo ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx, false)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}

                {/* Add more button */}
                {(existingImages.length + imagePreviews.length) < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-romance transition-colors"
                  >
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            {/* Add images button (shown when no images selected yet) */}
            {existingImages.length === 0 && imagePreviews.length === 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                Add photos
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-foreground hover:bg-muted transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-romance text-black px-6 py-2.5 rounded-full font-bold hover:bg-romance/90 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isEditing ? "Update Review" : "Submit Review"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
