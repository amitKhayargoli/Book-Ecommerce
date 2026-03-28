"use client";

import { motion } from "framer-motion";

export default function Statement() {
  return (
    <section className="py-28 px-6 md:px-10 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 items-start">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight">
            WE BELIEVE
            <br />
            IN STORIES
            <br />
            THAT STAY
            <br />
            <span className="text-text-secondary">WITH YOU.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6 md:pt-4"
        >
          <p className="text-text-secondary text-base md:text-lg leading-relaxed">
            Every book is a doorway to a world unseen, a conversation with minds across centuries.
            We curate stories that don&apos;t just entertain  they transform. From the first page
            to the last, our collection is designed to ignite your imagination and leave a lasting imprint.
          </p>
          <p className="text-text-secondary text-base md:text-lg leading-relaxed">
            Reading is not just a habit  it&apos;s an act of rebellion against the ordinary.
            In every carefully bound volume, we preserve the art of storytelling
            for a generation that craves depth, beauty, and meaning.
          </p>
          <div className="mt-4">
            <button
              data-cursor-hover
              className="text-sm tracking-[0.2em] uppercase text-white border border-white/20 px-8 py-3 rounded hover:bg-white hover:text-black transition-all duration-500"
            >
              Our Philosophy
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
