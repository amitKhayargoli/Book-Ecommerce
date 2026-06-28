"use client";

import { motion } from "framer-motion";
import { Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || "Failed to reset password. The link may have expired.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Invalid / missing token ──────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-[calc(100vh-100px)] pt-24 pb-12 flex flex-col justify-center items-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-30 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-mystery) 0%, transparent 65%)' }} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md px-6 z-10 text-center"
        >
          <div className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Invalid reset link
            </h2>
            <p className="text-text-secondary text-sm mb-6">
              This reset link is missing or invalid. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold font-sans rounded-xl h-12 px-6 hover:bg-white/90 transition-all duration-300 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Request new link
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Success state ────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-[calc(100vh-100px)] pt-24 pb-12 flex flex-col justify-center items-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-30 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-romance) 0%, transparent 65%)' }} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md px-6 z-10 text-center"
        >
          <div className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Password reset successful
            </h2>
            <p className="text-text-secondary text-sm mb-6">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold font-sans rounded-xl h-12 px-6 hover:bg-white/90 transition-all duration-300 text-sm"
            >
              Sign in
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Reset form ───────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-100px)] pt-24 pb-12 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-30 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-scifi) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-25 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-fantasy) 0%, transparent 65%)' }} />
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
              Set new password
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-text-secondary font-sans text-lg"
          >
            Must be at least 8 characters with uppercase, lowercase, number, and special character.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 relative">
              <label
                htmlFor="password"
                className={`text-sm font-medium transition-colors duration-300 ${focusedInput === 'password' ? 'text-white' : 'text-text-secondary'}`}
              >
                New Password
              </label>
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

              <div className="mt-2">
                <PasswordStrengthMeter password={password} />
              </div>
            </div>

            <div className="space-y-1.5 relative pt-1">
              <label
                htmlFor="confirmPassword"
                className={`text-sm font-medium transition-colors duration-300 ${focusedInput === 'confirm' ? 'text-white' : 'text-text-secondary'}`}
              >
                Confirm Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 transition-colors duration-300 ${focusedInput === 'confirm' ? 'text-white' : 'text-text-secondary/50'}`} strokeWidth={1.5} />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  disabled={isLoading}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedInput('confirm')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="••••••••"
                  className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-sans"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-400"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-semibold font-sans rounded-xl h-14 mt-2 flex items-center justify-center group hover:bg-white/90 transition-all duration-300 relative overflow-hidden disabled:opacity-70"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/5 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-700" />
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
