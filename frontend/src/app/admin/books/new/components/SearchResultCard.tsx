import { BookPlus, User, Hash, Library } from "lucide-react";
import { OpenLibraryResult } from "../types";
import { cn } from "../utils";

interface SearchResultCardProps {
  book: OpenLibraryResult;
  onImport: (book: OpenLibraryResult) => void;
  isSelected?: boolean;
}

export function SearchResultCard({ book, onImport, isSelected }: SearchResultCardProps) {
  return (
    <div 
      className={cn(
        "flex gap-5 p-5 rounded-2xl border transition-all duration-500 relative overflow-hidden group",
        isSelected 
          ? "bg-white/10 border-white/20 shadow-lg shadow-white/5" 
          : "bg-white/[0.03] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
      )}
    >
      <div className="w-[84px] h-[126px] shrink-0 bg-black/40 rounded-xl overflow-hidden border border-white/5 shadow-2xl relative group-hover:scale-[1.02] transition-transform duration-500">
        {book.coverImage ? (
          <img 
            src={book.coverImage} 
            alt={book.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            onError={(e) => { 
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
            }} 
          />
        ) : null}
        <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 text-white/30 gap-2 absolute inset-0 z-0" style={{ display: book.coverImage ? 'none' : 'flex' }}>
            <Library className="w-7 h-7 opacity-50" />
            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">No Cover</span>
        </div>
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col pt-1">
        <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="font-display font-semibold text-white text-lg truncate flex-1 leading-tight group-hover:text-white transition-colors">{book.title}</h4>
            {isSelected && (
                <span className="shrink-0 text-[10px] font-bold tracking-[0.2em] text-white bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full uppercase">Selected</span>
            )}
        </div>
        
        <div className="text-sm text-text-secondary mb-5 space-y-2 flex-1">
          {book.authors.length > 0 && (
            <div className="flex items-center gap-2 truncate opacity-80">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate font-medium">{book.authors.join(", ")}</span>
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium tracking-wide opacity-60">
            {book.year && <span className="bg-white/5 px-2 py-0.5 rounded">{book.year}</span>}
            {book.isbn && (
              <div className="flex items-center gap-1.5">
                <Hash className="w-3 h-3" />
                <span>{book.isbn}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-auto">
          <button
            type="button"
            onClick={() => onImport(book)}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95",
              isSelected 
                ? "bg-white/10 text-white border border-white/20 hover:bg-white/20" 
                : "bg-white text-black hover:bg-white/90 shadow-xl shadow-white/5"
            )}
          >
            <BookPlus className="w-4 h-4" />
            {isSelected ? "Import Again" : "Import metadata"}
          </button>
        </div>
      </div>
    </div>
  );
}
