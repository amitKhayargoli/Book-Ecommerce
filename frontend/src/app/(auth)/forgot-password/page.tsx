"use client";

import { motion } from "framer-motion";
import { Mail, ArrowRight, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; resetUrl?: string } | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setSuccess({
          message: result.data.message,
          resetUrl: result.data.resetUrl,
        });
      } else {
        setError(result.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] pt-24 pb-12 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-30 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-mystery) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-25 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-romance) 0%, transparent 65%)' }} />
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
              Reset password
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-text-secondary font-sans text-lg"
          >
            Enter your email and we&apos;ll send you a reset link.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

          {success ? (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-text-secondary font-sans text-sm leading-relaxed">
                {success.message}
              </p>

              {/* Dev-only: show the reset link directly */}
              {success.resetUrl && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-left">
                  <p className="text-xs text-text-secondary/60 uppercase tracking-wider font-medium mb-2">
                    Development mode - reset link
                  </p>
                  <a
                    href={success.resetUrl}
                    className="text-xs text-blue-400 hover:text-blue-300 break-all underline underline-offset-2 transition-colors"
                  >
                    {success.resetUrl}
                  </a>
                </div>
              )}

              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
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
                      Send Reset Link
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
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
