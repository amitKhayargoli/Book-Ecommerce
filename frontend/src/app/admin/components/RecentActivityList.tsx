"use client";

import { motion } from "framer-motion";
import { ActivityEvent } from "../types";

interface RecentActivityListProps {
  events: ActivityEvent[];
}

const typeLabel: Record<ActivityEvent["type"], string> = {
  book: "Book",
  order: "Order",
  review: "Review",
};

export function RecentActivityList({ events }: RecentActivityListProps) {
  return (
    <section className="rounded-3xl border border-white/5 bg-card/40 backdrop-blur-3xl p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-text-secondary mb-1">
            Activity
          </p>
          <h2 className="text-base md:text-lg font-semibold">Latest changes</h2>
        </div>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scroll">
        {events.map((event, index) => (
          <motion.article
            key={event.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.03 }}
            className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.01] px-4 py-3"
          >
            <span className="mt-1 h-6 w-6 rounded-full border border-white/15 flex items-center justify-center text-[0.6rem] uppercase tracking-[0.22em] text-text-secondary">
              {typeLabel[event.type][0]}
            </span>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-semibold">{event.title}</h3>
                <span className="text-[0.65rem] text-text-secondary">{event.timestamp}</span>
              </div>
              <p className="mt-1 text-[0.75rem] text-text-secondary">{event.description}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

