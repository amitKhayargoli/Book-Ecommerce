"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function Pagination() {
  const [active, setActive] = useState(1);
  const pages = [1, 2, 3, 4, 5];

  return (
    <section className="pb-20 px-6 md:px-10 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-center gap-3"
      >
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => setActive(page)}
            className={`relative w-10 h-10 rounded-full text-sm font-medium transition-all duration-300 ${
              active === page
                ? "text-white bg-white/10"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {page}
            {active === page && (
              <motion.div
                layoutId="activePage"
                className="absolute inset-0 rounded-full border border-white/20"
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              />
            )}
          </button>
        ))}
        <span className="text-text-secondary text-sm mx-2">...</span>
        <button
          onClick={() => setActive(120)}
          className={`relative w-10 h-10 rounded-full text-sm font-medium transition-all duration-300 ${
            active === 120
              ? "text-white bg-white/10"
              : "text-text-secondary hover:text-white"
          }`}
        >
          120
        </button>
        <button className="ml-2 text-text-secondary hover:text-white transition-colors duration-300">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </motion.div>
    </section>
  );
}
