"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Lock } from "lucide-react";

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: Rule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "Uppercase letter (A-Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "Lowercase letter (a-z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "Number (0-9)", test: (pw) => /\d/.test(pw) },
  { label: "Special character (!@#$%...)", test: (pw) => /[!@#$%^&*(),.?":{}|<>_\-~`]/.test(pw) },
];

function getStrength(pw: string): { score: number; label: string; color: string; width: string } {
  if (!pw) return { score: 0, label: "", color: "", width: "0%" };

  const passed = RULES.filter((r) => r.test(pw)).length;
  const score = Math.round((passed / RULES.length) * 100);

  if (score === 0) return { score, label: "Very weak", color: "bg-red-500", width: "10%" };
  if (score <= 40) return { score, label: "Weak", color: "bg-red-500", width: "25%" };
  if (score <= 60) return { score, label: "Fair", color: "bg-amber-500", width: "50%" };
  if (score <= 80) return { score, label: "Strong", color: "bg-lime-500", width: "75%" };
  return { score, label: "Very strong", color: "bg-emerald-500", width: "100%" };
}

interface Props {
  password: string;
  showRules?: boolean; // Default true; hide rules (keep bar) for compact use
}

export default function PasswordStrengthMeter({ password, showRules = true }: Props) {
  const strength = getStrength(password);
  const isEmpty = !password;

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      {!isEmpty && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${strength.color}`}
                initial={{ width: "0%" }}
                animate={{ width: strength.width }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                key={strength.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs font-medium text-text-secondary/70 min-w-[5rem] text-right"
              >
                {strength.label}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Rules checklist */}
      {showRules && (
        <div className="space-y-1">
          {RULES.map((rule, i) => {
            const passed = rule.test(password);
            return (
              <motion.div
                key={rule.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2"
              >
                {passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2} />
                ) : isEmpty ? (
                  <Lock className="w-3.5 h-3.5 text-text-secondary/30 shrink-0" strokeWidth={1.5} />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400/70 shrink-0" strokeWidth={2} />
                )}
                <span
                  className={`text-xs transition-colors duration-300 ${
                    passed
                      ? "text-emerald-300/90"
                      : isEmpty
                        ? "text-text-secondary/40"
                        : "text-text-secondary/70"
                  }`}
                >
                  {rule.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
