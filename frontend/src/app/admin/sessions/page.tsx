"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Monitor,
  Smartphone,
  AlertCircle,
  Search,
  RefreshCw,
  Ban,
  ShieldCheck,
  Clock,
  User,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { getRecentSessions, createIpAccessRuleFromSession } from "./actions";

interface RecentSession {
  ip: string;
  userAgent: string;
  email: string | null;
  userId: string | null;
  lastSeen: string;
  firstSeen: string;
  events: number;
}

interface ParsedDevice {
  browser: string;
  os: string;
  type: "desktop" | "mobile" | "unknown";
}

function parseUserAgent(ua: string): ParsedDevice {
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);

  let browser = "Unknown";
  if (/Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)) browser = "Chrome";
  else if (/Firefox/i.test(ua) && !/Seamonkey/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua) && !/Chrome|Edg/i.test(ua)) browser = "Safari";
  else if (/Edg/i.test(ua)) browser = "Edge";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera";
  else if (/MSIE|Trident/i.test(ua)) browser = "Internet Explorer";

  let os = "Unknown";
  if (/Windows NT 10/i.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6\.1/i.test(ua)) os = "Windows 7";
  else if (/Mac OS X 10_15/i.test(ua)) os = "macOS Catalina+";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android 1[0-9]/i.test(ua)) os = "Android";
  else if (/Android/i.test(ua)) os = "Android (old)";
  else if (/iPhone OS 1[7-9]|iPhone OS 2/i.test(ua)) os = "iOS 17+";
  else if (/iPhone OS|iPad OS/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua) && !/Android/i.test(ua)) os = "Linux";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";

  return {
    browser,
    os,
    type: isMobile ? "mobile" : "desktop",
  };
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
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EventBadge({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <span className="text-[0.55rem] font-medium px-1.5 py-0.5 rounded-md bg-white/5 text-text-secondary/60 border border-white/[0.04]">
      {count} events
    </span>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<RecentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showStatus = (type: "success" | "error", message: string) => {
    setStatusMsg({ type, message });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleCreateRule = async (ip: string, type: "ALLOW" | "BLOCK") => {
    const key = `${ip}|${type}`;
    setCreatingId(key);
    const result = await createIpAccessRuleFromSession(ip, type);
    if (result.success) {
      showStatus("success", `${type === "ALLOW" ? "Allowed" : "Blocked"} IP ${ip}`);
    } else {
      showStatus("error", result.error || `Failed to ${type.toLowerCase()} IP ${ip}`);
    }
    setCreatingId(null);
  };

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getRecentSessions();
      if (result.success && result.data) {
        setSessions(result.data);
      } else {
        setError(result.error || "Failed to load sessions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filtered = sessions.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.ip.toLowerCase().includes(q) ||
      (s.email?.toLowerCase() ?? "").includes(q) ||
      s.userAgent.toLowerCase().includes(q) ||
      parseUserAgent(s.userAgent).browser.toLowerCase().includes(q) ||
      parseUserAgent(s.userAgent).os.toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mb-10">
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-text-secondary mb-2">
            Admin
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Recent Sessions
          </h1>
          <p className="mt-2 text-text-secondary font-sans text-sm max-w-xl">
            View devices and IP addresses that have recently accessed your application. Click Allow
            or Block to create an IP access rule directly from any session.
          </p>
        </div>

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/ip-access"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold rounded-xl h-10 px-5 text-sm hover:bg-white/90 transition-all duration-300"
            >
              <ShieldCheck className="w-4 h-4" />
              IP Rules
            </Link>
            <button
              type="button"
              onClick={loadSessions}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors px-3 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IP, email, or device..."
              className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-6 mt-4 text-xs text-text-secondary px-1">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>{sessions.length} unique {sessions.length === 1 ? "device" : "devices"}</span>
          </span>
          {sessions.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Latest: {timeAgo(sessions[0].lastSeen)}
              </span>
            </span>
          )}
          {isLoading && (
            <span className="flex items-center gap-1.5 ml-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Loading...
            </span>
          )}
        </div>
      </div>

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

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* ─── Sessions List ──────────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden">
        {isLoading && sessions.length === 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-5">
                <div className="h-5 bg-white/[0.03] rounded-lg animate-pulse w-3/4 mb-2" />
                <div className="h-4 bg-white/[0.02] rounded-lg animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <Globe className="w-6 h-6 text-text-secondary/40" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              {searchQuery ? "No matching sessions" : "No sessions found"}
            </h3>
            <p className="text-sm text-text-secondary max-w-sm mx-auto">
              {searchQuery
                ? "Try a different search term."
                : "Session data will appear here once users interact with your app."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            <AnimatePresence initial={false}>
              {filtered.map((session, index) => {
                const device = parseUserAgent(session.userAgent);
                return (
                  <motion.div
                    key={`${session.ip}|${session.userAgent}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className="p-4 md:p-5 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Device icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          device.type === "mobile"
                            ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        }`}
                      >
                        {device.type === "mobile" ? (
                          <Smartphone className="w-5 h-5" />
                        ) : (
                          <Monitor className="w-5 h-5" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">
                            {device.browser}
                          </span>
                          <span className="text-xs text-text-secondary/50">·</span>
                          <span className="text-xs text-text-secondary">{device.os}</span>
                          {session.userAgent && session.userAgent !== "" && (
                            <span className="text-[0.55rem] text-text-secondary/40 truncate max-w-[200px] font-mono hidden md:inline-block">
                              {session.userAgent.split(" ").slice(0, 3).join(" ")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="font-mono text-xs text-blue-300/80 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/10">
                            {session.ip}
                          </span>
                          {session.email && (
                            <span className="flex items-center gap-1 text-xs text-text-secondary">
                              <User className="w-3 h-3" />
                              {session.email}
                            </span>
                          )}
                          <EventBadge count={session.events} />
                        </div>

                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[0.6rem] text-text-secondary/50">
                            Last seen: {timeAgo(session.lastSeen)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCreateRule(session.ip, "ALLOW")}
                          disabled={creatingId === `${session.ip}|ALLOW`}
                          className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-40"
                          title="Allow this IP"
                        >
                          {creatingId === `${session.ip}|ALLOW` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateRule(session.ip, "BLOCK")}
                          disabled={creatingId === `${session.ip}|BLOCK`}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-40"
                          title="Block this IP"
                        >
                          {creatingId === `${session.ip}|BLOCK` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Ban className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ─── Info Card ────────────────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-white/40" />
          </div>
          <div className="text-xs text-text-secondary leading-relaxed space-y-2">
            <p>
              <strong className="text-white/70">Where this data comes from:</strong> Every login, auth
              event, and blocked request is logged to the audit trail with the visitor&apos;s IP address
              and user agent. Sessions are grouped by unique IP + device combinations and sorted by
              most recent activity.
            </p>
            <p>
              Use this page to identify devices accessing your app, then switch to the{" "}
              <Link href="/admin/ip-access" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                IP Rules
              </Link>{" "}
              page to create allow or block rules for specific IPs and subnets.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
      </div>
    </main>
  );
}
