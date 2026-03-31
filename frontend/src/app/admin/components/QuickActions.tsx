"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const actions = [
  {
    id: "add-book",
    label: "Add new book",
    description: "Import metadata or create a title manually.",
    href: "/admin/books/new",
  },
  {
    id: "fix-inventory",
    label: "Fix inventory",
    description: "Review out-of-stock and low-stock titles.",
    href: "/admin/books",
  },
  {
    id: "pending-orders",
    label: "Review pending orders",
    description: "Confirm or follow up on pending/failed payments.",
    href: "/admin/orders",
  },
  {
    id: "curate-featured",
    label: "Curate featured & trending",
    description: "Highlight the titles you want readers to see first.",
    href: "/admin/books",
  },
];

export function QuickActions() {
  return (
    <section className="rounded-3xl border border-white/5 bg-card/40 backdrop-blur-3xl px-5 py-5 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-text-secondary mb-1">
            Shortcuts
          </p>
          <h2 className="text-base md:text-lg font-semibold">High-impact admin actions</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
          >
            <Link
              href={action.href}
              className="group block rounded-2xl border border-white/5 bg-white/[0.01] px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em]">
                    {action.label}
                  </p>
                  <p className="mt-1 text-[0.75rem] text-text-secondary">
                    {action.description}
                  </p>
                </div>
                <span className="text-[0.6rem] text-text-secondary group-hover:text-white transition-colors">
                  Go →
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

