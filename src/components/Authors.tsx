"use client";

import { motion } from "framer-motion";

const authors = [
  { name: "Elena Morrow", role: "Romance & Literary Fiction" },
  { name: "James Rollins", role: "Fantasy & Adventure" },
];

export default function Authors() {
  return (
    <section className="py-28 px-6 md:px-10 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 items-start">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-text-secondary text-sm tracking-[0.3em] uppercase mb-4">Writers</p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-6">
            OUR AUTHORS
            <br />
            SHAPE
            <br />
            <span className="text-text-secondary">WORLDS.</span>
          </h2>
          <p className="text-text-secondary text-base leading-relaxed max-w-md">
            Behind every great book is a visionary mind. Our authors don&apos;t just write stories 
            they architect entire universes, craft characters that breathe, and build
            narratives that transcend time.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-2 gap-6"
        >
          {authors.map((author, i) => (
            <motion.div
              key={author.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.15 }}
              data-cursor-hover
              className="group"
            >
              {/* Author portrait placeholder */}
              <div className="aspect-[3/4] bg-card rounded-lg mb-4 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-white/10"
                  >
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-500" />
              </div>
              <h3 className="font-display text-base font-semibold mb-0.5">{author.name}</h3>
              <p className="text-text-secondary text-xs">{author.role}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
