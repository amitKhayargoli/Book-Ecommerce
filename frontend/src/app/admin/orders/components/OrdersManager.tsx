"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, ChevronDown,
  Filter, X, AlertCircle, CheckCircle2, Clock, Truck,
  Package, Ban, CreditCard, User, MapPin, ShoppingBag,
  Loader2,
} from "lucide-react";
import { AdminOrder, OrdersPagination, fetchOrders, updateOrderStatus } from "../actions/order-actions";

// ─── Helpers ───────────────────────────────────────────────────────

const ORDER_STATUS_OPTIONS = [
  { value: "", label: "All statuses", color: "" },
  { value: "PENDING", label: "Pending", color: "text-amber-400" },
  { value: "CONFIRMED", label: "Confirmed", color: "text-blue-400" },
  { value: "SHIPPED", label: "Shipped", color: "text-purple-400" },
  { value: "DELIVERED", label: "Delivered", color: "text-emerald-400" },
  { value: "CANCELLED", label: "Cancelled", color: "text-red-400" },
];

const STATUS_STEPS = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

function getStatusIcon(status: string) {
  switch (status) {
    case "PENDING": return <Clock className="w-3.5 h-3.5" />;
    case "CONFIRMED": return <CheckCircle2 className="w-3.5 h-3.5" />;
    case "SHIPPED": return <Truck className="w-3.5 h-3.5" />;
    case "DELIVERED": return <Package className="w-3.5 h-3.5" />;
    case "CANCELLED": return <Ban className="w-3.5 h-3.5" />;
    default: return <Clock className="w-3.5 h-3.5" />;
  }
}

function getStatusColor(status: string, bg = false): string {
  const colors: Record<string, string> = {
    PENDING: bg ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "text-amber-400",
    CONFIRMED: bg ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "text-blue-400",
    SHIPPED: bg ? "bg-purple-500/10 border-purple-500/20 text-purple-300" : "text-purple-400",
    DELIVERED: bg ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "text-emerald-400",
    CANCELLED: bg ? "bg-red-500/10 border-red-500/20 text-red-300" : "text-red-400",
  };
  return colors[status] ?? (bg ? "bg-white/5 border-white/10 text-text-secondary" : "text-text-secondary");
}

