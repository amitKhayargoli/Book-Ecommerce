"use client";

import { motion, Variants } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

const books = [
  { id: 1, title: "Whispers of the Heart", author: "Elena Morrow", price: "$16", image: "/books/romance.png" },
  { id: 2, title: "The Starless Crown", author: "James Rollins", price: "$47", image: "/books/fantasy.png" },
  { id: 3, title: "The Silent Patient", author: "Alex Michaelides", price: "$87", image: "/books/mystery.png" },
  { id: 4, title: "Project Hail Mary", author: "Andy Weir", price: "$187", image: "/books/scifi.png" },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function ProductGrid() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <section className="py-28 px-6 md:px-10 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mb-14"
      >
        <p className="text-text-secondary text-sm tracking-[0.3em] uppercase mb-3">Collection</p>
        <h2 className="font-display text-4xl md:text-5xl font-bold">Editor&apos;s Picks</h2>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {books.map((book) => (
          <motion.div
            key={book.id}
            variants={itemVariants}
            data-cursor-label="View"
            className="group relative bg-card rounded-lg p-8 flex flex-col items-center overflow-hidden"
            onMouseEnter={() => setHoveredId(book.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="relative mb-6">
              <motion.div
                animate={
                  hoveredId === book.id
                    ? { scale: 1.05, rotate: 2, y: -5 }
                    : { scale: 1, rotate: 0, y: 0 }
                }
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image
                  src={book.image}
                  alt={book.title}
                  width={180}
                  height={260}
                  className={`object-contain transition-all duration-500 ${
                    hoveredId === book.id
                      ? "drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
                      : "drop-shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
                  }`}
                />
              </motion.div>
            </div>

            <div className="text-center w-full">
              <h3 className="font-display text-lg font-semibold mb-1">{book.title}</h3>
              <p className="text-text-secondary text-sm mb-2">{book.author}</p>
              <p className="text-romance font-bold text-xl">{book.price}</p>
            </div>

            {/* View Book CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={hoveredId === book.id ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-6"
            >
              <button className="text-xs tracking-[0.2em] uppercase text-white bg-white/10 backdrop-blur-sm px-6 py-2.5 rounded-full border border-white/10 hover:bg-white/20 transition-colors duration-300">
                View Book
              </button>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
