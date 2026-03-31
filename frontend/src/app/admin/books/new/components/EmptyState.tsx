import { Search, SearchX } from "lucide-react";

interface EmptyStateProps {
  isSearch?: boolean;
}

export function EmptyState({ isSearch }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-700/50 rounded-2xl bg-slate-800/10 h-64">
      {isSearch ? (
        <>
          <Search className="w-10 h-10 text-slate-500 mb-4" />
          <h3 className="text-slate-300 font-medium mb-1">Search Open Library</h3>
          <p className="text-sm text-slate-500">
            Find book metadata by title, author, or ISBN to quickly populate the form.
          </p>
        </>
      ) : (
        <>
          <SearchX className="w-10 h-10 text-slate-500 mb-4" />
          <h3 className="text-slate-300 font-medium mb-1">No results found</h3>
          <p className="text-sm text-slate-500">
            We couldn't find any books matching your query. Try a different search term.
          </p>
        </>
      )}
    </div>
  );
}
