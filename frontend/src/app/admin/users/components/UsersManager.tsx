"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  Trash2, X, AlertCircle, CheckCircle2, Loader2,
  Shield, ShieldOff, Mail, Calendar, Smartphone,
  Globe, AtSign,
  User as UserIcon,
} from "lucide-react";
import {
  AdminUser,
  UsersMeta,
  fetchUsers,
  deleteUser,
  updateUserRole,
} from "../actions/user-actions";

// ─── Helpers ───────────────────────────────────────────────────────

const PAGE_SIZE = 20;

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
    hour12: false,
  });
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleColor(role: string): string {
  return role === "ADMIN"
    ? "text-emerald-400"
    : "text-text-secondary";
}

function getProviderBadge(provider: string) {
  return provider === "GOOGLE" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[0.6rem] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300">
      <Globe className="w-3 h-3" />
      Google
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[0.6rem] font-medium bg-white/5 border border-white/10 text-text-secondary">
      <AtSign className="w-3 h-3" />
      Email
    </span>
  );
}

function getRoleBadge(role: string) {
  return role === "ADMIN" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[0.6rem] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
      <Shield className="w-3 h-3" />
      ADMIN
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[0.6rem] font-medium bg-white/5 border border-white/10 text-text-secondary">
      <UserIcon className="w-3 h-3" />
      CUSTOMER
    </span>
  );
}

// ─── Confirm Delete Modal ──────────────────────────────────────────