function getPaymentColor(status: string): string {
  switch (status) {
    case "PAID": return "text-emerald-400";
    case "FAILED": return "text-red-400";
    case "REFUNDED": return "text-amber-400";
    default: return "text-text-secondary";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function getProviderBadge(provider: string): { label: string; color: string } {
  switch (provider) {
    case "KHALTI": return { label: "Khalti", color: "text-purple-400" };
    default: return { label: provider, color: "text-text-secondary" };
  }
}

function formatAmount(amount: number, currency = "NPR"): string {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAGE_SIZE = 20;

// ─── Status Badge ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.65rem] font-medium tracking-wide ${getStatusColor(status, true)}`}>
      {getStatusIcon(status)}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Detail Drawer ─────────────────────────────────────────────────

function OrderDetailDrawer({
  order,
  onClose,
  onUpdateStatus,
  updatingId,
}: {
  order: AdminOrder;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  updatingId: string | null;
}) {
  const provider = getProviderBadge(order.paymentProvider);
  const transitions = VALID_TRANSITIONS[order.status] ?? [];
  const stepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <motion.div
      initial={{ opacity: 0, x: 320 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 320 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card/95 backdrop-blur-2xl border-l border-white/[0.08] z-50 overflow-y-auto shadow-2xl"
    >
      <div className="sticky top-0 bg-card/95 backdrop-blur-2xl border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium">Order details</p>
          <p className="text-xs text-text-secondary/60 font-mono mt-0.5">#{order.id.slice(-8).toUpperCase()}</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Status Timeline */}
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.2em] text-text-secondary/50 font-medium mb-4">Status</p>
          <div className="flex items-center gap-1">
            {STATUS_STEPS.map((step, i) => {
              const isActive = stepIndex >= i;
              const isCurrent = stepIndex === i;
              return (
                <div key={step} className="flex items-center gap-1 flex-1">
                  <div className={`flex flex-col items-center flex-1 ${i === STATUS_STEPS.length - 1 ? "" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.6rem] font-bold transition-all ${
                      isActive
                        ? isCurrent
                          ? "bg-white text-black ring-2 ring-white/20"
                          : "bg-emerald-500/20 text-emerald-400"
                        : "bg-white/5 text-text-secondary/40"
                    }`}>
                      {isActive && i < stepIndex ? "✓" : i + 1}
                    </div>
                    <p className={`text-[0.5rem] mt-1.5 font-medium text-center ${
                      isActive ? "text-white" : "text-text-secondary/30"
                    }`}>
                      {step}
                    </p>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-1 mb-6 ${
                      isActive && i < stepIndex ? "bg-emerald-500/50" : "bg-white/[0.06]"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Actions */}
        {transitions.length > 0 && (
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-text-secondary/50 font-medium mb-3">Update status</p>
            <div className="flex flex-wrap gap-2">
              {transitions.map((nextStatus) => (
                <button
                  key={nextStatus}
                  onClick={() => onUpdateStatus(order.id, nextStatus)}
                  disabled={updatingId === order.id}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${
                    nextStatus === "CANCELLED"
                      ? "bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/20"
                      : "bg-white/10 text-white hover:bg-white/15 border border-white/[0.08]"
                  }`}
                >
                  {updatingId === order.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    getStatusIcon(nextStatus)
                  )}
                  Mark as {nextStatus.charAt(0) + nextStatus.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Customer Info */}
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.2em] text-text-secondary/50 font-medium mb-3">Customer</p>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white/50" />
              </div>
              <div>
                <p className="text-sm font-medium">{order.user.name}</p>
                <p className="text-xs text-text-secondary">{order.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>ID: {order.user.id.slice(-8)}</span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        {order.address && (
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-text-secondary/50 font-medium mb-3">Shipping address</p>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-white/40 shrink-0" />
                <div>
                  <p className="text-sm">{order.address.fullName}</p>
                  <p className="text-xs text-text-secondary">{order.address.street}</p>
                  <p className="text-xs text-text-secondary">
                    {[order.address.city, order.address.state, order.address.postalCode].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-xs text-text-secondary">{order.address.country}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Info */}
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.2em] text-text-secondary/50 font-medium mb-3">Payment</p>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-white/40" />
                <span className="text-xs text-text-secondary">Provider</span>
              </div>
              <span className={`text-xs font-medium ${provider.color}`}>{provider.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-white/40" />
                <span className="text-xs text-text-secondary">Status</span>
              </div>
              <span className={`text-xs font-medium ${getPaymentColor(order.paymentStatus)}`}>
                {order.paymentStatus}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Transaction UUID</span>
              <span className="text-[0.6rem] font-mono text-text-secondary/60 truncate max-w-[180px] text-right">
                {order.paymentTransactionUuid}
              </span>
            </div>
            {order.paymentRefId && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Ref ID</span>
                <span className="text-[0.6rem] font-mono text-text-secondary/60 truncate max-w-[180px] text-right">
                  {order.paymentRefId}
                </span>
              </div>
            )}
            <div className="border-t border-white/[0.06] pt-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-bold">{formatAmount(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.2em] text-text-secondary/50 font-medium mb-3">
            Items ({order.items.length})
          </p>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 flex items-center gap-3"
              >
                <div className="w-12 h-16 rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.book.coverImage ? (
                    <img
                      src={item.book.coverImage}
                      alt={item.book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="w-5 h-5 text-white/30" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{item.book.title}</p>
                  <p className="text-[0.6rem] text-text-secondary/60">
                    {item.book.author?.name ?? "Unknown"} · {formatAmount(item.price)} each
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold">×{item.quantity}</p>
                  <p className="text-[0.6rem] text-text-secondary/60">
                    {formatAmount(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timestamps */}
        <div className="border-t border-white/[0.06] pt-4 grid grid-cols-2 gap-4 text-[0.6rem] text-text-secondary/50">
          <div>
            <span className="block uppercase tracking-wider">Created</span>
            <span className="text-white/60">{formatDateTime(order.createdAt)}</span>
          </div>
          <div>
            <span className="block uppercase tracking-wider">Updated</span>
            <span className="text-white/60">{formatDateTime(order.updatedAt)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function OrdersManager() {
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<OrdersPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const page = pagination?.page ?? 1;

  const hasActiveFilters = Boolean(statusFilter || searchQuery);

  // ─── Load data ────────────────────────────────────────────────────

  const loadOrders = useCallback(
    async (pageNum: number) => {
      setIsLoading(true);
      setError(null);

      const result = await fetchOrders({
        page: pageNum,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });

      if (!result.success) {
        setError(result.error || "Failed to load orders");
        setIsLoading(false);
        return;
      }

      setOrders(result.orders ?? []);
      setPagination(result.pagination ?? null);
      setIsLoading(false);
    },
    [statusFilter, searchQuery],
  );

  // Initial load
  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  // ─── Update status ────────────────────────────────────────────────

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    const result = await updateOrderStatus(orderId, newStatus);
    setUpdatingId(null);

    if (!result.success) {
      setError(result.error || "Failed to update order");
      return;
    }

    setSuccessMsg(`Order status updated to ${newStatus.charAt(0) + newStatus.slice(1).toLowerCase()}`);
    setTimeout(() => setSuccessMsg(null), 4000);

    // Refresh the list and selected order
    loadOrders(page);
    if (selectedOrder?.id === orderId) {
      const refreshed = await fetchOrders({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      const updatedOrder = refreshed.orders?.find((o) => o.id === orderId);
      if (updatedOrder) setSelectedOrder(updatedOrder);
    }
  };

  // ─── Reset filters ────────────────────────────────────────────────

  const resetFilters = () => {
    setStatusFilter("");
    setSearchQuery("");
  };

  // ─── Order summary helpers ────────────────────────────────────────

  const getOrderSummary = (order: AdminOrder) => {
    const itemCount = order.items.length;
    const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
    return `${itemCount} item${itemCount !== 1 ? "s" : ""} · ${totalQty} unit${totalQty !== 1 ? "s" : ""}`;
  };

  const getCustomerInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const providerLabels: Record<string, string> = {
    KHALTI: "Khalti",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* ─── Success Toast ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-sm text-emerald-300"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Filters Bar ─────────────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          {/* Status filter dropdown */}
          <div className="flex-1 w-full md:w-auto md:min-w-[180px]">
            <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2 font-medium">
              Status
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-2.5 px-4 text-left text-sm text-white flex items-center justify-between gap-2 hover:border-white/20 transition-colors"
              >
                <span className="truncate flex items-center gap-2">
                  {statusFilter ? (
                    <>
                      {getStatusIcon(statusFilter)}
                      <span className={getStatusColor(statusFilter)}>
                        {statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}
                      </span>
                    </>
                  ) : (
                    "All statuses"
                  )}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-text-secondary transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-black/90 backdrop-blur-2xl border border-white/[0.1] rounded-xl py-1 shadow-2xl">
                    {ORDER_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-white/[0.05] ${
                          statusFilter === opt.value ? "text-white bg-white/[0.06]" : "text-text-secondary"
                        }`}
                      >
                        {opt.value ? getStatusIcon(opt.value) : <Filter className="w-3.5 h-3.5" />}
                        <span className={opt.value ? getStatusColor(opt.value) : ""}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="flex-[2] w-full md:w-auto md:min-w-[240px]">
            <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2 font-medium">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order ID, email, name, transaction..."
                className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors px-3 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/20"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => loadOrders(page)}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs text-white bg-white/10 hover:bg-white/15 transition-colors px-3 py-2.5 rounded-xl border border-white/[0.08] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ─── Results Summary ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-text-secondary px-1">
        <p>
          {pagination
            ? `${pagination.total.toLocaleString()} order${pagination.total !== 1 ? "s" : ""} found`
            : ""}
        </p>
        {isLoading && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Loading...
          </span>
        )}
      </div>

      {/* ─── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* ─── Orders Table ────────────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  Order
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5 hidden md:table-cell">
                  Customer
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5 hidden lg:table-cell">
                  Items
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  Status
                </th>
                <th className="text-right text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  Amount
                </th>
                <th className="text-right text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5 hidden md:table-cell">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && orders.length === 0
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="px-5 py-4" colSpan={6}>
                        <div className="h-10 bg-white/[0.03] rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                : orders.map((order, index) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.015 }}
                      className={`group hover:bg-white/[0.02] transition-colors cursor-pointer ${
                        selectedOrder?.id === order.id ? "bg-white/[0.03]" : ""
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-medium text-white">
                            #{order.id.slice(-8).toUpperCase()}
                          </span>
                          <span className="text-[0.6rem] text-text-secondary/50 mt-0.5 font-mono">
                            {order.paymentTransactionUuid.slice(0, 16)}...
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[0.6rem] font-bold text-text-secondary shrink-0">
                            {getCustomerInitials(order.user.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate max-w-[160px]">
                              {order.user.name}
                            </p>
                            <p className="text-[0.6rem] text-text-secondary/60 truncate max-w-[160px]">
                              {order.user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {order.items.slice(0, 3).map((item) => (
                              <div
                                key={item.id}
                                className="w-8 h-10 rounded-lg bg-white/5 border border-white/[0.06] overflow-hidden"
                              >
                                {item.book.coverImage ? (
                                  <img
                                    src={item.book.coverImage}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingBag className="w-3 h-3 text-white/30" />
                                  </div>
                                )}
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="w-8 h-10 rounded-lg bg-white/5 border border-white/[0.06] flex items-center justify-center text-[0.5rem] font-bold text-text-secondary">
                                +{order.items.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-[0.6rem] text-text-secondary/60">{getOrderSummary(order)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={order.status} />
                          <span className={`text-[0.55rem] font-mono ${getPaymentColor(order.paymentStatus)}`}>
                            {order.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-semibold">
                          {formatAmount(order.totalAmount)}
                        </span>
                        <p className="text-[0.55rem] text-text-secondary/50 mt-0.5">
                          {providerLabels[order.paymentProvider] ?? order.paymentProvider}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className="text-xs text-text-secondary">
                            {timeAgo(order.createdAt)}
                          </span>
                          <span className="text-[0.6rem] text-text-secondary/40 mt-0.5">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* ─── Empty State ────────────────────────────────────────────── */}
        {!isLoading && orders.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-text-secondary/40" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">No orders found</h3>
            <p className="text-sm text-text-secondary max-w-sm mx-auto">
              {hasActiveFilters
                ? "Try adjusting your filters to see more results."
                : "Orders will appear here once customers start making purchases."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-white bg-white/10 hover:bg-white/15 transition-colors px-4 py-2 rounded-xl"
              >
                <X className="w-3.5 h-3.5" />
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Pagination ────────────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => loadOrders(page - 1)}
            disabled={page <= 1 || isLoading}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-white transition-colors px-3 py-2 rounded-xl border border-white/[0.06] hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
              const pageNum = (() => {
                const half = 3;
                const total = pagination.totalPages;
                if (total <= 7) return i + 1;
                const start = Math.max(1, page - half);
                const end = Math.min(total, page + half);
                if (start <= 2) return i + 1;
                if (end >= total - 1) return total - (6 - i);
                return start + i;
              })();

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => loadOrders(pageNum)}
                  disabled={isLoading}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    pageNum === page
                      ? "bg-white text-black"
                      : "text-text-secondary hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => loadOrders(page + 1)}
            disabled={page >= pagination.totalPages || isLoading}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-white transition-colors px-3 py-2 rounded-xl border border-white/[0.06] hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <span className="text-[0.6rem] text-text-secondary/50 ml-2">
            Page {page} of {pagination.totalPages}
          </span>
        </div>
      )}

      {/* ─── Detail Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setSelectedOrder(null)}
            />
            <OrderDetailDrawer
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onUpdateStatus={handleUpdateStatus}
              updatingId={updatingId}
            />
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
