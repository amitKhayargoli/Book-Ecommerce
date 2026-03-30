"use client";

import { motion, Variants } from "framer-motion";
import Image from "next/image";

const genres = [
  { name: "Romance", color: "#FF4D6D", image: "/books/romance.png" },
  { name: "Fantasy", color: "#8338EC", image: "/books/fantasy.png" },
  { name: "Mystery", color: "#118AB2", image: "/books/mystery.png" },
  { name: "Sci-Fi", color: "#3A86FF", image: "/books/scifi.png" },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function FeaturedGenres() {
  return (
    <section className="py-28 px-6 md:px-10 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mb-14"
      >
        <p className="text-text-secondary text-sm tracking-[0.3em] uppercase mb-3">Explore</p>
        <h2 className="font-display text-4xl md:text-5xl font-bold">Featured Genres</h2>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {genres.map((genre) => (
          <motion.div
            key={genre.name}
            variants={cardVariants}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            data-cursor-label="View"
            className="group relative bg-card rounded-lg p-6 overflow-hidden transition-shadow duration-500"
            style={{
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${genre.color}20, 0 0 0 1px ${genre.color}40`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(255,255,255,0.04)";
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: genre.color }}
              />
              <span className="text-sm text-text-secondary font-medium">{genre.name}</span>
            </div>

            <div className="relative h-56 flex items-center justify-center">
              <motion.div
                className="transition-transform duration-500 group-hover:rotate-3"
              >
                <Image
                  src={genre.image}
                  alt={genre.name}
                  width={300}
                  height={220}
                  className=" object-contain"
                />
              </motion.div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
