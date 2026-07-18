"use client";

import { useState } from "react";
import BookFormatSelector from "./BookFormatSelector";
import AddToCartButton from "./AddToCartButton";
import WishlistButton from "./WishlistButton";

interface FormatPriceItem {
  format: string;
  price: number;
}

interface BookFormatSectionProps {
  formats: string[];
  formatPrices: FormatPriceItem[];
  basePrice: number;
  rating: number;
  roundedRating: number;
  reviewCount: number;
  language?: string;
  publishedAt?: string;
  genres: string[];
  author: string;
  bookId: string;
}

export default function BookFormatSection({
  formats,
  formatPrices,
  basePrice,
  rating,
  roundedRating,
  reviewCount,
  language,
  publishedAt,
  genres,
  author,
  bookId,
}: BookFormatSectionProps) {
  const [selectedFormat, setSelectedFormat] = useState(0);
  const formatName = formats[selectedFormat];

  return (
    <>
      <BookFormatSelector
        formats={formats}
        formatPrices={formatPrices}
        basePrice={basePrice}
        rating={rating}
        roundedRating={roundedRating}
        reviewCount={reviewCount}
        language={language}
        publishedAt={publishedAt}
        genres={genres}
        author={author}
        selectedFormat={selectedFormat}
        onFormatChange={setSelectedFormat}
      />

      <div className="flex gap-4 items-center">
        <AddToCartButton bookId={bookId} format={formatName} />
        <WishlistButton bookId={bookId} />
      </div>
    </>
  );
}
