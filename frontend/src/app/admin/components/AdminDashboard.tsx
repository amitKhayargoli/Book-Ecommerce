/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AdminHero } from "./AdminHero";
import { KpiSection } from "./KpiSection";
import { QuickActions } from "./QuickActions";
import { ActionQueue } from "./ActionQueue";
import { RecentActivityList } from "./RecentActivityList";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { DashboardData } from "../types";
import { mockDashboardData } from "../mockDashboardData";
import { withDerivedDashboardFields } from "../utils";

const FIRST_LOGIN_STORAGE_KEY = "admin_dashboard_onboarding_dismissed";

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load dashboard");
        const json = (await res.json()) as DashboardData;
        if (!cancelled) {
          setData(json);
        }
      } catch {
        // Fallback to local mock data if API is unavailable.
        if (!cancelled) {
          setData(withDerivedDashboardFields(mockDashboardData));
        }
      }
    }

    load();

    try {
      const dismissed =
        typeof window !== "undefined" && window.localStorage
          ? localStorage.getItem(FIRST_LOGIN_STORAGE_KEY)
          : null;
      setIsFirstLogin(!dismissed);
    } catch {
      setIsFirstLogin(true);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismissOnboarding = () => {
    try {
      localStorage.setItem(FIRST_LOGIN_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setIsFirstLogin(false);
  };

  if (!data) {
    return (
      <div className="space-y-10">
        <div className="h-24 rounded-3xl bg-white/[0.03] border border-white/5 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-3xl bg-white/[0.03] border border-white/5 animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 rounded-3xl bg-white/[0.03] border border-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-12"
    >
      <AdminHero />

      <KpiSection kpis={data.kpis} />

      <QuickActions />

      <div className="grid grid-cols-1 xl:grid-cols-[2fr,1.4fr] gap-10 items-start">
        <ActionQueue tasks={data.tasks} />
        <RecentActivityList events={data.activity.recentEvents} />
      </div>

      {isFirstLogin && (
        <OnboardingChecklist
          onboarding={data.onboarding}
          onDismiss={handleDismissOnboarding}
        />
      )}
    </motion.div>
  );
}