function ConfirmDeleteModal({
  user,
  onConfirm,
  onCancel,
  isProcessing,
}: {
  user: { id: string; name: string; email: string };
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isProcessing ? onCancel : undefined}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-card/80 backdrop-blur-3xl border border-white/[0.08] rounded-[28px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <button
          type="button"
          onClick={!isProcessing ? onCancel : undefined}
          disabled={isProcessing}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>

          <h3 className="text-xl font-display font-semibold text-white mb-2">
            Delete user
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
            Are you sure you want to delete{" "}
            <span className="text-white font-medium">
              &ldquo;{user.name}&rdquo;
            </span>
            ? This will permanently delete their account and all related data
            (orders, reviews, cart, addresses, etc.).
          </p>

          <div className="flex gap-3 mt-8 w-full">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 h-12 rounded-2xl border border-white/10 bg-white/5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 h-12 rounded-2xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete permanently"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function UsersManager() {
  // Filters
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<UsersMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [confirmRoleChange, setConfirmRoleChange] = useState<{
    user: AdminUser;
    newRole: string;
  } | null>(null);

  // Role update state
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // Success toast
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const page = meta?.page ?? 1;
  const hasActiveFilters = Boolean(searchQuery);

  // ─── Load data ────────────────────────────────────────────────────

  const loadUsers = useCallback(
    async (pageNum: number) => {
      setIsLoading(true);
      setError(null);

      const result = await fetchUsers({
        page: pageNum,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
      });

      if (!result.success) {
        setError(result.error || "Failed to load users");
        setIsLoading(false);
        return;
      }

      setUsers(result.data ?? []);
      setMeta(result.meta ?? null);
      setIsLoading(false);
    },
    [searchQuery],
  );

  // Initial load
  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  // ─── Delete user ──────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;

    setIsDeleting(true);

    const result = await deleteUser(confirmDelete.id);

    setIsDeleting(false);

    if (!result.success) {
      setError(result.error || "Failed to delete user");
      setConfirmDelete(null);
      return;
    }

    setSuccessMsg(result.message || `User deleted successfully`);
    setTimeout(() => setSuccessMsg(null), 4000);
    setConfirmDelete(null);

    // Refresh the list
    loadUsers(page);
  };

  // ─── Update role ──────────────────────────────────────────────────

  const initiateRoleChange = (user: AdminUser) => {
    const newRole = user.role === "ADMIN" ? "CUSTOMER" : "ADMIN";
    setConfirmRoleChange({ user, newRole });
  };

  const handleToggleRole = async () => {
    if (!confirmRoleChange) return;

    const { user, newRole } = confirmRoleChange;

    setUpdatingRoleId(user.id);
    setConfirmRoleChange(null);
    const result = await updateUserRole(user.id, newRole);
    setUpdatingRoleId(null);

    if (!result.success) {
      setError(result.error || "Failed to update role");
      return;
    }

    setSuccessMsg(
      `${user.name}'s role changed to ${newRole.charAt(0) + newRole.slice(1).toLowerCase()}`,
    );
    setTimeout(() => setSuccessMsg(null), 4000);

    // Update local state
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)),
    );
  };

  // ─── Reset filters ────────────────────────────────────────────────

  const resetFilters = () => {
    setSearchQuery("");
  };

  // ─── Debounce search ──────────────────────────────────────────────

  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
          {/* Search */}
          <div className="flex-[2] w-full">
            <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2 font-medium">
              Search users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name, email, or user ID..."
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
              onClick={() => loadUsers(page)}
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
            ? `${meta.total.toLocaleString()} user${meta.total !== 1 ? "s" : ""} found`
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

      {/* ─── Users Table ────────────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  User
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  Role
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  Provider
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5 hidden md:table-cell">
                  Status
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5 hidden lg:table-cell">
                  Activity
                </th>
                <th className="text-right text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5 hidden md:table-cell">
                  Joined
                </th>
                <th className="w-32 px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && users.length === 0
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="px-5 py-4" colSpan={7}>
                        <div className="h-10 bg-white/[0.03] rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                : users.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.015,
                      }}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-[0.6rem] font-bold text-text-secondary shrink-0 overflow-hidden">
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(user.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[200px]">
                              {user.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[0.6rem] text-text-secondary/60">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[200px]">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-5 py-3">
                        {getProviderBadge(user.provider)}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[0.6rem] ${
                              user.emailVerified
                                ? "text-emerald-400/70"
                                : "text-amber-400/70"
                            }`}
                          >
                            {user.emailVerified ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Verified
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                Unverified
                              </>
                            )}
                          </span>
                          {user.isMfaEnabled && (
                            <span className="inline-flex items-center gap-1 text-[0.6rem] text-purple-400/70">
                              <Smartphone className="w-3 h-3" />
                              MFA enabled
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-3 text-[0.6rem] text-text-secondary/60">
                          <span>{user._count.orders} orders</span>
                          <span>{user._count.reviews} reviews</span>
                          <span>{user._count.addresses} addresses</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right hidden md:table-cell">
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-text-secondary">
                            {timeAgo(user.createdAt)}
                          </span>
                          <span className="text-[0.6rem] text-text-secondary/40 mt-0.5">
                            {formatDate(user.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          {/* Toggle role button */}
                          <button
                            type="button"
                            onClick={() => initiateRoleChange(user)}
                            disabled={updatingRoleId === user.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.6rem] font-medium transition-all border disabled:opacity-40 ${
                              user.role === "ADMIN"
                                ? "text-amber-400/70 hover:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20"
                                : "text-emerald-400/70 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20"
                            }`}
                            title={
                              user.role === "ADMIN"
                                ? "Demote to customer"
                                : "Promote to admin"
                            }
                          >
                            {updatingRoleId === user.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : user.role === "ADMIN" ? (
                              <ShieldOff className="w-3 h-3" />
                            ) : (
                              <Shield className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">
                              {user.role === "ADMIN"
                                ? "Demote"
                                : "Promote"}
                            </span>
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                id: user.id,
                                name: user.name,
                                email: user.email,
                              })
                            }
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.6rem] font-medium text-red-400/70 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                            title="Delete user"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* ─── Empty State ────────────────────────────────────────────── */}
        {!isLoading && users.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-text-secondary/40" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              No users found
            </h3>
            <p className="text-sm text-text-secondary max-w-sm mx-auto">
              {hasActiveFilters
                ? "Try adjusting your search to see more results."
                : "Users will appear here once they register on the platform."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-white bg-white/10 hover:bg-white/15 transition-colors px-4 py-2 rounded-xl"
              >
                <X className="w-3.5 h-3.5" />
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Pagination ────────────────────────────────────────────── */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => loadUsers(page - 1)}
            disabled={page <= 1 || isLoading}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-white transition-colors px-3 py-2 rounded-xl border border-white/[0.06] hover:border-white/20 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from(
              { length: Math.min(meta.totalPages, 7) },
              (_, i) => {
                const pageNum = (() => {
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
                    onClick={() => loadUsers(pageNum)}
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
              },
            )}
          </div>

          <button
            type="button"
            onClick={() => loadUsers(page + 1)}
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

      {/* ─── Confirm Delete Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDeleteModal
            user={confirmDelete}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setConfirmDelete(null)}
            isProcessing={isDeleting}
          />
        )}
      </AnimatePresence>

      {/* ─── Confirm Role Change Modal ──────────────────────────────── */}
      <AnimatePresence>
        {confirmRoleChange && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmRoleChange(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm bg-card/80 backdrop-blur-3xl border border-white/[0.08] rounded-[28px] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 ${
                  confirmRoleChange.newRole === "ADMIN"
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-amber-500/10 border border-amber-500/20"
                }`}>
                  {confirmRoleChange.newRole === "ADMIN" ? (
                    <Shield className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ShieldOff className="w-6 h-6 text-amber-400" />
                  )}
                </div>

                <h3 className="text-xl font-display font-semibold text-white mb-2">
                  {confirmRoleChange.newRole === "ADMIN"
                    ? "Promote to admin?"
                    : "Demote to customer?"}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
                  {confirmRoleChange.newRole === "ADMIN"
                    ? `This will grant &ldquo;${confirmRoleChange.user.name}&rdquo; full admin access to manage books, orders, users, and settings.`
                    : `This will remove admin privileges from &ldquo;${confirmRoleChange.user.name}&rdquo;. They will only have customer-level access.`}
                </p>

                <div className="flex gap-3 mt-8 w-full">
                  <button
                    type="button"
                    onClick={() => setConfirmRoleChange(null)}
                    className="flex-1 h-12 rounded-2xl border border-white/10 bg-white/5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleRole}
                    className={`flex-1 h-12 rounded-2xl text-sm font-bold text-white transition-all shadow-lg active:scale-[0.97] ${
                      confirmRoleChange.newRole === "ADMIN"
                        ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                        : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                    }`}
                  >
                    {confirmRoleChange.newRole === "ADMIN" ? "Promote" : "Demote"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
