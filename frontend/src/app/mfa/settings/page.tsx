"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ScanLine,
  QrCode,
} from "lucide-react";
import { authEndpoints, MfaSetupResponse } from "@/lib/api/auth";

type PageState =
  | "loading"        // initial status check
  | "idle"           // MFA not enabled, showing "set up" CTA
  | "setup"          // QR code displayed, awaiting initial TOTP verification
  | "enabled"        // MFA active, showing "disable" option
  | "disabling"      // showing TOTP input to confirm disable
  | "error";         // error state

export default function MfaSettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Setup state
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [setupTotp, setSetupTotp] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  // Disable state
  const [disableTotp, setDisableTotp] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);

  // Copy feedback
  const [copied, setCopied] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/mfa/settings");
    }
  }, [sessionStatus, router]);

  /** Fetch MFA status from the backend */
  const fetchMfaStatus = async () => {
    if (!session?.accessToken) return;

    try {
      const res = await authEndpoints.mfaStatus({
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.data.success && res.data.data) {
        setPageState(res.data.data.isMfaEnabled ? "enabled" : "idle");
      } else {
        setPageState("error");
        setErrorMsg(res.data.message || "Failed to load MFA status.");
      }
    } catch {
      setPageState("error");
      setErrorMsg("Failed to load MFA status.");
    }
  };

  // Fetch MFA status on mount & when access token becomes available
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    if (!session?.accessToken) {
      // If MFA is pending (e.g. Google OAuth without completing TOTP), redirect to login
      if (session?.mfaRequired) {
        const callback = encodeURIComponent(window.location.pathname);
        router.push(`/login?mfa_pending=true&callbackUrl=${callback}`);
      } else {
        // Session is authenticated but has no accessToken — something is wrong
        setPageState("error");
        setErrorMsg("Your session is incomplete. Please try signing in again.");
      }
      return;
    }

    fetchMfaStatus();
  }, [sessionStatus, session?.accessToken, session?.mfaRequired, router]);

  /** Generate TOTP secret + QR code */
  const handleSetup = async () => {
    if (!session?.accessToken) return;
    setSetupLoading(true);
    setErrorMsg(null);

    try {
      const res = await authEndpoints.setupMfa({
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.data.success && res.data.data) {
        setSetupData(res.data.data);
        setPageState("setup");
      } else {
        setErrorMsg(res.data.message || "Failed to generate MFA setup.");
        setPageState("idle");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setPageState("idle");
    } finally {
      setSetupLoading(false);
    }
  };

  /** Verify initial TOTP code and enable MFA */
  const handleEnable = async () => {
    if (!session?.accessToken || !setupData) return;
    setSetupLoading(true);
    setErrorMsg(null);

    try {
      const res = await authEndpoints.enableMfa(
        { secret: setupData.secret, totpCode: setupTotp },
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      );
      if (res.data.success) {
        setSuccessMsg("MFA has been enabled successfully.");
        setPageState("enabled");
        setSetupTotp("");
      } else {
        setErrorMsg(res.data.message || "Invalid verification code.");
      }
    } catch {
      setErrorMsg("Failed to enable MFA. Please try again.");
    } finally {
      setSetupLoading(false);
    }
  };

  /** Verify TOTP code and disable MFA */
  const handleDisable = async () => {
    if (!session?.accessToken) return;
    setDisableLoading(true);
    setErrorMsg(null);

    try {
      const res = await authEndpoints.disableMfa(
        { totpCode: disableTotp },
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      );
      if (res.data.success) {
        setSuccessMsg("MFA has been disabled.");
        setPageState("idle");
        setDisableTotp("");
        setSetupData(null);
      } else {
        setErrorMsg(res.data.message || "Invalid verification code.");
      }
    } catch {
      setErrorMsg("Failed to disable MFA. Please try again.");
    } finally {
      setDisableLoading(false);
    }
  };

  // Clear success message after 4 seconds
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  // ─── Loading Skeleton ────────────────────────────────────────────
  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && pageState === "loading")) {
    return (
      <main className="min-h-screen bg-background pt-32 pb-20">
        <div className="max-w-xl mx-auto px-6">
          {/* Header skeleton */}
          <div className="mb-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 animate-pulse mb-5" />
            <div className="h-9 w-56 bg-white/10 rounded-lg animate-pulse mb-2" />
            <div className="h-6 w-72 bg-white/10 rounded animate-pulse" />
          </div>

          {/* Card skeleton */}
          <div className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/10 animate-pulse shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-14 w-full bg-white/10 rounded-xl animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-32 pb-20">
      {/* Background ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-20 mix-blend-screen"
             style={{ backgroundImage: "radial-gradient(circle at center, var(--color-romance) 0%, transparent 65%)" }} />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-20 mix-blend-screen"
             style={{ backgroundImage: "radial-gradient(circle at center, var(--color-scifi) 0%, transparent 65%)" }} />
      </div>

      <div className="max-w-xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            Security Settings
          </h1>
          <p className="text-text-secondary font-sans text-lg">
            Manage your two-factor authentication
          </p>
        </motion.div>

        {/* Success toast */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-sm text-emerald-300"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

            {/* ───── MFA NOT ENABLED ───── */}
            {(pageState === "idle") && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <Smartphone className="w-6 h-6 text-white/60" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                      Two-Factor Authentication
                    </h2>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Add an extra layer of security to your account. Once enabled,
                      you&apos;ll need a verification code from your authenticator app
                      in addition to your password when signing in.
                    </p>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-white/40 shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Works with Google Authenticator, Authy, Microsoft Authenticator,
                    or any TOTP-compatible app.
                  </p>
                </div>

                <button
                  onClick={handleSetup}
                  disabled={setupLoading}
                  className="w-full bg-white text-black font-semibold font-sans rounded-xl h-14 flex items-center justify-center group hover:bg-white/90 transition-all duration-300 disabled:opacity-50"
                >
                  {setupLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Set Up Authenticator
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" strokeWidth={2} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ───── SETUP — QR CODE + VERIFY ───── */}
            {(pageState === "setup" && setupData) && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    Scan This QR Code
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Open your authenticator app and scan the code below.
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-2xl shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={setupData.qrCode}
                      alt="TOTP QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                {/* Manual entry */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-xs text-text-secondary mb-2 font-medium uppercase tracking-wider">
                    Or enter manually
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-white/70 bg-black/30 rounded-lg px-3 py-2 truncate select-all">
                      {setupData.secret}
                    </code>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(setupData.secret);
                        } catch {
                          /* clipboard not available */
                        }
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className={`shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                        copied
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-white/60 hover:text-white bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Verify code */}
                <div className="border-t border-white/[0.06] pt-6">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Verify the Code
                  </h3>
                  <p className="text-xs text-text-secondary mb-4">
                    Enter the 6-digit code from your authenticator app to confirm setup.
                  </p>

                  <div className="flex gap-3 items-center">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyRound className="w-4 h-4 text-white/30" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={setupTotp}
                        onChange={(e) => setSetupTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3.5 pl-11 pr-4 text-white text-center text-lg tracking-[0.4em] font-mono placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                        disabled={setupLoading}
                      />
                    </div>
                    <button
                      onClick={handleEnable}
                      disabled={setupLoading || setupTotp.length !== 6}
                      className="shrink-0 bg-white text-black font-semibold font-sans rounded-xl h-12 px-6 flex items-center justify-center group hover:bg-white/90 transition-all duration-300 disabled:opacity-50 text-sm"
                    >
                      {setupLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Verify
                          <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Cancel */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setPageState("idle");
                      setSetupData(null);
                      setSetupTotp("");
                      setErrorMsg(null);
                    }}
                    className="text-sm text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ───── MFA ENABLED ───── */}
            {(pageState === "enabled") && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                      MFA is Active
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Your account is protected by two-factor authentication.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-300/80">
                    You&apos;ll need a verification code from your authenticator app
                    when signing in.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setPageState("disabling");
                    setErrorMsg(null);
                  }}
                  className="w-full bg-white/5 hover:bg-red-500/10 text-text-secondary hover:text-red-400 font-sans font-medium rounded-xl h-12 flex items-center justify-center border border-white/[0.06] hover:border-red-500/30 transition-all duration-300"
                >
                  Disable MFA
                </button>
              </div>
            )}

            {/* ───── DISABLING — TOTP CONFIRMATION ───── */}
            {(pageState === "disabling") && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                      Disable MFA?
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Enter the 6-digit code from your authenticator app to confirm.
                    </p>
                  </div>
                </div>

                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                  <p className="text-xs text-red-400/70 leading-relaxed">
                    This will make your account less secure. Consider re-enabling it
                    once the current issue is resolved.
                  </p>
                </div>

                <div className="flex gap-3 items-center">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <KeyRound className="w-4 h-4 text-white/30" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={disableTotp}
                      onChange={(e) => setDisableTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3.5 pl-11 pr-4 text-white text-center text-lg tracking-[0.4em] font-mono placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                      disabled={disableLoading}
                    />
                  </div>
                  <button
                    onClick={handleDisable}
                    disabled={disableLoading || disableTotp.length !== 6}
                    className="shrink-0 bg-red-500/80 hover:bg-red-500 text-white font-semibold font-sans rounded-xl h-12 px-6 flex items-center justify-center transition-all duration-300 disabled:opacity-50 text-sm"
                  >
                    {disableLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Disable"
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setPageState("enabled");
                      setDisableTotp("");
                      setErrorMsg(null);
                    }}
                    className="text-sm text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ───── ERROR STATE (initial fetch failure) ───── */}
            {(pageState === "error") && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center py-6"
              >
                <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                  <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Something went wrong
                </h3>
                <p className="text-sm text-text-secondary mb-6">
                  {errorMsg || "Failed to load security settings."}
                </p>
                <button
                  onClick={() => {
                    setPageState("loading");
                    setErrorMsg(null);
                    fetchMfaStatus();
                  }}
                  className="bg-white/10 hover:bg-white/15 text-white font-medium font-sans rounded-xl h-12 px-6 flex items-center justify-center gap-2 transition-all duration-300 text-sm"
                >
                  <Loader2 className="w-4 h-4" />
                  Retry
                </button>
              </motion.div>
            )}

            {/* Inline error (inside idle / setup / enabled / disabling) */}
            {errorMsg && pageState !== "error" && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-400 text-center mt-4"
              >
                {errorMsg}
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Info footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-8 text-xs text-text-secondary/50 text-center leading-relaxed max-w-md mx-auto"
        >
          TOTP (Time-based One-Time Password) codes refresh every 30 seconds.
          If your code doesn&apos;t work, wait for a new one and try again.
        </motion.p>
      </div>
    </main>
  );
}
