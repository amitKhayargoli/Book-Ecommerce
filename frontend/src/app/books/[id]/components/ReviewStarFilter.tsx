"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Star, X } from "lucide-react";

interface RatingRow {
  star: number;
  count: number;
  pct: number;
}

export default function ReviewStarFilter({ breakdown }: { breakdown: RatingRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeRating = searchParams.get("rating");

  const handleFilterClick = useCallback(
    (star: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (activeRating === String(star)) {
        params.delete("rating");
      } else {
        params.set("rating", String(star));
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, activeRating],
  );

  const handleClearFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("rating");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Rating</h3>
        {activeRating && (
          <button
            onClick={handleClearFilter}
            className="text-xs text-text-secondary hover:text-white flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
      {breakdown.map((row) => (
        <button
          key={row.star}
          onClick={() => handleFilterClick(row.star)}
          className={`flex items-center gap-4 text-sm font-medium w-full py-2 px-2 rounded-lg transition-colors ${
            activeRating === String(row.star)
              ? "bg-romance/10 text-white"
              : "text-text-secondary hover:text-white hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-1 w-8">
            <span>{row.star}</span>
            <Star className="w-3 h-3 fill-current" />
          </div>
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                activeRating === String(row.star)
                  ? "bg-romance"
                  : "bg-white"
              }`}
              style={{ width: `${row.pct}%` }}
            />
          </div>
          <div className="w-10 text-right">{row.count}</div>
        </button>
      ))}
    </div>
  );
}
