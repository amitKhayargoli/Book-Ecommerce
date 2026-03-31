"use client";

import { motion } from "framer-motion";

export function AdminHero() {
  const now = new Date();
  const formatted = now.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6 rounded-[40px] border border-white/5 bg-card/40 backdrop-blur-3xl px-8 py-7 lg:px-12 lg:py-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden"
    >
      <div className="absolute inset-y-0 right-[-10%] w-1/2 bg-white/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 space-y-3">
        <p className="text-xs tracking-[0.35em] uppercase text-text-secondary">
          Admin Dashboard · {formatted}
        </p>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight">
          Keep your bookstore in orbit.
        </h1>
        <p className="text-sm md:text-base text-text-secondary max-w-xl">
          See catalog health, orders, and reader signals at a glance. Use the quick actions
          to update inventory or publish new titles in seconds.
        </p>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <a
          href="/admin/books/new"
          className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-white text-black text-xs md:text-sm font-semibold tracking-[0.22em] uppercase hover:bg-white/90 transition-colors"
        >
          Add New Book
        </a>
        <a
          href="/admin/books"
          className="inline-flex items-center justify-center px-5 py-3 rounded-full border border-white/15 bg-white/0 text-xs md:text-sm font-semibold tracking-[0.22em] uppercase text-text-secondary hover:bg-white/5 hover:text-white transition-colors"
        >
          Review Catalog
        </a>
      </div>
    </motion.section>
  );
}

