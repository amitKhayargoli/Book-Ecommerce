import { cn } from "../utils";

interface GenreSelectorProps {
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
}

const GENRE_OPTIONS = [
  "Romance", "Comedy", "Tragedy", "Fantasy", 
  "Science Fiction", "Mystery", "Thriller", 
  "Horror", "Adventure", "Drama"
];

export function GenreSelector({ selectedGenres, onChange }: GenreSelectorProps) {
  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      onChange(selectedGenres.filter(g => g !== genre));
    } else {
      onChange([...selectedGenres, genre]);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {GENRE_OPTIONS.map((genre) => {
        const isSelected = selectedGenres.includes(genre);
        return (
          <button
            key={genre}
            type="button"
            onClick={() => toggleGenre(genre)}
            className={cn(
              "px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 border uppercase tracking-widest",
              isSelected 
                ? "bg-white text-black border-white shadow-xl shadow-white/10 scale-105" 
                : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white hover:border-white/10"
            )}
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}
