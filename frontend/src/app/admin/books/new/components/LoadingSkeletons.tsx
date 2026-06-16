import { cn } from "../utils";

export function SearchSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/20 animate-pulse">
          <div className="w-16 h-24 bg-slate-700/50 rounded-md shrink-0" />
          <div className="flex-1 space-y-3 py-2">
            <div className="h-4 bg-slate-700/50 rounded-md w-3/4" />
            <div className="h-3 bg-slate-700/50 rounded-md w-1/2" />
            <div className="h-3 bg-slate-700/50 rounded-md w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
