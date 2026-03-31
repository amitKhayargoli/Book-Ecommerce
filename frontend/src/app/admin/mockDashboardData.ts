import { DashboardData } from "./types";

export const mockDashboardData: DashboardData = {
  kpis: [
    {
      id: "total-books",
      label: "Total Books",
      value: "128",
      delta: "+12 this month",
      trend: "up",
      category: "catalog",
    },
    {
      id: "published-books",
      label: "Published",
      value: "104",
      delta: "+8",
      trend: "up",
      category: "catalog",
    },
    {
      id: "pending-orders",
      label: "Pending Orders",
      value: "7",
      delta: "3 need confirmation",
      trend: "flat",
      category: "orders",
    },
    {
      id: "revenue-7d",
      label: "Revenue (7d)",
      value: "$8.4k",
      delta: "+18%",
      trend: "up",
      category: "orders",
    },
    {
      id: "out-of-stock",
      label: "Out of Stock",
      value: "5",
      delta: "2 critical",
      trend: "down",
      category: "catalog",
    },
    {
      id: "avg-rating",
      label: "Avg Rating",
      value: "4.6",
      delta: "72 new reviews",
      trend: "up",
      category: "customers",
    },
  ],
  tasks: {
    outOfStockItems: [
      {
        id: "task-out-1",
        title: "Project Hail Mary",
        description: "Out of stock for 3 days · 27 wishlists",
        type: "outOfStock",
        severity: "high",
        href: "/admin/books",
      },
      {
        id: "task-out-2",
        title: "The Silent Patient",
        description: "Out of stock · high review volume",
        type: "outOfStock",
        severity: "medium",
        href: "/admin/books",
      },
    ],
    lowStockItems: [
      {
        id: "task-low-1",
        title: "Whispers of the Heart",
        description: "Low stock (5 left) · trending",
        type: "lowStock",
        severity: "high",
        href: "/admin/books",
      },
    ],
    draftPublishCandidates: [
      {
        id: "task-draft-1",
        title: "Starless Empire (Draft)",
        description: "Complete: cover, price, genres · missing publishedAt only",
        type: "draftPublishCandidate",
        severity: "medium",
        href: "/admin/books",
      },
    ],
    ordersNeedingAttention: [
      {
        id: "task-order-1",
        title: "Order #4821",
        description: "PENDING > 24h · payment PENDING",
        type: "orderAttention",
        severity: "high",
        href: "/admin/orders",
      },
      {
        id: "task-order-2",
        title: "Order #4813",
        description: "Payment FAILED · 2 items",
        type: "orderAttention",
        severity: "high",
        href: "/admin/orders",
      },
    ],
    catalogGaps: [
      {
        id: "task-gap-1",
        title: "Untitled Sci‑Fi Anthology",
        description: "Missing genres and preview images",
        type: "catalogGap",
        severity: "low",
        href: "/admin/books",
      },
    ],
  },
  activity: {
    recentEvents: [
      {
        id: "evt-1",
        type: "order",
        title: "Order #4824 confirmed",
        description: "3 books · $89.00 · status changed to CONFIRMED",
        timestamp: "5 min ago",
      },
      {
        id: "evt-2",
        type: "book",
        title: "Featured: The Starless Crown",
        description: "Marked as featured and trending",
        timestamp: "32 min ago",
      },
      {
        id: "evt-3",
        type: "review",
        title: "New 5★ review",
        description: "“Could not put it down.” on Project Hail Mary",
        timestamp: "1 h ago",
      },
      {
        id: "evt-4",
        type: "order",
        title: "Payment failed on Order #4813",
        description: "Customer card declined · requires follow-up",
        timestamp: "2 h ago",
      },
    ],
  },
  insights: {
    statusDistribution: [
      { status: "PENDING", count: 7 },
      { status: "CONFIRMED", count: 14 },
      { status: "SHIPPED", count: 9 },
      { status: "DELIVERED", count: 42 },
    ],
    topWishlistedBooks: [
      { title: "Project Hail Mary", count: 31 },
      { title: "The Silent Patient", count: 24 },
    ],
    topCartedBooks: [
      { title: "Whispers of the Heart", count: 18 },
      { title: "The Starless Crown", count: 15 },
    ],
    topGenresByBookCount: [
      { genre: "Science Fiction", count: 22 },
      { genre: "Fantasy", count: 18 },
      { genre: "Mystery", count: 14 },
    ],
  },
  onboarding: {
    steps: [
      {
        id: "step-authors-genres",
        title: "Set up authors & genres",
        description: "Ensure you have at least one Author and Genre so books are discoverable.",
        completed: true,
      },
      {
        id: "step-publish-books",
        title: "Publish your first books",
        description:
          "Pick 3–5 books, verify price and stock, and set them live with publishedAt.",
        completed: false,
      },
      {
        id: "step-featured-trending",
        title: "Curate featured & trending",
        description: "Select 1–3 featured and 1–3 trending titles to highlight on the store.",
        completed: false,
      },
      {
        id: "step-review-pipeline",
        title: "Review order & payment pipeline",
        description: "Decide how you handle PENDING and FAILED payments operationally.",
        completed: false,
      },
    ],
    completedCount: 1,
    totalCount: 4,
    isFirstLogin: true,
  },
};

