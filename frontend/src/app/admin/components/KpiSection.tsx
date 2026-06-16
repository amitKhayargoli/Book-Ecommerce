"use client";

import { motion } from "framer-motion";
import { Kpi } from "../types";

interface KpiSectionProps {
  kpis: Kpi[];
}

const categoryAccent: Record<string, string> = {
  catalog: "bg-fantasy",
  orders: "bg-scifi",
  customers: "bg-romance",
};

export function KpiSection({ kpis }: KpiSectionProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {kpis.map((kpi, index) => {
        const accentClass = categoryAccent[kpi.category] ?? "bg-white/40";

        return (
          <motion.article
            key={kpi.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
            className="relative overflow-hidden rounded-3xl border border-white/5 bg-card/60 px-5 py-4 md:px-6 md:py-5"
          >
            <div className="absolute right-[-40px] top-[-40px] h-28 w-28 rounded-full bg-white/[0.02]" />
            <div className="absolute right-[-10px] bottom-[-10px] h-16 w-16 rounded-full bg-white/[0.03]" />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[0.7rem] tracking-[0.3em] uppercase text-text-secondary">
                  {kpi.label}
                </p>
                <p className="text-2xl md:text-3xl font-display font-semibold">{kpi.value}</p>
                {kpi.delta && (
                  <p className="text-xs text-text-secondary/80 mt-1">{kpi.delta}</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl ${accentClass}`}
                >
                  <span className="h-1.5 w-3 rounded-full bg-white/80" />
                </span>
                {kpi.trend && (
                  <span className="text-[0.7rem] uppercase tracking-[0.22em] text-text-secondary">
                    {kpi.trend === "up" && "Rising"}
                    {kpi.trend === "down" && "Cooling"}
                    {kpi.trend === "flat" && "Stable"}
                  </span>
                )}
              </div>
            </div>
          </motion.article>
        );
      })}
    </section>
  );
}

