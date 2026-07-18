"use client";

import { useState, useEffect } from "react";
import { X, Star } from "lucide-react";

interface FormatPriceItem {
  format: string;
  price: number;
}

interface BookFormatSelectorProps {
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
  selectedFormat?: number;
  onFormatChange?: (index: number) => void;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(date?: string) {
  if (!date) return "Unknown";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function getFormatPrice(format: string, formatPrices: FormatPriceItem[], basePrice: number): number {
  const found = formatPrices.find((fp) => fp.format === format);
  return found ? found.price : basePrice;
}

export default function BookFormatSelector({
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
  selectedFormat: controlledIndex,
  onFormatChange,
}: BookFormatSelectorProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const selectedFormat = controlledIndex ?? internalIndex;
  const setSelectedFormat = onFormatChange ?? setInternalIndex;
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Close Size Guide on Escape key
  useEffect(() => {
    if (!showSizeGuide) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSizeGuide(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSizeGuide]);

  // Compute price for the selected format
  const selectedFormatName = formats[selectedFormat];
  const selectedFormatPrice = getFormatPrice(selectedFormatName, formatPrices, basePrice);
  const displayPrice = formatPrice(selectedFormatPrice);

  // Check if this format has a different price vs base price
  const isDiscounted = selectedFormatPrice !== basePrice;

  return (
    <>
      {/* Dynamic Price + Rating */}
      <div className="text-3xl font-semibold mb-6 flex items-center gap-6">
        <span className={isDiscounted ? "text-romance" : "text-white"}>
          {displayPrice}
        </span>

        {isDiscounted && (
          <span className="text-lg text-text-secondary/50 line-through">
            {formatPrice(basePrice)}
          </span>
        )}

        <div className="flex items-center gap-2 text-sm font-normal text-text-secondary border-l border-white/10 pl-6">
          <div className="flex text-romance">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < roundedRating
                    ? "fill-romance text-romance"
                    : "fill-transparent text-romance/40"
                }`}
              />
            ))}
          </div>
          <span>{rating}</span>
          <span className="text-text-secondary/60">({reviewCount} reviews)</span>
        </div>
      </div>

      {/* Format Selector */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="font-medium text-sm text-text-secondary uppercase tracking-widest">
            Format
          </span>
          <button
            onClick={() => setShowSizeGuide(true)}
            className="text-xs text-text-secondary hover:text-white underline decoration-white/30 underline-offset-4 transition-colors"
          >
            Size Guide
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {formats.map((format, idx) => {
            const isSelected = selectedFormat === idx;
            const fmtPrice = getFormatPrice(format, formatPrices, basePrice);
            return (
              <button
                key={format}
                onClick={() => setSelectedFormat(idx)}
                className={`flex flex-col items-center py-3 px-4 rounded-md border text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? "border-romance bg-romance/10 text-white shadow-[0_0_15px_-3px_rgba(255,107,107,0.3)]"
                    : "border-white/10 bg-card hover:bg-white/5 hover:border-white/30 text-text-secondary"
                }`}
              >
                <span>{format}</span>
                <span
                  className={`text-xs mt-0.5 ${
                    isSelected
                      ? "text-romance/80"
                      : "text-text-secondary/50"
                  }`}
                >
                  {formatPrice(fmtPrice)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowSizeGuide(false)}
        >
          <div
            className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Size Guide</h2>
              <button
                onClick={() => setShowSizeGuide(false)}
                className="text-text-secondary hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <SpecItem label="Author" value={author} />
                <SpecItem label="Language" value={language || "English"} />
                <SpecItem label="Selected Format" value={selectedFormatName} />
                <SpecItem
                  label="Price"
                  value={displayPrice}
                />
                <SpecItem label="Genres" value={genres.join(", ") || "General"} />
              </div>

              {publishedAt && (
                <div className="border-t border-white/10 pt-4">
                  <SpecItem
                    label="Publication Date"
                    value={formatDate(publishedAt)}
                  />
                </div>
              )}

              {/* Dimension Placeholder */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-xs text-text-secondary/60 italic">
                  Physical dimensions and weight vary by format. Check with your
                  local retailer for exact measurements.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-secondary/60 uppercase tracking-wider font-medium">
        {label}
      </span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  );
}
