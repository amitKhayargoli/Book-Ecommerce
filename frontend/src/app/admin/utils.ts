import { DashboardData, DashboardOnboarding } from "./types";

export const LOW_STOCK_THRESHOLD = 5;

export function computeOnboardingProgress(onboarding: DashboardOnboarding): DashboardOnboarding {
  const completedCount = onboarding.steps.filter((s) => s.completed).length;
  const totalCount = onboarding.steps.length;

  return {
    ...onboarding,
    completedCount,
    totalCount,
  };
}

export function withDerivedDashboardFields(data: DashboardData): DashboardData {
  return {
    ...data,
    onboarding: computeOnboardingProgress(data.onboarding),
  };
}

