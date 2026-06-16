"use client";

import { useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { Search, Trash2, Loader2, X, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminBookItem } from "../page";
import { handleDeleteBook } from "../actions/book-actions";
import Link from "next/link";

interface BooksCatalogProps {
  books: AdminBookItem[];
}

type VerificationFilter = "all" | "verified" | "unverified";

// ── Confirm Delete Modal ──────────────────────────────────────────
function ConfirmDeleteModal({
  book,
  onConfirm,
  onCancel,
}: {
  book: { id: string; title: string };
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-card/80 backdrop-blur-3xl border border-white/[0.08] rounded-[28px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Top shine */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Close button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>

          <h3 className="text-xl font-display font-semibold text-white mb-2">
            Delete book
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
            Are you sure you want to delete{" "}
            <span className="text-white font-medium">
              &ldquo;{book.title}&rdquo;
            </span>
            ? This action cannot be undone.
          </p>

          <div className="flex gap-3 mt-8 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-12 rounded-2xl border border-white/10 bg-white/5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 h-12 rounded-2xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-[0.97]"
            >
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export function BooksCatalog({ books: initialBooks }: BooksCatalogProps) {
  const [books, setBooks] = useState(initialBooks);
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

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

  const handleDelete = useCallback((id: string, title: string) => {
    setConfirmDelete({ id, title });
  }, []);

  const confirmDeleteBook = useCallback(async () => {
    if (!confirmDelete) return;

    const { id } = confirmDelete;
    setConfirmDelete(null);
    setDeletingId(id);
    setDeleteError(null);

    const result = await handleDeleteBook(id);

    if (result.success) {
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } else {
      setDeleteError(result.error || "Failed to delete book");
    }

    setDeletingId(null);
  }, [confirmDelete]);

  const cancelDelete = useCallback(() => {
    setConfirmDelete(null);
  }, []);

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

      {deleteError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-300">
          {deleteError}
        </div>
      )}

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
              <option
                key={genre}
                value={genre}
                className="bg-card-hover text-white"
              >
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
            <option value="all" className="bg-card-hover text-white">
              All verification states
            </option>
            <option value="verified" className="bg-card-hover text-white">
              Verified only
            </option>
            <option value="unverified" className="bg-card-hover text-white">
              Unverified only
            </option>
          </select>
        </div>
      </section>

      <section className="space-y-3">
        <AnimatePresence>
          {filteredBooks.map((book, index) => {
            const coverSrc = book.localCoverPath ?? book.sourceCoverUrl;
            const isDeleting = deletingId === book.id;

            return (
              <motion.article
                key={book.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  height: 0,
                  marginBottom: 0,
                  overflow: "hidden",
                }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(index * 0.02, 0.2),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-4 md:px-5 transition-opacity ${
                  isDeleting ? "opacity-40 pointer-events-none" : ""
                }`}
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
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 self-start pt-1 flex items-center gap-2">
                    <Link
                      href={`/admin/books/${book.id}/edit`}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-400/70 hover:text-blue-300 bg-white/[0.02] hover:bg-blue-500/10 rounded-xl border border-transparent hover:border-blue-500/20 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(book.id, book.title)}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400/70 hover:text-red-300 bg-white/[0.02] hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all disabled:opacity-40"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {isDeleting ? "Deleting..." : "Delete"}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>

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

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDeleteModal
            book={confirmDelete}
            onConfirm={confirmDeleteBook}
            onCancel={cancelDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
