"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  RefreshCw,
  Clock,
  Globe,
  Ban,
  Check,
  X,
} from "lucide-react";
import {
  IpAccessRule,
  fetchIpAccessRules,
  createIpAccessRule,
  updateIpAccessRule,
  deleteIpAccessRule,
} from "../actions/ip-access-actions";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function isExpired(rule: IpAccessRule): boolean {
  if (!rule.expiresAt) return false;
  return new Date(rule.expiresAt) < new Date();
}

/** Validate an IP address or CIDR range. */
function isValidIpOrCidr(value: string): boolean {
  const trimmed = value.trim();
  // Single IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const cidrRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/\d{1,2}$/;

  const match = trimmed.match(ipv4Regex) || trimmed.match(cidrRegex);
  if (!match) return false;

  // Validate each octet
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) return false;
  }

  // Validate CIDR prefix
  if (trimmed.includes("/")) {
    const prefix = parseInt(trimmed.split("/")[1], 10);
    if (prefix < 0 || prefix > 32) return false;
  }

  return true;
}

export function IpAccessManager() {
  const [rules, setRules] = useState<IpAccessRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New rule form
  const [showForm, setShowForm] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newType, setNewType] = useState<"ALLOW" | "BLOCK">("BLOCK");
  const [newLabel, setNewLabel] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Success / delete
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showStatus = (type: "success" | "error", message: string) => {
    setStatusMsg({ type, message });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // ─── Load rules ────────────────────────────────────────────────────
  const loadRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchIpAccessRules();
    if (result.success && result.data) {
      setRules(result.data);
    } else {
      setError(result.error || "Failed to load IP access rules");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // ─── Create rule ───────────────────────────────────────────────────
  const handleCreate = async () => {
    const trimmedIp = newIp.trim();
    if (!trimmedIp || !newLabel.trim()) {
      setFormError("IP address / CIDR and label are required.");
      return;
    }
    if (!isValidIpOrCidr(trimmedIp)) {
      setFormError("Invalid IP address or CIDR range. Use format: 192.168.1.1 or 10.0.0.0/16");
      return;
    }

    setSaving(true);
    setFormError(null);

    const result = await createIpAccessRule({
      ip: trimmedIp,
      type: newType,
      label: newLabel.trim(),
      expiresAt: newExpiresAt || undefined,
    });

    if (result.success) {
      setShowForm(false);
      setNewIp("");
      setNewType("BLOCK");
      setNewLabel("");
      setNewExpiresAt("");
      showStatus("success", `IP rule created - ${newType === "BLOCK" ? "blocking" : "allowing"} ${trimmedIp}`);
      loadRules();
    } else {
      setFormError(result.error || "Failed to create rule");
    }

    setSaving(false);
  };

  // ─── Toggle active state ──────────────────────────────────────────
  const handleToggleActive = async (rule: IpAccessRule) => {
    const result = await updateIpAccessRule(rule.id, { isActive: !rule.isActive });
    if (result.success) {
      showStatus("success", `Rule ${rule.isActive ? "deactivated" : "activated"}`);
      loadRules();
    } else {
      showStatus("error", result.error || "Failed to update rule");
    }
  };

  // ─── Delete rule ───────────────────────────────────────────────────
  const handleDelete = async (rule: IpAccessRule) => {
    const result = await deleteIpAccessRule(rule.id);
    if (result.success) {
      showStatus("success", `Rule for ${rule.ip} deleted`);
      loadRules();
    } else {
      showStatus("error", result.error || "Failed to delete rule");
    }
  };

  // ─── Filtered rules ───────────────────────────────────────────────
  const filteredRules = rules.filter((rule) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      rule.ip.toLowerCase().includes(q) ||
      rule.label.toLowerCase().includes(q)
    );
  });

  const blockRules = filteredRules.filter((r) => r.type === "BLOCK");
  const allowRules = filteredRules.filter((r) => r.type === "ALLOW");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Status toast */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`p-4 rounded-2xl flex items-center gap-3 text-sm ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border border-red-500/20 text-red-300"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            {statusMsg.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toolbar ─────────────────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 bg-white text-black font-semibold rounded-xl h-10 px-5 text-sm hover:bg-white/90 transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </button>
            <button
              type="button"
              onClick={loadRules}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors px-3 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IP or label..."
              className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ─── Add Rule Form ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 md:p-8">
              <h3 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New IP Access Rule
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* IP / CIDR */}
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2 font-medium">
                    IP / CIDR
                  </label>
                  <input
                    type="text"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    placeholder="192.168.1.1 or 10.0.0.0/16"
                    className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 transition-colors font-mono"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2 font-medium">
                    Action
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewType("ALLOW")}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all ${
                        newType === "ALLOW"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-black/50 text-text-secondary border border-white/[0.06] hover:border-white/20"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Allow
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType("BLOCK")}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all ${
                        newType === "BLOCK"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-black/50 text-text-secondary border border-white/[0.06] hover:border-white/20"
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Block
                    </button>
                  </div>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2 font-medium">
                    Label
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Office VPN, Known attacker"
                    className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary mb-2 font-medium">
                    Expires (optional)
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                    <input
                      type="datetime-local"
                      value={newExpiresAt}
                      onChange={(e) => setNewExpiresAt(e.target.value)}
                      className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              {/* Form error */}
              {formError && (
                <div className="mt-4 flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-white text-black font-semibold rounded-xl h-10 px-6 text-sm hover:bg-white/90 transition-all duration-300 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Create Rule
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors px-4 py-2 rounded-xl border border-white/[0.06] hover:border-white/20"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Summary ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 text-xs text-text-secondary px-1">
        <span className="flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5 text-red-400" />
          <span>{blockRules.length} blocked</span>
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{allowRules.length} allowed</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />
          <span>{filteredRules.length} total</span>
        </span>
        {isLoading && (
          <span className="flex items-center gap-1.5 ml-auto">
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

      {/* ─── Rules Table ──────────────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  Status
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  IP / CIDR
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  Action
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  Label
                </th>
                <th className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5 hidden md:table-cell">
                  Expires
                </th>
                <th className="text-right text-[0.65rem] uppercase tracking-[0.2em] text-text-secondary font-medium px-5 py-3.5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && rules.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="px-5 py-4" colSpan={6}>
                        <div className="h-6 bg-white/[0.03] rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                : filteredRules.map((rule, index) => {
                    const expired = isExpired(rule);
                    return (
                      <motion.tr
                        key={rule.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className={`group hover:bg-white/[0.02] transition-colors ${
                          expired || !rule.isActive ? "opacity-50" : ""
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(rule)}
                              className={
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none " +
                                (rule.isActive && !expired
                                  ? rule.type === "ALLOW"
                                    ? "bg-emerald-500"
                                    : "bg-red-500"
                                  : "bg-white/20")
                              }
                              role="switch"
                              aria-checked={rule.isActive && !expired}
                              title={rule.isActive ? "Deactivate" : "Activate"}
                            >
                              <span
                                className={
                                  "pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out " +
                                  (rule.isActive && !expired ? "translate-x-[18px]" : "translate-x-[3px]")
                                }
                              />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-sm text-white">{rule.ip}</span>
                        </td>
                        <td className="px-5 py-4">
                          {rule.type === "ALLOW" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.65rem] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" />
                              Allow
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.65rem] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <Ban className="w-3 h-3" />
                              Block
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-white">{rule.label}</span>
                            {!rule.isActive && (
                              <span className="text-[0.6rem] text-text-secondary/50 mt-0.5">Inactive</span>
                            )}
                            {expired && (
                              <span className="text-[0.6rem] text-amber-400/60 mt-0.5">Expired</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          {rule.expiresAt ? (
                            <span className="text-xs text-text-secondary">
                              {formatDate(rule.expiresAt)}
                            </span>
                          ) : (
                            <span className="text-xs text-text-secondary/50 italic">Never</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(rule)}
                              className="p-2 rounded-lg text-text-secondary/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Delete rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Empty State ──────────────────────────────────────────────── */}
      {!isLoading && filteredRules.length === 0 && !error && (
        <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl py-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <Shield className="w-6 h-6 text-text-secondary/40" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-1">
            No IP access rules
          </h3>
          <p className="text-sm text-text-secondary max-w-sm mx-auto mb-6">
            {searchQuery
              ? "No rules match your search."
              : "Add IP allow or block rules to control access to your application."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-white text-black font-semibold rounded-xl h-10 px-5 text-sm hover:bg-white/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Your First Rule
            </button>
          )}
        </div>
      )}

      {/* ─── Info Card ────────────────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white/40" />
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2">
            <p>
              <strong className="text-white/70">How it works:</strong> The middleware checks every
              incoming request against these rules in order.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong className="text-emerald-400/80">Allow</strong> rules let matching IPs bypass all
                rate limiting entirely. Useful for trusted IPs like office VPNs, monitoring services, or API
                integrations.
              </li>
              <li>
                <strong className="text-red-400/80">Block</strong> rules deny access outright with a 403
                status. Useful for permanently blocking known attackers or abusive IPs.
              </li>
              <li>
                You can use <strong className="text-white/70">CIDR notation</strong> to match entire
                subnets (e.g. <code className="font-mono text-white/60">10.0.0.0/16</code>).
              </li>
              <li>
                Rules with an <strong className="text-white/70">expiry date</strong> are automatically
                ignored after that date. Use this for temporary blocks.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
