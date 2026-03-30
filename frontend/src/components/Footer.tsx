"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const columns = [
  {
    title: "Follow",
    links: ["Instagram", "Twitter/X", "Pinterest", "LinkedIn"],
  },
  {
    title: "Customers",
    links: ["Contact Us", "FAQs", "Shipping", "Returns"],
  },
  {
    title: "Publisher",
    links: ["Submit Work", "Guidelines", "Rights", "Press"],
  },
  {
    title: "About",
    links: ["Our Story", "Careers", "Privacy", "Terms"],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-20"
        >
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs tracking-[0.25em] uppercase text-text-secondary mb-6">{col.title}</h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-text-secondary/60 hover:text-white transition-colors duration-300"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>

        {/* Center logo + copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col items-center gap-6 pt-10 border-t border-white/5"
        >
          <div className="grid grid-cols-2 gap-[4px]">
            <div className="w-3 h-3 rounded-full bg-white/60" />
            <div className="w-3 h-3 rounded-full bg-white/60" />
            <div className="w-3 h-3 rounded-full bg-white/60" />
            <div className="w-3 h-3 rounded-full bg-white/60" />
          </div>
          <p className="text-text-secondary/40 text-xs tracking-wider">
            © 2026 BOOK Store. All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
