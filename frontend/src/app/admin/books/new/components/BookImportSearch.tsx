import { Search, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { OpenLibraryResult } from "../types";
import { searchMockOpenLibrary as searchOpenLibrary } from "../services/mockOpenLibrary";
import { SearchSkeleton } from "./LoadingSkeletons";
import { EmptyState } from "./EmptyState";
import { SearchResultCard } from "./SearchResultCard";

interface BookImportSearchProps {
  onImportBook: (book: OpenLibraryResult) => void;
  selectedKey?: string;
}

export function BookImportSearch({ onImportBook, selectedKey }: BookImportSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<OpenLibraryResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceTimeout = useRef<NodeJS.Timeout>(null);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const data = await searchOpenLibrary(searchQuery);
      setResults(data);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // Debounce effect
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (query) {
      debounceTimeout.current = setTimeout(() => {
        performSearch(query);
      }, 500); // 500ms debounce
    } else {
      setResults([]);
      setHasSearched(false);
    }

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    performSearch(query);
  };

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[32px] overflow-hidden shadow-2xl xl:sticky xl:top-24" style={{ maxHeight: "calc(100vh - 120px)" }}>
      <div className="p-8 border-b border-white/5 bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Search className="w-6 h-6 text-white/70" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-semibold text-white leading-tight">Import Book</h2>
            <p className="text-sm text-text-secondary mt-1 opacity-70">Search metadata from Open Library</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-white transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or ISBN..."
            className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all shadow-inner font-medium text-base"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
            </div>
          )}
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 min-h-[300px] scrollbar-hide">
        {!hasSearched && query.length === 0 && (
          <EmptyState isSearch />
        )}

        {isSearching && results.length === 0 && (
          <SearchSkeleton count={4} />
        )}

        {hasSearched && !isSearching && results.length === 0 && (
          <EmptyState />
        )}

        {results.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {results.map((book) => (
              <SearchResultCard 
                key={book.key} 
                book={book} 
                onImport={onImportBook}
                isSelected={selectedKey === book.key}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
