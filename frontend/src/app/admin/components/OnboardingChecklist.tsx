"use client";

import { motion } from "framer-motion";
import { DashboardOnboarding } from "../types";

interface OnboardingChecklistProps {
  onboarding: DashboardOnboarding;
  onDismiss: () => void;
}

export function OnboardingChecklist({ onboarding, onDismiss }: OnboardingChecklistProps) {
  const progress =
    onboarding.totalCount > 0
      ? Math.round((onboarding.completedCount / onboarding.totalCount) * 100)
      : 0;

  return (
    <section className="rounded-3xl border border-white/5 bg-card/60 backdrop-blur-3xl p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-text-secondary mb-1">
            First‑login checklist
          </p>
          <h2 className="text-base md:text-lg font-semibold">
            Get your bookstore production‑ready
          </h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[0.7rem] uppercase tracking-[0.22em] text-text-secondary hover:text-white transition-colors"
        >
          Dismiss
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[0.75rem] text-text-secondary">
            {onboarding.completedCount} of {onboarding.totalCount} steps complete
          </span>
          <span className="text-[0.75rem] text-text-secondary">{progress}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-romance"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {onboarding.steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
            className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.01] px-4 py-3"
          >
            <span
              className={`mt-1 h-4 w-4 rounded-full border ${
                step.completed
                  ? "border-romance bg-romance"
                  : "border-white/30 bg-transparent"
              }`}
            />
            <div>
              <p className="text-xs font-semibold">{step.title}</p>
              <p className="mt-1 text-[0.75rem] text-text-secondary">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

