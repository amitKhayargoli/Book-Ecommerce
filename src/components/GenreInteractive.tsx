"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import Image from "next/image";

interface GenreData {
  name: string;
  color: string;
  books: { title: string; author: string; image: string }[];
}

const genres: GenreData[] = [
  {
    name: "Romance",
    color: "#FF4D6D",
    books: [
      { title: "Whispers of the Heart", author: "Elena Morrow", image: "/books/romance.png" },
      { title: "Love by Moonlight", author: "Sarah Blake", image: "/books/romance.png" },
    ],
  },
  {
    name: "Comedy",
    color: "#FFD60A",
    books: [
      { title: "The Laughing Chronicles", author: "David Sparks", image: "/books/comedy.png" },
      { title: "Humor Me", author: "Jenny Adams", image: "/books/comedy.png" },
    ],
  },
  {
    name: "Tragedy",
    color: "#6A4C93",
    books: [
      { title: "The Weight of Silence", author: "Maria Keane", image: "/books/mystery.png" },
      { title: "Echoes of Loss", author: "Peter Grant", image: "/books/fantasy.png" },
    ],
  },
  {
    name: "Fantasy",
    color: "#8338EC",
    books: [
      { title: "The Starless Crown", author: "James Rollins", image: "/books/fantasy.png" },
      { title: "Realm of Shadows", author: "K. T. Moon", image: "/books/fantasy.png" },
    ],
  },
  {
    name: "Science Fiction",
    color: "#3A86FF",
    books: [
      { title: "Project Hail Mary", author: "Andy Weir", image: "/books/scifi.png" },
      { title: "Neon Horizons", author: "Ava Chen", image: "/books/scifi.png" },
    ],
  },
  {
    name: "Mystery",
    color: "#118AB2",
    books: [
      { title: "The Silent Patient", author: "Alex Michaelides", image: "/books/mystery.png" },
      { title: "Cloak and Dagger", author: "Ian Prescott", image: "/books/mystery.png" },
    ],
  },
  {
    name: "Thriller",
    color: "#EF233C",
    books: [
      { title: "The Night She Vanished", author: "Rachel Chase", image: "/books/mystery.png" },
      { title: "Redline", author: "Marcus Blake", image: "/books/romance.png" },
    ],
  },
  {
    name: "Horror",
    color: "#8B0000",
    books: [
      { title: "The Hollow", author: "Stephen Graves", image: "/books/mystery.png" },
      { title: "Shadows Crawl", author: "Iris Dark", image: "/books/fantasy.png" },
    ],
  },
  {
    name: "Adventure",
    color: "#06D6A0",
    books: [
      { title: "The Lost Expedition", author: "Jack Rivers", image: "/books/scifi.png" },
      { title: "Beyond the Horizon", author: "Lila Storm", image: "/books/comedy.png" },
    ],
  },
  {
    name: "Drama",
    color: "#F77F00",
    books: [
      { title: "The Human Condition", author: "Oliver Penn", image: "/books/romance.png" },
      { title: "Curtain Call", author: "Diana Wells", image: "/books/comedy.png" },
    ],
  },
];

export default function GenreInteractive() {
  const [activeGenre, setActiveGenre] = useState<GenreData | null>(null);
  const [activeBook, setActiveBook] = useState<GenreData["books"][0] | null>(null);

  const handleHover = useCallback((genre: GenreData) => {
    const randomBook = genre.books[Math.floor(Math.random() * genre.books.length)];
    setActiveGenre(genre);
    setActiveBook(randomBook);
  }, []);

  return (
    <section className="py-28 px-6 md:px-10 max-w-[1400px] mx-auto relative overflow-hidden">
      {/* Ambient glow */}
      <AnimatePresence>
        {activeGenre && (
          <motion.div
            key={activeGenre.color}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 50% at 75% 50%, ${activeGenre.color}, transparent)`,
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mb-16"
      >
        <p className="text-text-secondary text-sm tracking-[0.3em] uppercase mb-3">Discover</p>
        <h2 className="font-display text-4xl md:text-5xl font-bold">Browse by Genre</h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start relative z-10">
        {/* Genre list (left) */}
        <div className="flex flex-col gap-1">
          {genres.map((genre, i) => (
            <motion.div
              key={genre.name}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              onMouseEnter={() => handleHover(genre)}
              onMouseLeave={() => { setActiveGenre(null); setActiveBook(null); }}
              data-cursor-hover
              className="group flex items-center gap-4 py-4 border-b border-white/5 transition-colors duration-300 hover:border-white/10"
            >
              <motion.div
                animate={activeGenre?.name === genre.name ? { width: 24 } : { width: 0 }}
                transition={{ duration: 0.3 }}
                className="h-[2px] rounded-full"
                style={{ backgroundColor: genre.color }}
              />
              <span
                className={`font-display text-2xl md:text-3xl lg:text-4xl font-bold transition-colors duration-300 ${
                  activeGenre?.name === genre.name ? "text-white" : "text-text-secondary/50"
                }`}
              >
                {genre.name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Book preview (right) */}
        <div className="hidden md:flex items-center justify-center min-h-[500px] relative">
          <AnimatePresence mode="wait">
            {activeBook && activeGenre ? (
              <motion.div
                key={activeBook.title + activeGenre.name}
                initial={{ opacity: 0, x: 60, rotate: -5, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, rotate: 3, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center"
              >
                <Image
                  src={activeBook.image}
                  alt={activeBook.title}
                  width={240}
                  height={340}
                  className="drop-shadow-[0_25px_60px_rgba(0,0,0,0.7)] mb-6"
                />
                <h3 className="font-display text-xl font-bold mb-1">{activeBook.title}</h3>
                <p className="text-text-secondary text-sm">{activeBook.author}</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-text-secondary/30 text-center"
              >
                <p className="font-display text-xl">Hover a genre</p>
                <p className="text-sm mt-1">to preview a book</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
