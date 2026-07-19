"use client";

import { FormEvent, useState, Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session-context";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, Shield } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
      }) => void;
    };
  }
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();
  const requestedCallbackUrl = params.get("callbackUrl") ?? "/";
  const callbackUrl = (() => {
    try {
      const normalized = requestedCallbackUrl.startsWith("http")
        ? new URL(requestedCallbackUrl).pathname
        : requestedCallbackUrl;
      return normalized.startsWith("/admin") ? "/" : requestedCallbackUrl;
    } catch {
      return "/";
    }
  })();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Email verification state
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const turnstileRef = useRef<HTMLDivElement>(null);
  const mfaFlagChecked = useRef(false);

  // Check for expired-session redirect (from 401 interceptor or middleware)
  const expired = params.get("expired");
  const [sessionExpired, setSessionExpired] = useState(false);

  // Check for MFA session expired redirect (from expired MFA challenge token)
  const mfaExpired = params.get("mfa_expired");
  const [mfaSessionExpired, setMfaSessionExpired] = useState(false);

  // Check for session-revoked redirect (from "Revoke All Sessions" action)
  const revoked = params.get("revoked");
  const [sessionsRevoked, setSessionsRevoked] = useState(false);

  useEffect(() => {
    if (mfaExpired === "true") {
      setMfaSessionExpired(true);
    }
    if (revoked === "true") {
      setSessionsRevoked(true);
    }
  }, [mfaExpired, revoked]);

  useEffect(() => {
    if (expired !== "true") return;

    // Clear the stale session cookie
    const clearStaleSession = async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // ignore
      }
      setSessionExpired(true);
    };

    clearStaleSession();
  }, [expired]);

  // Mark as mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for pending MFA after any page navigation (e.g. Google OAuth redirect)
  useEffect(() => {
    if (mfaFlagChecked.current) return;
    if (!session) return;

    if (session.mfaRequired && session.mfaToken && !session.accessToken) {
      mfaFlagChecked.current = true;
      setMfaToken(session.mfaToken);
      setMfaRequired(true);
    }
  }, [session]);

  useEffect(() => {
    if (!mounted) return;

    const script = document.createElement("script");
    script.id = "turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.turnstile && turnstileRef.current) {
        window.turnstile.render(turnstileRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
          callback: (token: string) => {
            setCaptchaToken(token);
          },
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById("turnstile-script");
      if (existing) existing.remove();
    };
  }, [mounted]);

  /** Step 1: Submit email + password to backend */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaToken }),
      });

      // ── Non-200 responses: parse the error message from the backend ──
      if (!response.ok) {
        let message = "Invalid email or password.";
        try {
          const errBody = await response.json();
          if (errBody?.message) message = errBody.message;
        } catch {
          // Response body wasn't valid JSON - use default message
        }

        if (message.toLowerCase().includes("verify your email")) {
          setEmailNotVerified(true);
        }
        setError(message);
        setIsLoading(false);
        return;
      }

      const result = await response.json();

      // ── success:false responses (shouldn't happen with 200, but just in case) ──
      if (!result.success) {
        setError(result.message || "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      // Check if MFA is required
      if (result.data?.mfaRequired) {
        setMfaToken(result.data.mfaToken);
        setMfaRequired(true);
        setIsLoading(false);
        return;
      }

      // Normal login - create NextAuth session with the JWT
      await completeLogin(result.data.accessToken);
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  /** Step 2: Submit TOTP code for MFA verification */
  const handleMfaSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/mfa/verify-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaToken, totpCode }),
      });

      const result = await response.json();

      if (!result.success) {
        // If the MFA challenge token expired, redirect back to login to start fresh
        if (result.message?.toLowerCase().includes("mfa session expired")) {
          router.push("/login?mfa_expired=true");
          return;
        }
        setError(result.message || "Invalid verification code.");
        setIsLoading(false);
        return;
      }

      // After MFA verification, create the full session with the access token
      // This replaces the "pending" session (from Google OAuth) or creates the final session (from credentials)
      await completeLogin(result.data.accessToken);
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  /** Decode JWT payload to extract the user role (client-side only, no signature verification) */
  function decodeJwtRole(token: string): string | null {
    try {
      const payload = token.split(".")[1];
      if (!payload) return null;
      let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const decoded = JSON.parse(atob(b64)) as { role?: string };
      return decoded.role ?? null;
    } catch {
      return null;
    }
  }

  /** Final step: Create session cookie with access token */
  const completeLogin = async (accessToken: string) => {
    try {
      const res = await fetch("/api/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to create session" }));
        setError(err.message || "Your session could not be created. Please try again.");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);

      // Redirect admins to the admin dashboard regardless of callbackUrl
      const role = decodeJwtRole(accessToken);
      const redirectUrl = role === "ADMIN" ? "/admin" : callbackUrl;

      router.push(redirectUrl);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = `/api/auth/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  // ─── MFA Step UI ────────────────────────────────────────────────────
  if (mfaRequired) {
    return (
      <div className="min-h-[calc(100vh-100px)] pt-24 pb-12 flex flex-col justify-center items-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-30 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-romance) 0%, transparent 65%)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md px-6 z-10"
        >
          <div className="mb-10 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="inline-block mb-4"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
                Two-Factor Auth
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-text-secondary font-sans text-lg"
            >
              Enter the 6-digit code from your authenticator app
              or a backup code.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

            <form onSubmit={handleMfaSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary">
                  {useBackupCode ? "Backup Code" : "Verification Code"}
                </label>
                <input
                  type="text"
                  inputMode={useBackupCode ? "text" : "numeric"}
                  autoComplete="one-time-code"
                  maxLength={10}
                  required
                  value={totpCode}
                  onChange={(e) => {
                    const val = useBackupCode
                      ? e.target.value.toUpperCase()
                      : e.target.value.replace(/\D/g, "").slice(0, 6);
                    if (useBackupCode) {
                      // Allow 10-character hex backup codes
                      if (/^[0-9A-F]{0,10}$/.test(val)) {
                        setTotpCode(val);
                      }
                    } else {
                      setTotpCode(val);
                    }
                  }}
                  placeholder={useBackupCode ? "A1B2C3D4E5" : "000000"}
                  className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-4 px-4 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                  disabled={isLoading}
                />

                {/* Backup code hint when in TOTP mode */}
                {!useBackupCode && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUseBackupCode(true);
                        setTotpCode("");
                        setError(null);
                      }}
                      className="text-xs text-text-secondary hover:text-white transition-colors underline underline-offset-2"
                    >
                      Can&apos;t access your authenticator? Use a backup code →
                    </button>
                  </div>
                )}

                {/* Instructions when in backup code mode */}
                {useBackupCode && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
                  >
                    <p className="text-[0.7rem] text-amber-300/90 leading-relaxed">
                      Enter one of the 10 backup codes you received when setting up
                      MFA. Each backup code can only be used once. Lost them?{" "}
                      <span className="text-amber-300">Disable and re-enable MFA</span>{" "}
                      from your security settings to generate new ones.
                    </p>
                  </motion.div>
                )}

                {/* Switch back to TOTP when in backup code mode */}
                {useBackupCode && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUseBackupCode(false);
                        setTotpCode("");
                        setError(null);
                      }}
                      className="text-xs text-text-secondary hover:text-white transition-colors underline underline-offset-2"
                    >
                      ← Use authenticator app instead
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-400 text-center">
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isLoading || (useBackupCode ? totpCode.length !== 10 : totpCode.length !== 6)}
                className="w-full bg-white text-black font-semibold font-sans rounded-xl h-14 flex items-center justify-center group hover:bg-white/90 transition-all duration-300 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {useBackupCode ? "Verify Backup Code" : "Verify"}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" strokeWidth={2} />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMfaRequired(false);
                    setMfaToken(null);
                    setTotpCode("");
                    setUseBackupCode(false);
                  }}
                  className="text-sm text-text-secondary hover:text-white transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ─── Normal Login UI ────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-100px)] pt-24 pb-12 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-30 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-romance) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-30 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-scifi) 0%, transparent 65%)' }} />
        <div className="absolute top-[10%] left-[15%] w-[70vw] h-[70vw] min-w-[600px] opacity-15 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-mystery) 0%, transparent 65%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md px-6 z-10"
      >
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block mb-4"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-text-secondary font-sans text-lg"
          >
            Sign in to continue your journey.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden"
        >
          {/* Subtle top shine */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full relative group overflow-hidden bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/[0.08] hover:border-white/20 rounded-xl h-14 flex items-center justify-center font-medium font-sans mb-8"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="relative z-10">Sign in with Google</span>
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="h-px bg-white/5 flex-1" />
            <span className="text-xs font-medium text-text-secondary/60 uppercase tracking-widest">Or</span>
            <div className="h-px bg-white/5 flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 relative">
              <label
                htmlFor="email"
                className={`text-sm font-medium transition-colors duration-300 ${focusedInput === 'email' ? 'text-white' : 'text-text-secondary'}`}
              >
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`w-5 h-5 transition-colors duration-300 ${focusedInput === 'email' ? 'text-white' : 'text-text-secondary/50'}`} strokeWidth={1.5} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="name@example.com"
                  className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-sans"
                />
              </div>
            </div>

            <div className="space-y-1.5 relative pt-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className={`text-sm font-medium transition-colors duration-300 ${focusedInput === 'password' ? 'text-white' : 'text-text-secondary'}`}
                >
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-text-secondary hover:text-white transition-colors duration-300">
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 transition-colors duration-300 ${focusedInput === 'password' ? 'text-white' : 'text-text-secondary/50'}`} strokeWidth={1.5} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="••••••••"
                  className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-sans"
                />
              </div>
            </div>

            {/* Session revoked banner */}
            {sessionsRevoked && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
              >
                <p className="text-sm text-emerald-300/90 font-medium text-center">
                  All sessions have been revoked. Please sign in again.
                </p>
              </motion.div>
            )}

            {/* MFA session expired banner */}
            {mfaSessionExpired && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
              >
                <p className="text-sm text-amber-300/90 font-medium text-center">
                  Your MFA session expired. Please sign in again to receive a new verification code.
                </p>
              </motion.div>
            )}

            {error && (
              <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-400 mt-2">
                {error}
              </motion.p>
            )}

            {/* CAPTCHA - client-only to avoid hydration mismatch */}
            {mounted && (
              <div className="flex justify-center mt-4">
                <div ref={turnstileRef} />
              </div>
            )}

            {emailNotVerified && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
                <p className="text-xs text-amber-300/80 font-medium mb-2">
                  Didn&apos;t receive the email?
                </p>
                {resendSuccess ? (
                  <p className="text-xs text-emerald-400">{resendSuccess}</p>
                ) : (
                  <button
                    type="button"
                    disabled={resending}
                    onClick={async () => {
                      setResending(true);
                      try {
                        const res = await fetch(`${BACKEND_URL}/api/auth/resend-verification`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          setResendSuccess(data.message || "Verification link sent!");
                        } else {
                          setError(data.message || "Failed to resend.");
                        }
                      } catch {
                        setError("Network error. Please try again.");
                      } finally {
                        setResending(false);
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors disabled:opacity-50"
                  >
                    {resending ? "Sending..." : "Resend verification email"}
                  </button>
                )}
                <Link
                  href="/forgot-password"
                  className="block mt-1.5 text-xs text-text-secondary hover:text-white transition-colors underline underline-offset-2"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-semibold font-sans rounded-xl h-14 mt-6 flex items-center justify-center group hover:bg-white/90 transition-all duration-300 relative overflow-hidden disabled:opacity-70"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/5 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-700" />
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-text-secondary text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-white hover:underline underline-offset-4 font-medium transition-all duration-300">
                Create one
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
