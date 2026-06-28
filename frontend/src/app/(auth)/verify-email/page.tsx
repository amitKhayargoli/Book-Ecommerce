"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

type VerifyState = "loading" | "success" | "error" | "expired" | "no_token";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("no_token");
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
        );
        const result = await response.json();

        if (result.success) {
          setState("success");
          setMessage(result.message || "Email verified successfully!");
        } else {
          const msg = result.message || "";
          if (msg.toLowerCase().includes("expired")) {
            setState("expired");
            setMessage(msg);
          } else {
            setState("error");
            setMessage(msg || "Failed to verify email. The link may be invalid.");
          }
        }
      } catch {
        setState("error");
        setMessage("Network error. Please try again.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-100px)] pt-24 pb-12 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[20%] -${state === "success" ? "left" : "right"}-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-30 mix-blend-screen`}
          style={{
            backgroundImage: state === "success"
              ? "radial-gradient(circle at center, var(--color-fantasy) 0%, transparent 65%)"
              : "radial-gradient(circle at center, var(--color-mystery) 0%, transparent 65%)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md px-6 z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden text-center"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

          {state === "loading" && (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/5 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Verifying your email
              </h2>
              <p className="text-text-secondary text-sm">Please wait...</p>
            </div>
          )}

          {state === "success" && (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Email verified!
              </h2>
              <p className="text-text-secondary text-sm mb-8 leading-relaxed">
                {message}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-black font-semibold font-sans rounded-xl h-12 px-6 hover:bg-white/90 transition-all duration-300 text-sm"
              >
                Sign in
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Link>
            </div>
          )}

          {state === "error" && (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Verification failed
              </h2>
              <p className="text-text-secondary text-sm mb-8 leading-relaxed">
                {message}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-black font-semibold font-sans rounded-xl h-12 px-6 hover:bg-white/90 transition-all duration-300 text-sm"
              >
                Back to sign in
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Link>
            </div>
          )}

          {state === "expired" && (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Link expired
              </h2>
              <p className="text-text-secondary text-sm mb-8 leading-relaxed">
                {message}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-black font-semibold font-sans rounded-xl h-12 px-6 hover:bg-white/90 transition-all duration-300 text-sm"
              >
                Request new link
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Link>
            </div>
          )}

          {state === "no_token" && (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Invalid link
              </h2>
              <p className="text-text-secondary text-sm mb-8 leading-relaxed">
                This verification link is missing or invalid. Please sign in to request a new one.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-black font-semibold font-sans rounded-xl h-12 px-6 hover:bg-white/90 transition-all duration-300 text-sm"
              >
                Sign in
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </Link>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
