"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { AdminBookItem } from "../page";

interface BooksCatalogProps {
  books: AdminBookItem[];
}

type VerificationFilter = "all" | "verified" | "unverified";

export function BooksCatalog({ books }: BooksCatalogProps) {
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");

  const genres = useMemo(() => {
    const unique = new Set<string>();
    for (const book of books) {
      for (const genre of book.frontendGenres ?? []) unique.add(genre);
    }
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [books]);

  const filteredBooks = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return books.filter((book) => {
      const matchesQuery =
        !normalized ||
        book.title.toLowerCase().includes(normalized) ||
        book.author.toLowerCase().includes(normalized) ||
        book.id.toLowerCase().includes(normalized) ||
        (book.frontendGenres ?? []).some((genre) =>
          genre.toLowerCase().includes(normalized),
        );

      const matchesGenre =
        selectedGenre === "all" ||
        (book.frontendGenres ?? []).includes(selectedGenre);

      const isVerified = Boolean(book.verified);
      const matchesVerification =
        verificationFilter === "all" ||
        (verificationFilter === "verified" && isVerified) ||
        (verificationFilter === "unverified" && !isVerified);

      return matchesQuery && matchesGenre && matchesVerification;
    });
  }, [books, query, selectedGenre, verificationFilter]);

  return (
    <div className="space-y-8">
      <section className="rounded-[40px] border border-white/5 bg-card/40 backdrop-blur-3xl px-8 py-8 md:px-10 md:py-9">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <p className="text-xs tracking-[0.35em] uppercase text-text-secondary mb-3">
              Admin Catalog
            </p>
            <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-2">
              All Books
            </h1>
            <p className="text-text-secondary text-sm md:text-base">
              Search and filter by title, author, genre, and verification
              status.
            </p>
          </div>
          <div className="text-sm text-text-secondary">
            Showing{" "}
            <span className="text-white font-semibold">
              {filteredBooks.length}
            </span>{" "}
            of <span className="text-white font-semibold">{books.length}</span>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/5 bg-card/30 backdrop-blur-3xl p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="xl:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, author, id, genre..."
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {genres.map((genre) => (
              <option key={genre} value={genre} className="bg-card text-white">
                {genre === "all" ? "All genres" : genre}
              </option>
            ))}
          </select>

          <select
            value={verificationFilter}
            onChange={(e) =>
              setVerificationFilter(e.target.value as VerificationFilter)
            }
            className="h-11 rounded-xl border border-white/10 bg-white/5 text-sm text-white px-3 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <option value="all" className="bg-card text-white">
              All verification states
            </option>
            <option value="verified" className="bg-card text-white">
              Verified only
            </option>
            <option value="unverified" className="bg-card text-white">
              Unverified only
            </option>
          </select>
        </div>
      </section>

      <section className="space-y-3">
        {filteredBooks.map((book, index) => {
          const coverSrc = book.localCoverPath ?? book.sourceCoverUrl;

          return (
            <motion.article
              key={book.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                delay: Math.min(index * 0.02, 0.2),
              }}
              className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-4 md:px-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-24 rounded-lg overflow-hidden border border-white/10 bg-white/5 shrink-0">
                  {coverSrc ? (
                    <Image
                      src={coverSrc}
                      alt={book.title}
                      width={64}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-text-secondary">
                      No Cover
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-lg font-display font-semibold truncate">
                        {book.title}
                      </h3>
                      <p className="text-sm text-text-secondary truncate">
                        {book.author}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 rounded-full border ${
                          book.verified
                            ? "border-adventure/50 text-adventure"
                            : "border-white/20 text-text-secondary"
                        }`}
                      >
                        {book.verified ? "Verified" : "Unverified"}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 rounded-full border border-white/20 text-text-secondary">
                        {book.sourceType ?? "unknown source"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(book.frontendGenres ?? []).map((genre) => (
                      <span
                        key={`${book.id}-${genre}`}
                        className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-text-secondary"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
                    <span>ID: {book.id}</span>
                    {book.appleBooksUrl && (
                      <Link
                        href={book.appleBooksUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-white transition-colors"
                      >
                        Open source
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}

        {filteredBooks.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center">
            <p className="text-lg font-display mb-2">
              No books match your filters
            </p>
            <p className="text-sm text-text-secondary">
              Try a different title, author, genre, or verification state.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
