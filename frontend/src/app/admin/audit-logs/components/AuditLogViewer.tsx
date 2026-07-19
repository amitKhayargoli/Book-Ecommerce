"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  X,
  Calendar,
  AlertTriangle,
  Shield,
  LogIn,
  LogOut,
  Mail,
  Key,
  Smartphone,
  UserCheck,
  Clock,
} from "lucide-react";
import {
  AuditLogEntry,
  AuditEventType,
  fetchAuditLogs,
} from "../actions/audit-actions";
import { cleanIp } from "@/lib/ip";

// ─── Event type definitions with labels, icons, and color schemes ──────

interface EventDef {
  value: AuditEventType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const EVENT_DEFS: EventDef[] = [
  { value: "", label: "All events", icon: <Filter className="w-3.5 h-3.5" />, color: "" },
  { value: "register", label: "Registration", icon: <UserCheck className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  { value: "login_success", label: "Login (success)", icon: <LogIn className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  { value: "login_failed", label: "Login (failed)", icon: <LogOut className="w-3.5 h-3.5" />, color: "text-red-400" },
  { value: "login_locked", label: "Login (locked)", icon: <Shield className="w-3.5 h-3.5" />, color: "text-amber-400" },
  { value: "login_account_locked", label: "Account locked", icon: <Shield className="w-3.5 h-3.5" />, color: "text-red-400" },
  { value: "google_oauth_success", label: "Google OAuth", icon: <LogIn className="w-3.5 h-3.5" />, color: "text-blue-400" },
  { value: "mfa_challenge_issued", label: "MFA challenge", icon: <Smartphone className="w-3.5 h-3.5" />, color: "text-purple-400" },
  { value: "mfa_verify_success", label: "MFA verify (success)", icon: <Smartphone className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  { value: "mfa_verify_failed", label: "MFA verify (failed)", icon: <Smartphone className="w-3.5 h-3.5" />, color: "text-red-400" },
  { value: "mfa_enabled", label: "MFA enabled", icon: <Shield className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  { value: "mfa_disabled", label: "MFA disabled", icon: <Shield className="w-3.5 h-3.5" />, color: "text-amber-400" },
  { value: "mfa_backup_codes_regenerated", label: "Backup codes regenerated", icon: <Key className="w-3.5 h-3.5" />, color: "text-purple-400" },
  { value: "forgot_password_requested", label: "Password reset requested", icon: <Key className="w-3.5 h-3.5" />, color: "text-blue-400" },
  { value: "password_reset_success", label: "Password reset (success)", icon: <Key className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  { value: "password_reset_failed", label: "Password reset (failed)", icon: <Key className="w-3.5 h-3.5" />, color: "text-red-400" },
  { value: "password_reset_expired", label: "Password reset (expired)", icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-400" },
  { value: "email_verification_sent", label: "Verification sent", icon: <Mail className="w-3.5 h-3.5" />, color: "text-blue-400" },
  { value: "email_verified", label: "Email verified", icon: <Mail className="w-3.5 h-3.5" />, color: "text-emerald-400" },
  { value: "email_verification_resend", label: "Verification resent", icon: <Mail className="w-3.5 h-3.5" />, color: "text-blue-400" },
  { value: "email_verification_failed", label: "Verification (failed)", icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-red-400" },
];

const EVENT_MAP = new Map(EVENT_DEFS.filter((d) => d.value).map((d) => [d.value, d]));

const PAGE_SIZE = 30;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
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

export function AuditLogViewer() {
  // Filters
  const [eventFilter, setEventFilter] = useState<AuditEventType>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState<{
    page: number;
    totalPages: number;
    total: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  const page = meta?.page ?? 1;

  // ─── Load data ────────────────────────────────────────────────────

  const loadLogs = useCallback(
    async (pageNum: number) => {
      setIsLoading(true);
      setError(null);

      const result = await fetchAuditLogs({
        page: pageNum,
        limit: PAGE_SIZE,
        event: eventFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });

      if (!result.success) {
        setError(result.error || "Failed to load audit logs");
        setIsLoading(false);
        return;
      }

      setLogs(result.data ?? []);
      setMeta(
        result.meta
          ? {
              page: result.meta.page,
              totalPages: result.meta.totalPages,
              total: result.meta.total,
            }
          : null,
      );
      setIsLoading(false);
    },
    [eventFilter, dateFrom, dateTo],
  );

  // Initial load
  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  // Track active filters for visual indicator
  useEffect(() => {
    setHasActiveFilters(Boolean(eventFilter || dateFrom || dateTo || searchQuery));
  }, [eventFilter, dateFrom, dateTo, searchQuery]);

  // ─── Reset filters ────────────────────────────────────────────────

  const resetFilters = () => {
    setEventFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  // ─── Filtered logs (client-side search) ───────────────────────────

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.email?.toLowerCase().includes(q) ||
      log.event?.toLowerCase().includes(q) ||
      cleanIp(log.ip)?.includes(q) ||
      log.userId?.includes(q)
    );
  });

  // ─── Render helper for event badge ────────────────────────────────

  const renderEventBadge = (eventType: string) => {
    const def = EVENT_MAP.get(eventType as AuditEventType);
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.65rem] font-medium tracking-wide ${
          def?.color ?? "text-text-secondary"
        } bg-white/[0.04] border border-white/[0.06]`}
      >
        {def?.icon}
        {def?.label ?? eventType}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* ─── Filters Bar ─────────────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          {/* Event type dropdown */}
          <div className="flex-1 w-full md:w-auto md:min-w-[200px]">
            <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2 font-medium">
              Event type
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-2.5 px-4 text-left text-sm text-white flex items-center justify-between gap-2 hover:border-white/20 transition-colors"
              >
                <span className="truncate">
                  {eventFilter
                    ? EVENT_MAP.get(eventFilter)?.label ?? eventFilter
                    : "All events"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-text-secondary transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-black/90 backdrop-blur-2xl border border-white/[0.1] rounded-xl py-1 max-h-[300px] overflow-y-auto shadow-2xl">
                    {EVENT_DEFS.map((def) => (
                      <button
                        key={def.value}
                        type="button"
                        onClick={() => {
                          setEventFilter(def.value);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-white/[0.05] ${
                          eventFilter === def.value
                            ? "text-white bg-white/[0.06]"
                            : "text-text-secondary"
                        }`}
                      >
                        {def.value ? (
                          <span className={def.color}>{def.icon}</span>
                        ) : (
                          def.icon
                        )}
                        {def.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Date from */}
          <div className="w-full md:w-auto">
            <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2 font-medium">
              From
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Date to */}
          <div className="w-full md:w-auto">
            <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2 font-medium">
              To
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 w-full md:w-auto md:min-w-[180px]">
            <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2 font-medium">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Email, IP, user ID..."
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
              onClick={() => loadLogs(page)}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs text-white bg-white/10 hover:bg-white/15 transition-colors px-3 py-2.5 rounded-xl border border-white/[0.08] disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ─── Results Summary ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-text-secondary px-1">
        <p>
          {meta
            ? `${meta.total.toLocaleString()} event${meta.total !== 1 ? "s" : ""} found`
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
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* ─── Logs Table ──────────────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  Event
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  User
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5 hidden md:table-cell">
                  IP
                </th>
                <th className="text-right text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  Time
                </th>
                <th className="w-10 px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && logs.length === 0
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="px-5 py-4" colSpan={5}>
                        <div className="h-6 bg-white/[0.03] rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                : filteredLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.015 }}
                      className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === log.id ? null : log.id,
                        )
                      }
                    >
                      <td className="px-5 py-3">
                        {renderEventBadge(log.event)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          {log.email ? (
                            <span className="text-xs text-white font-medium truncate max-w-[200px]">
                              {log.email}
                            </span>
                          ) : (
                            <span className="text-xs text-text-secondary/50 italic">
                              -
                            </span>
                          )}
                          {log.userId && (
                            <span className="text-[0.6rem] text-text-secondary/40 font-mono mt-0.5 truncate max-w-[200px]">
                              {log.userId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        {log.ip ? (
                          <span className="text-xs font-mono text-text-secondary">
                            {cleanIp(log.ip)}
                          </span>
                        ) : (
                          <span className="text-xs text-text-secondary/50 italic">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-text-secondary">
                            {timeAgo(log.createdAt)}
                          </span>
                          <span className="text-[0.6rem] text-text-secondary/40 mt-0.5">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {expandedRow === log.id ? (
                          <ChevronUp className="w-3.5 h-3.5 text-text-secondary" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-text-secondary/40 group-hover:text-text-secondary transition-colors" />
                        )}
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* ─── Expanded Row Detail ─────────────────────────────────── */}
        {expandedRow && (() => {
          const log = logs.find((l) => l.id === expandedRow);
          if (!log) return null;
          return (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-white/[0.06] bg-white/[0.02] overflow-hidden"
            >
              <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.2em] text-text-secondary/50 font-medium mb-1.5">
                    Event details
                  </p>
                  {renderEventBadge(log.event)}
                  {log.userAgent && (
                    <p className="text-[0.65rem] text-text-secondary/60 mt-2 line-clamp-2">
                      {log.userAgent}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.2em] text-text-secondary/50 font-medium mb-1.5">
                    User info
                  </p>
                  {log.email && (
                    <p className="text-xs text-white">{log.email}</p>
                  )}
                  {log.userId && (
                    <p className="text-[0.6rem] font-mono text-text-secondary/60 mt-0.5">
                      ID: {log.userId}
                    </p>
                  )}
                  {log.ip && (
                    <p className="text-[0.6rem] font-mono text-text-secondary/60 mt-0.5">
                      IP: {cleanIp(log.ip)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.2em] text-text-secondary/50 font-medium mb-1.5">
                    Timestamp
                  </p>
                  <p className="text-xs text-white">
                    {formatDateTime(log.createdAt)}
                  </p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2">
                      <p className="text-[0.6rem] uppercase tracking-[0.2em] text-text-secondary/50 font-medium mb-1">
                        Metadata
                      </p>
                      <pre className="text-[0.55rem] font-mono text-text-secondary/70 bg-black/30 rounded-lg p-2 max-h-24 overflow-y-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </div>

      {/* ─── Empty State ──────────────────────────────────────────────── */}
      {!isLoading && filteredLogs.length === 0 && !error && (
        <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl py-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <Search className="w-6 h-6 text-text-secondary/40" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-1">
            No audit logs found
          </h3>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            {hasActiveFilters
              ? "Try adjusting your filters to see more results."
              : "Audit events will appear here as users interact with the platform."}
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

      {/* ─── Pagination ──────────────────────────────────────────────── */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => loadLogs(page - 1)}
            disabled={page <= 1 || isLoading}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-white transition-colors px-3 py-2 rounded-xl border border-white/[0.06] hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
              const pageNum = (() => {
                // Show pages around current page
                const half = 3;
                const total = meta.totalPages;
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
                  onClick={() => loadLogs(pageNum)}
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
            onClick={() => loadLogs(page + 1)}
            disabled={page >= meta.totalPages || isLoading}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-white transition-colors px-3 py-2 rounded-xl border border-white/[0.06] hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <span className="text-[0.6rem] text-text-secondary/50 ml-2">
            Page {page} of {meta.totalPages}
          </span>
        </div>
      )}
    </motion.div>
  );
}
