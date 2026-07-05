"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const SORT_OPTIONS = [
  { label: "Newest First", sortBy: "createdAt", sortOrder: "desc" },
  { label: "Highest Rating", sortBy: "rating", sortOrder: "desc" },
  { label: "Lowest Rating", sortBy: "rating", sortOrder: "asc" },
] as const;

export default function ReviewSortDropdown() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSortBy = searchParams.get("sortBy") || "createdAt";
  const currentSortOrder = searchParams.get("sortOrder") || "desc";

  const currentLabel =
    SORT_OPTIONS.find(
      (o) => o.sortBy === currentSortBy && o.sortOrder === currentSortOrder,
    )?.label || "Most Relevant";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const option = SORT_OPTIONS[Number(e.target.value)];
      if (!option) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("sortBy", option.sortBy);
      params.set("sortOrder", option.sortOrder);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const selectedIndex = SORT_OPTIONS.findIndex(
    (o) => o.sortBy === currentSortBy && o.sortOrder === currentSortOrder,
  );

  return (
    <select
      className="bg-card-hover text-sm font-medium outline-none cursor-pointer px-3 py-2 rounded-lg border border-white/10"
      value={selectedIndex >= 0 ? selectedIndex : 0}
      onChange={handleChange}
    >
      {SORT_OPTIONS.map((opt, i) => (
        <option key={i} className="bg-card-hover text-white" value={i}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
