export type KpiCategory = "catalog" | "orders" | "customers";

export interface Kpi {
  id: string;
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  category: KpiCategory;
}

export type TaskSeverity = "low" | "medium" | "high";
export type TaskType =
  | "outOfStock"
  | "lowStock"
  | "draftPublishCandidate"
  | "orderAttention"
  | "catalogGap";

export interface DashboardTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  severity: TaskSeverity;
  href?: string;
}

export type ActivityEntityType = "book" | "order" | "review";

export interface ActivityEvent {
  id: string;
  type: ActivityEntityType;
  title: string;
  description: string;
  timestamp: string;
}

export interface DashboardTasks {
  outOfStockItems: DashboardTask[];
  lowStockItems: DashboardTask[];
  draftPublishCandidates: DashboardTask[];
  ordersNeedingAttention: DashboardTask[];
  catalogGaps: DashboardTask[];
}

export interface DashboardActivity {
  recentEvents: ActivityEvent[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface DashboardOnboarding {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  isFirstLogin: boolean;
}

export interface DashboardData {
  kpis: Kpi[];
  tasks: DashboardTasks;
  activity: DashboardActivity;
  insights: {
    statusDistribution: { status: string; count: number }[];
    topWishlistedBooks: { title: string; count: number }[];
    topCartedBooks: { title: string; count: number }[];
    topGenresByBookCount: { genre: string; count: number }[];
  };
  onboarding: DashboardOnboarding;
}

