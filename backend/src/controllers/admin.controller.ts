import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthUserPayload } from "../types/auth.types";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { AuditService } from "../services/audit.service";

type AuthenticatedRequest = Request & { user?: AuthUserPayload };

const audit = new AuditService();

const LOW_STOCK_THRESHOLD = 5;

export class AdminController {
  getDashboard = async (_req: Request, res: Response): Promise<void> => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ─── KPIs ────────────────────────────────────────────────────────
    const [
      totalBooks,
      publishedBooks,
      ordersByStatus,
      recentRevenueAgg,
      avgRatingAgg,
      totalReviews,
      newReviewsLast7d,
      outOfStockCount,
      booksThisMonth,
    ] = await Promise.all([
      prisma.book.count(),
      prisma.book.count({ where: { publishedAt: { lte: now } } }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: sevenDaysAgo },
          paymentStatus: "PAID",
        },
      }),
      prisma.review.aggregate({
        _avg: { rating: true },
      }),
      prisma.review.count(),
      prisma.review.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.book.count({ where: { stock: 0 } }),
      prisma.book.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    const pendingOrders = ordersByStatus.find(
      (s) => s.status === "PENDING",
    )?._count.id ?? 0;
    const confirmedOrders = ordersByStatus.find(
      (s) => s.status === "CONFIRMED",
    )?._count.id ?? 0;
    const shippedOrders = ordersByStatus.find(
      (s) => s.status === "SHIPPED",
    )?._count.id ?? 0;
    const deliveredOrders = ordersByStatus.find(
      (s) => s.status === "DELIVERED",
    )?._count.id ?? 0;

    const recentRevenue = recentRevenueAgg._sum.totalAmount ?? 0;
    const avgRating = Math.round((avgRatingAgg._avg.rating ?? 0) * 10) / 10;

    const kpis = [
      {
        id: "total-books",
        label: "Total Books",
        value: totalBooks.toLocaleString(),
        delta: `+${booksThisMonth} this month`,
        trend: booksThisMonth > 0 ? ("up" as const) : ("flat" as const),
        category: "catalog" as const,
      },
      {
        id: "published-books",
        label: "Published",
        value: publishedBooks.toLocaleString(),
        delta: `${totalBooks - publishedBooks} drafts`,
        trend: (totalBooks - publishedBooks) > 0 ? ("flat" as const) : ("up" as const),
        category: "catalog" as const,
      },
      {
        id: "pending-orders",
        label: "Pending Orders",
        value: pendingOrders.toString(),
        delta: pendingOrders > 0 ? `${pendingOrders} need confirmation` : "All clear",
        trend: pendingOrders > 0 ? ("flat" as const) : ("down" as const),
        category: "orders" as const,
      },
      {
        id: "revenue-7d",
        label: "Revenue (7d)",
        value: `$${(recentRevenue / 1000).toFixed(1)}k`,
        delta: recentRevenue > 0 ? `$${recentRevenue.toFixed(0)} earned` : "No revenue",
        trend: recentRevenue > 0 ? ("up" as const) : ("flat" as const),
        category: "orders" as const,
      },
      {
        id: "out-of-stock",
        label: "Out of Stock",
        value: outOfStockCount.toString(),
        delta:
          outOfStockCount > 0
            ? `${outOfStockCount} need restocking`
            : "All stocked",
        trend: outOfStockCount > 0 ? ("down" as const) : ("up" as const),
        category: "catalog" as const,
      },
      {
        id: "avg-rating",
        label: "Avg Rating",
        value: avgRating.toString(),
        delta: `${newReviewsLast7d} new reviews (${totalReviews} total)`,
        trend: newReviewsLast7d > 0 ? ("up" as const) : ("flat" as const),
        category: "customers" as const,
      },
    ];

    // ─── Tasks ────────────────────────────────────────────────────────
    const [outOfStockBooks, lowStockBooks, draftBooks, pendingOrdersFull, booksWithGaps] =
      await Promise.all([
        prisma.book.findMany({
          where: { stock: 0 },
          select: { id: true, title: true, stock: true, slug: true },
          orderBy: { updatedAt: "desc" },
          take: 10,
        }),
        prisma.book.findMany({
          where: { stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
          select: { id: true, title: true, stock: true, trending: true, slug: true },
          orderBy: { stock: "asc" },
          take: 10,
        }),
        prisma.book.findMany({
          where: { publishedAt: null },
          select: { id: true, title: true, coverImage: true, price: true, slug: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.order.findMany({
          where: {
            OR: [
              { status: "PENDING" },
              { paymentStatus: "FAILED" },
            ],
          },
          select: { id: true, status: true, paymentStatus: true, totalAmount: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.book.findMany({
          select: { id: true, title: true, slug: true },
          where: {
            OR: [
              { bookGenres: { none: {} } },
              { previewImages: { equals: [] } },
            ],
          },
          take: 10,
        }),
      ]);

    const outOfStockItems = outOfStockBooks.map((book) => ({
      id: `task-out-${book.id}`,
      title: book.title,
      description: `Out of stock · ${book.slug}`,
      type: "outOfStock" as const,
      severity: "high" as const,
      href: "/admin/books",
    }));

    const lowStockItems = lowStockBooks.map((book) => ({
      id: `task-low-${book.id}`,
      title: book.title,
      description: `Low stock (${book.stock} left)${book.trending ? " · trending" : ""}`,
      type: "lowStock" as const,
      severity: (book.stock <= 2 ? "high" : "medium") as "high" | "medium",
      href: "/admin/books",
    }));

    const draftPublishCandidates = draftBooks.map((book) => ({
      id: `task-draft-${book.id}`,
      title: book.title,
      description: "Draft — missing publishedAt",
      type: "draftPublishCandidate" as const,
      severity: "medium" as const,
      href: "/admin/books",
    }));

    const ordersNeedingAttention = pendingOrdersFull.map((order) => ({
      id: `task-order-${order.id}`,
      title: `Order #${order.id.slice(-4).toUpperCase()}`,
      description: `${order.status} ${order.status === "PENDING" && order.paymentStatus === "FAILED" ? "· payment FAILED" : "· payment " + order.paymentStatus} · $${order.totalAmount.toFixed(2)}`,
      type: "orderAttention" as const,
      severity: order.paymentStatus === "FAILED" ? ("high" as const) : ("medium" as const),
      href: "/admin/orders",
    }));

    const catalogGaps = booksWithGaps.map((book) => ({
      id: `task-gap-${book.id}`,
      title: book.title,
      description: "Missing genres and/or preview images",
      type: "catalogGap" as const,
      severity: "low" as const,
      href: "/admin/books",
    }));

    // ─── Activity (from audit logs) ──────────────────────────────────
    const recentAuditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentEvents = recentAuditLogs.map((log) => {
      const type = log.event.startsWith("order")
        ? ("order" as const)
        : log.event.startsWith("book") || log.event.includes("featured") || log.event.includes("trending")
          ? ("book" as const)
          : ("review" as const);
      const rawTimestamp = log.createdAt;
      const diffMs = now.getTime() - rawTimestamp.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const timestamp =
        diffMin < 1
          ? "Just now"
          : diffMin < 60
            ? `${diffMin} min ago`
            : diffMin < 1440
              ? `${Math.floor(diffMin / 60)} h ago`
              : `${Math.floor(diffMin / 1440)} d ago`;

      return {
        id: `evt-${log.id}`,
        type,
        title: log.event.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: log.email
          ? `${log.email} · ${log.ip ?? "unknown ip"}`
          : log.ip
            ? `IP: ${log.ip}`
            : "System event",
        timestamp,
      };
    });

    // ─── Insights ──────────────────────────────────────────────────────
    const [topWishlistedBooks, topCartedBooks, topGenres] = await Promise.all([
      prisma.wishlistItem.groupBy({
        by: ["bookId"],
        _count: { bookId: true },
        orderBy: { _count: { bookId: "desc" } },
        take: 5,
      }),
      prisma.cartItem.groupBy({
        by: ["bookId"],
        _count: { bookId: true },
        orderBy: { _count: { bookId: "desc" } },
        take: 5,
      }),
      prisma.bookGenre.groupBy({
        by: ["genreId"],
        _count: { genreId: true },
        orderBy: { _count: { genreId: "desc" } },
        take: 5,
      }),
    ]);

    // Resolve names for insights
    const wishlistBookIds = topWishlistedBooks.map((w) => w.bookId);
    const cartBookIds = topCartedBooks.map((c) => c.bookId);
    const genreIds = topGenres.map((g) => g.genreId);

    const [wishlistBooks, cartBooks, genres] = await Promise.all([
      prisma.book.findMany({
        where: { id: { in: wishlistBookIds } },
        select: { id: true, title: true },
      }),
      prisma.book.findMany({
        where: { id: { in: cartBookIds } },
        select: { id: true, title: true },
      }),
      prisma.genre.findMany({
        where: { id: { in: genreIds } },
        select: { id: true, name: true },
      }),
    ]);

    const wishlistMap = new Map(wishlistBooks.map((b) => [b.id, b.title]));
    const cartMap = new Map(cartBooks.map((b) => [b.id, b.title]));
    const genreMap = new Map(genres.map((g) => [g.id, g.name]));

    // ─── Onboarding ────────────────────────────────────────────────────
    const [authorCount, genreCount, featuredCount, trendingCount] =
      await Promise.all([
        prisma.author.count(),
        prisma.genre.count(),
        prisma.book.count({ where: { featured: true } }),
        prisma.book.count({ where: { trending: true } }),
      ]);

    const onboardingSteps = [
        {
          id: "step-authors-genres",
          title: "Set up authors & genres",
          description:
            "Ensure you have at least one Author and Genre so books are discoverable.",
          completed: authorCount > 0 && genreCount > 0,
        },
        {
          id: "step-publish-books",
          title: "Publish your first books",
          description:
            "Pick 3–5 books, verify price and stock, and set them live with publishedAt.",
          completed: publishedBooks >= 3,
        },
        {
          id: "step-featured-trending",
          title: "Curate featured & trending",
          description:
            "Select 1–3 featured and 1–3 trending titles to highlight on the store.",
          completed: featuredCount >= 1 && trendingCount >= 1,
        },
        {
          id: "step-review-pipeline",
          title: "Review order & payment pipeline",
          description:
            "Decide how you handle PENDING and FAILED payments operationally.",
          completed: ordersByStatus.length > 0,
        },
      ];

    const onboarding = {
      steps: onboardingSteps,
      completedCount: onboardingSteps.filter((s) => s.completed).length,
      totalCount: onboardingSteps.length,
      isFirstLogin: true, // handled client-side via localStorage
    };

    res.status(200).json({
      kpis,
          tasks: {
        outOfStockItems,
        lowStockItems,
        draftPublishCandidates,
        ordersNeedingAttention,
        catalogGaps,
      },
      activity: {
        recentEvents,
      },
      insights: {
        statusDistribution: [
          { status: "PENDING", count: pendingOrders },
          { status: "CONFIRMED", count: confirmedOrders },
          { status: "SHIPPED", count: shippedOrders },
          { status: "DELIVERED", count: deliveredOrders },
        ],
        topWishlistedBooks: topWishlistedBooks.map((w) => ({
          title: wishlistMap.get(w.bookId) ?? "Unknown",
          count: w._count.bookId,
        })),
        topCartedBooks: topCartedBooks.map((c) => ({
          title: cartMap.get(c.bookId) ?? "Unknown",
          count: c._count.bookId,
        })),
        topGenresByBookCount: topGenres.map((g) => ({
          genre: genreMap.get(g.genreId) ?? "Unknown",
          count: g._count.genreId,
        })),
      },
      onboarding,
    });
  };

  getOrders = async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const status = String(req.query.status || "");
    const search = String(req.query.search || "");

    const where: Record<string, unknown> = {};

    if (status && ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) {
      where.status = status as any;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { paymentTransactionUuid: { contains: search, mode: "insensitive" } },
        { paymentRefId: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ] as any;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: where as any,
        select: {
          id: true,
          totalAmount: true,
          status: true,
          paymentStatus: true,
          paymentProvider: true,
          paymentTransactionUuid: true,
          paymentRefId: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          address: {
            select: {
              fullName: true,
              street: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              book: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  coverImage: true,
                  author: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.status(200).json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  };

  // ─── IP Access Rules ───────────────────────────────────────────────

  /** List all IP access rules (allow/block). */
  getIpAccessRules = async (_req: Request, res: Response): Promise<void> => {
    const rules = await prisma.ipAccessRule.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, data: rules });
  };

  /** Create a new IP access rule. */
  createIpAccessRule = async (req: Request, res: Response): Promise<void> => {
    const { ip, type, label, isActive, expiresAt } = req.body as {
      ip: string;
      type: string;
      label: string;
      isActive?: boolean;
      expiresAt?: string;
    };

    if (!ip || !type || !label) {
      res.status(400).json({ success: false, message: "ip, type, and label are required" });
      return;
    }

    const validTypes = ["ALLOW", "BLOCK"];
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, message: "type must be ALLOW or BLOCK" });
      return;
    }

    const user = (req as AuthenticatedRequest).user;

    const rule = await prisma.ipAccessRule.create({
      data: {
        ip: ip.trim(),
        type,
        label: label.trim(),
        isActive: isActive ?? true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: user?.id,
      },
    });

    await audit.log("profile_updated", {
      userId: user?.id,
      metadata: {
        action: "create_ip_access_rule",
        ip,
        type,
        label,
      },
      ip: req.ip ?? undefined,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
    });

    res.status(201).json({ success: true, data: rule, message: "IP access rule created" });
  };

  /** Update an existing IP access rule. */
  updateIpAccessRule = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { ip, type, label, isActive, expiresAt } = req.body as {
      ip?: string;
      type?: string;
      label?: string;
      isActive?: boolean;
      expiresAt?: string | null;
    };

    const existing = await prisma.ipAccessRule.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "IP access rule not found" });
      return;
    }

    if (type && !["ALLOW", "BLOCK"].includes(type)) {
      res.status(400).json({ success: false, message: "type must be ALLOW or BLOCK" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (ip !== undefined) updateData.ip = ip.trim();
    if (type !== undefined) updateData.type = type;
    if (label !== undefined) updateData.label = label.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const updated = await prisma.ipAccessRule.update({ where: { id }, data: updateData as any });

    res.status(200).json({ success: true, data: updated, message: "IP access rule updated" });
  };

  /** Delete an IP access rule. */
  deleteIpAccessRule = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    const existing = await prisma.ipAccessRule.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: "IP access rule not found" });
      return;
    }

    await prisma.ipAccessRule.delete({ where: { id } });

    res.status(200).json({ success: true, message: "IP access rule deleted" });
  };

  updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { status } = req.body as { status: string };

    const validStatuses = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      throw new BadRequestError("Invalid status. Must be one of: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED");
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundError("Order");
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: status as any },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: `Order status updated to ${status}`,
      order: updated,
    });
  };
}
