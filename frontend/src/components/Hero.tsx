"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";

const heroBooks = [
  { src: "/books/scifi.png", alt: "Romance Novel", rotate: -12, x: -120, delay: 0 },
  { src: "/books/fantasy.png", alt: "Fantasy Novel", rotate: 0, x: 0, delay: 0.1 },
  { src: "/books/mystery.png", alt: "Mystery Novel", rotate: 12, x: 120, delay: 0.2 },
];

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className="relative h-screen flex items-center justify-center overflow-hidden">
      <motion.h1
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, 100]) }}
        className="absolute font-display text-[20vw] md:text-[18vw] font-black text-white/[0.03] leading-none select-none tracking-tighter"
      >
        BOOK
      </motion.h1>

      <motion.div style={{ y, opacity }} className="relative z-10 flex items-end justify-center gap-0">
        {heroBooks.map((book, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 80, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: book.rotate }}
            transition={{ duration: 1, delay: 0.3 + book.delay, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
            style={{ marginLeft: i > 0 ? "-40px" : "0", zIndex: i === 1 ? 10 : 5 }}
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src={book.src}
                alt={book.alt}
                width={250}
                height={320}
                className="select-none"
                priority
              />
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="absolute bottom-20 flex flex-col items-center gap-4 z-10"
      >
        <p className="text-text-secondary text-sm tracking-[0.3em] uppercase">Discover your next story</p>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1"
        >
          <motion.div className="w-1 h-2 rounded-full bg-white/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}
