"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface PublicBookItem {
  id: string;
  title: string;
  author: string;
  genres: string[];
  coverUrl?: string;
}

interface PublicBooksCatalogProps {
  books: PublicBookItem[];
}

const ITEMS_PER_PAGE = 10;

export function PublicBooksCatalog({ books }: PublicBooksCatalogProps) {
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const genres = useMemo(() => {
    const unique = new Set<string>();
    for (const book of books) {
      for (const genre of book.genres) unique.add(genre);
    }
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [books]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setCurrentPage(1);
  };

  const handleGenreChange = (g: string) => {
    setSelectedGenre(g);
    setCurrentPage(1);
  };

  const filteredBooks = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return books.filter((book) => {
      const matchesQuery =
        !normalized ||
        book.title.toLowerCase().includes(normalized) ||
        book.author.toLowerCase().includes(normalized) ||
        book.genres.some((genre) => genre.toLowerCase().includes(normalized));

      const matchesGenre =
        selectedGenre === "all" || book.genres.includes(selectedGenre);

      return matchesQuery && matchesGenre;
    });
  }, [books, query, selectedGenre]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBooks.length / ITEMS_PER_PAGE),
  );
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b border-white/10 pb-10">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4 text-foreground"
          >
            Discover
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-text-secondary text-base md:text-lg max-w-xl font-sans"
          >
            Explore our curated collection of books spanning across multiple
            genres. Find your next great read.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 w-full md:w-auto"
        >
          <div className="relative group w-full sm:w-72">
            {/* <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white group-focus-within:text-white transition-colors" strokeWidth={1.5} /> */}
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white z-10 pointer-events-none"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search library..."
              className="w-full h-14 pl-12 pr-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all font-sans"
            />
          </div>
          <div className="relative w-full sm:w-56">
            <select
              value={selectedGenre}
              onChange={(e) => handleGenreChange(e.target.value)}
              className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-white pl-5 pr-12 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all appearance-none cursor-pointer font-sans"
            >
              {genres.map((genre) => (
                <option
                  key={genre}
                  value={genre}
                  className="bg-card-hover text-white py-2"
                >
                  {genre === "all" ? "All Genres" : genre}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-12">
        <AnimatePresence mode="popLayout">
          {paginatedBooks.map((book, i) => (
            <motion.div
              key={book.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.4,
                delay: i * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group"
            >
              <Link href={`/books/${book.id}`} className="block">
                <div className="relative aspect-[2/3] w-full rounded-3xl overflow-hidden bg-card/40 border border-white/[0.08] mb-5 group-hover:border-white/20 transition-all duration-500 shadow-xl group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />

                  {book.coverUrl ? (
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary">
                      <BookOpen className="w-12 h-12 mb-3 opacity-20" />
                      <span className="text-sm font-medium tracking-widest uppercase opacity-40">
                        No Cover
                      </span>
                    </div>
                  )}


                </div>

                <div className="px-1">
                  <h3 className="text-base md:text-lg font-display font-semibold truncate text-foreground group-hover:text-romance transition-colors duration-300">
                    {book.title}
                  </h3>
                  <p className="text-xs md:text-sm text-text-secondary mt-1 md:mt-1.5 font-sans">
                    {book.author}
                  </p>
                  <div className="flex gap-2 flex-wrap mt-4">
                    {book.genres.slice(0, 3).map((genre) => (
                      <span
                        key={genre}
                        className="text-[10px] font-sans uppercase tracking-[0.15em] px-3 py-1 rounded-full border border-white/10 text-text-secondary group-hover:border-white/30 group-hover:text-white/80 transition-colors"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredBooks.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-32 text-center"
        >
          <BookOpen className="w-16 h-16 mx-auto text-white/80 mb-6" />
          <h2 className="text-2xl font-display font-semibold mb-2">
            No books found
          </h2>
          <p className="text-text-secondary">
            Try adjusting your search or category filter to find what you're
            looking for.
          </p>
        </motion.div>
      )}

      {/* Pagination */}
      <div className="flex justify-center items-center gap-6 pt-16 mt-8 border-t border-white/5">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/5 hover:border-white/30 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-sm font-medium tracking-wide">
          Page <span className="text-white">{currentPage}</span> of{" "}
          <span className="text-text-secondary">{totalPages}</span>
        </span>

        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/5 hover:border-white/30 transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
