"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

interface ImageGalleryProps {
  images: string[];
  title: string;
}

function isLocalUpload(url: string): boolean {
  return url.startsWith("http://localhost:4000/") || url.startsWith("http://backend:3001/");
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleThumbnailHover = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleThumbnailClick = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  if (images.length === 0) {
    return (
      <div className="bg-card w-full aspect-[3/4] md:aspect-square rounded-xl flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-scifi/5 to-transparent opacity-50" />
        <div className="text-text-secondary/40 text-sm">No image available</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main Preview */}
      <div className="bg-card w-full aspect-[3/4] md:aspect-square rounded-xl flex items-center justify-center p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-scifi/5 to-transparent opacity-50 pointer-events-none" />
        <Image
          src={images[selectedIndex]}
          alt={title}
          width={400}
          height={600}
          className="object-contain w-full h-full max-h-[600px] z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 ease-out group-hover:scale-105"
          priority={selectedIndex === 0}
          unoptimized={isLocalUpload(images[selectedIndex])}
          draggable={false}
        />
        {/* Image counter badge */}
        <div className="absolute bottom-4 right-4 z-20 bg-black/50 backdrop-blur-sm text-white/80 text-xs px-3 py-1.5 rounded-full border border-white/10 pointer-events-none">
          {selectedIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div className="grid grid-cols-4 gap-4">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => handleThumbnailClick(idx)}
            onMouseEnter={() => handleThumbnailHover(idx)}
            className={`
              bg-card aspect-square rounded-lg flex items-center justify-center p-2
              relative overflow-hidden border transition-all duration-200
              ${
                idx === selectedIndex
                  ? "border-romance/60 ring-1 ring-romance/30"
                  : "border-white/5 hover:border-white/20"
              }
            `}
            aria-label={`View image ${idx + 1}`}
          >
            <Image
              src={img}
              alt={`${title} thumbnail ${idx + 1}`}
              width={100}
              height={150}
              className="object-contain w-full h-full max-h-[100px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
              unoptimized={isLocalUpload(img)}
              draggable={false}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
