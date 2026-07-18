"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Shield,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Lock,
  Save,
  Mail,
  Camera,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { authEndpoints, MfaSetupResponse } from "@/lib/api/auth";
import { uploadImage } from "@/lib/api/upload";

type Tab = "general" | "security";

export default function ProfilePage() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("general");

  // ── Profile state ──────────────────────────────────────────────────
  const [profileName, setProfileName] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ── MFA state ──────────────────────────────────────────────────────
  type MfaPageState =
    | "loading"
    | "idle"
    | "setup"
    | "enabled"
    | "disabling"
    | "error";

  const [mfaState, setMfaState] = useState<MfaPageState>("loading");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [setupTotp, setSetupTotp] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [disableTotp, setDisableTotp] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [backupCodesVisible, setBackupCodesVisible] = useState(false);
  const [backupCodesLoading, setBackupCodesLoading] = useState(false);
  const [remainingBackupCodes, setRemainingBackupCodes] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [allCopied, setAllCopied] = useState(false);

  // ── Step-up auth state ──────────────────────────────────────────
  const [stepUpPassword, setStepUpPassword] = useState("");
  const [stepUpLoading, setStepUpLoading] = useState(false);
  const [stepUpAction, setStepUpAction] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/profile");
    }
  }, [sessionStatus, router]);

  // Initialize profile name and image from session
  useEffect(() => {
    if (session?.user?.name) {
      setProfileName(session.user.name);
    }
    if (session?.user?.image) {
      setProfileImage(session.user.image);
    } else {
      setProfileImage(null);
    }
  }, [session?.user?.name, session?.user?.image]);

  // ── Upload profile image ───────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.accessToken) return;

    setImageUploading(true);
    setProfileError(null);

    try {
      const result = await uploadImage(file, session.accessToken);
      if (result.success && result.data) {
        setProfileImage(result.data.url);
      } else {
        setProfileError(result.message || "Failed to upload image.");
      }
    } catch {
      setProfileError("Failed to upload image.");
    } finally {
      setImageUploading(false);
    }
  };

  // ── Save profile ───────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!session?.accessToken) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const payload: { name?: string; image?: string } = { name: profileName };
      if (profileImage !== (session.user?.image ?? null)) {
        payload.image = profileImage ?? undefined;
      }

      const res = await authEndpoints.updateProfile(
        payload,
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      );
      if (res.data.success) {
        setProfileSuccess("Profile updated successfully.");
        // Update the NextAuth session
        await updateSession();
        setTimeout(() => setProfileSuccess(null), 4000);
      } else {
        setProfileError(res.data.message || "Failed to update profile.");
      }
    } catch {
      setProfileError("Network error. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  // ── MFA: Fetch status ──────────────────────────────────────────────
  const fetchMfaStatus = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const res = await authEndpoints.mfaStatus({
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.data.success && res.data.data) {
        setMfaState(res.data.data.isMfaEnabled ? "enabled" : "idle");
      } else {
        setMfaState("error");
        setMfaError(res.data.message || "Failed to load MFA status.");
      }
    } catch {
      setMfaState("error");
      setMfaError("Failed to load MFA status.");
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    if (!session?.accessToken) {
      if (session?.mfaRequired) {
        router.push("/login?mfa_pending=true&callbackUrl=/profile");
      } else {
        setMfaState("error");
        setMfaError("Your session is incomplete. Please try signing in again.");
      }
      return;
    }
    fetchMfaStatus();
  }, [sessionStatus, session?.accessToken, session?.mfaRequired, router, fetchMfaStatus]);

  // ── MFA: Setup ─────────────────────────────────────────────────────
  const handleMfaSetup = async () => {
    if (!session?.accessToken) return;
    setSetupLoading(true);
    setMfaError(null);
    try {
      const res = await authEndpoints.setupMfa({
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.data.success && res.data.data) {
        setSetupData(res.data.data);
        setMfaState("setup");
      } else {
        setMfaError(res.data.message || "Failed to generate MFA setup.");
        setMfaState("idle");
      }
    } catch {
      setMfaError("Network error. Please try again.");
      setMfaState("idle");
    } finally {
      setSetupLoading(false);
    }
  };

  // ── MFA: Enable ────────────────────────────────────────────────────
  const handleMfaEnable = async () => {
    if (!session?.accessToken || !setupData) return;
    setSetupLoading(true);
    setMfaError(null);
    try {
      const res = await authEndpoints.enableMfa(
        { secret: setupData.secret, totpCode: setupTotp },
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      );
      if (res.data.success) {
        setMfaSuccess("MFA has been enabled successfully! Save your backup codes below.");
        const codes = (res.data.data as { backupCodes?: string[] } | undefined)?.backupCodes;
        if (codes && codes.length > 0) {
          setBackupCodes(codes);
          setBackupCodesVisible(true);
        }
        setRemainingBackupCodes(10);
        setMfaState("enabled");
        setSetupTotp("");
      } else {
        setMfaError(res.data.message || "Invalid verification code.");
      }
    } catch {
      setMfaError("Failed to enable MFA. Please try again.");
    } finally {
      setSetupLoading(false);
    }
  };

  // ── MFA: Disable ───────────────────────────────────────────────────
  const handleMfaDisable = async () => {
    if (!session?.accessToken) return;
    setDisableLoading(true);
    setMfaError(null);
    try {
      const res = await authEndpoints.disableMfa(
        { totpCode: disableTotp },
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      );
      if (res.data.success) {
        setMfaSuccess("MFA has been disabled.");
        setMfaState("idle");
        setDisableTotp("");
        setSetupData(null);
      } else {
        setMfaError(res.data.message || "Invalid verification code.");
      }
    } catch {
      setMfaError("Failed to disable MFA. Please try again.");
    } finally {
      setDisableLoading(false);
    }
  };

  // Clear success message after 4 seconds
  useEffect(() => {
    if (!mfaSuccess) return;
    const t = setTimeout(() => setMfaSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [mfaSuccess]);

  // ── Loading skeleton ───────────────────────────────────────────────
  if (sessionStatus === "loading") {
    return (
      <main className="min-h-screen bg-background pt-32 pb-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 animate-pulse mb-5" />
            <div className="h-9 w-48 bg-white/10 rounded-lg animate-pulse mb-2" />
            <div className="h-6 w-64 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-8 md:p-10">
            <div className="h-14 w-full bg-white/10 rounded-xl animate-pulse mb-4" />
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
        <div
          className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-20 mix-blend-screen"
          style={{ backgroundImage: "radial-gradient(circle at center, var(--color-romance) 0%, transparent 65%)" }}
        />
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-20 mix-blend-screen"
          style={{ backgroundImage: "radial-gradient(circle at center, var(--color-scifi) 0%, transparent 65%)" }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/10 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            Profile
          </h1>
          <p className="text-text-secondary font-sans text-lg">
            Manage your account and security settings
          </p>
        </motion.div>

        {/* Tab navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-1 mb-6 bg-black/20 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-1.5"
        >
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === "general"
                ? "bg-white text-black shadow-lg"
                : "text-text-secondary hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === "security"
                ? "bg-white text-black shadow-lg"
                : "text-text-secondary hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" />
            Security
          </button>
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "general" && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

                {/* Profile info */}
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-1">
                        Account Information
                      </h2>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        View and update your profile details.
                      </p>
                    </div>
                  </div>

                  {/* Profile picture */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                        {profileImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profileImage}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-10 h-10 text-white/40" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200">
                        <Camera className="w-6 h-6 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={imageUploading}
                        />
                      </label>
                      {imageUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">
                      Click to upload a profile picture
                    </p>
                  </div>

                  {/* Success message */}
                  <AnimatePresence>
                    {profileSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-sm text-emerald-300"
                      >
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        {profileSuccess}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error message */}
                  {profileError && (
                    <p className="text-sm text-red-400">{profileError}</p>
                  )}

                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                      Email
                    </label>
                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5">
                      <Mail className="w-5 h-5 text-white/40" />
                      <span className="text-white/60 text-sm">
                        {session?.user?.email || "-"}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary/50 mt-1.5">
                      Email cannot be changed.
                    </p>
                  </div>

                  {/* Name (editable) */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                      Name
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3.5 px-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
                    />
                  </div>

                  {/* Save button */}
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaving || !profileName.trim() || (profileName === session?.user?.name && profileImage === (session?.user?.image ?? null))}
                    className="w-full bg-white text-black font-semibold font-sans rounded-xl h-12 flex items-center justify-center gap-2 group hover:bg-white/90 transition-all duration-300 disabled:opacity-50"
                  >
                    {profileSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>

                  {/* ── Change Password ──────────────────────────── */}
                  <div className="pt-4 border-t border-white/[0.06]">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                        <Lock className="w-6 h-6 text-white/60" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-1">
                          Change Password
                        </h2>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          Update your password. You&apos;ll be signed out of all devices after changing it.
                        </p>
                      </div>
                    </div>

                    <ChangePasswordSection accessToken={session?.accessToken ?? ""} />
                  </div>

                  {/* Role */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-white/40 shrink-0" />
                    <div>
                      <p className="text-xs text-text-secondary">Role</p>
                      <p className="text-sm text-white font-medium capitalize">
                        {session?.user?.role?.toLowerCase() || "-"}
                      </p>
                    </div>
                  </div>

                  {/* ── Export / Import Data ─────────────────────── */}
                  <div className="pt-4 border-t border-white/[0.06]">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                        <Download className="w-6 h-6 text-white/60" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-1">
                          Your Data
                        </h2>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          Export your account data or import a previously exported file.
                        </p>
                      </div>
                    </div>

                    <ExportImportSection accessToken={session?.accessToken ?? ""} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

                {/* Google OAuth users - MFA is managed by Google */}
                {session?.user?.provider === "GOOGLE" && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Shield className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-1">
                        Two-Factor Authentication
                      </h2>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        You signed in with Google. Your account&apos;s two-factor
                        authentication is managed by Google. Enable or change it
                        in your Google Account security settings.
                      </p>
                    </div>
                  </div>
                )}

                {/* MFA loading skeleton */}
                {(session?.user?.provider !== "GOOGLE" && mfaState === "loading") && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-14 w-full bg-white/10 rounded-xl animate-pulse" />
                  </div>
                )}

                {/* ───── MFA NOT ENABLED (email/password users only) ───── */}
                {(session?.user?.provider !== "GOOGLE" && mfaState === "idle") && (
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
                      onClick={handleMfaSetup}
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

                {/* ───── SETUP - QR CODE + VERIFY (email/password users only) ───── */}
                {(session?.user?.provider !== "GOOGLE" && mfaState === "setup" && setupData) && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-lg font-semibold text-foreground mb-1">
                        Scan This QR Code
                      </h2>
                      <p className="text-sm text-text-secondary">
                        Open your authenticator app and scan the code below.
                      </p>
                    </div>

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
                            } catch { /* clipboard not available */ }
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

                    <div className="border-t border-white/[0.06] pt-6">
                      <h3 className="text-sm font-medium text-foreground mb-3">Verify the Code</h3>
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
                          onClick={handleMfaEnable}
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

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setMfaState("idle");
                          setSetupData(null);
                          setSetupTotp("");
                          setMfaError(null);
                        }}
                        className="text-sm text-text-secondary hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ───── MFA ENABLED (email/password users only) ───── */}
                {(session?.user?.provider !== "GOOGLE" && mfaState === "enabled") && (
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
                        You&apos;ll need a verification code from your authenticator app when signing in.
                      </p>
                    </div>

                    {/* Backup Codes */}
                    {backupCodes && backupCodes.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <h3 className="text-sm font-semibold text-amber-300 mb-1">
                              Backup Codes - Save These Immediately
                            </h3>
                            <p className="text-xs text-amber-400/70 leading-relaxed">
                              Each backup code can be used only once. If you lose your authenticator
                              app, use one of these codes to sign in.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3 justify-center mb-4">
                          {backupCodes.slice(0, 5).map((code, i) => (
                            <code
                              key={i}
                              className={`font-mono text-xs tracking-wider px-2.5 py-1.5 rounded-lg transition-all ${
                                backupCodesVisible
                                  ? "text-amber-200 bg-amber-500/10"
                                  : "text-transparent bg-amber-500/5 select-none"
                              }`}
                            >
                              {backupCodesVisible ? code : "••••••••••"}
                            </code>
                          ))}
                        </div>
                        <div className="flex gap-3 justify-center mb-4">
                          {backupCodes.slice(5, 10).map((code, i) => (
                            <code
                              key={i + 5}
                              className={`font-mono text-xs tracking-wider px-2.5 py-1.5 rounded-lg transition-all ${
                                backupCodesVisible
                                  ? "text-amber-200 bg-amber-500/10"
                                  : "text-transparent bg-amber-500/5 select-none"
                              }`}
                            >
                              {backupCodesVisible ? code : "••••••••••"}
                            </code>
                          ))}
                        </div>

                        <div className="flex gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => setBackupCodesVisible(!backupCodesVisible)}
                            className="flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors px-3 py-1.5 rounded-lg bg-amber-500/5 hover:bg-amber-500/10"
                          >
                            {backupCodesVisible ? (
                              <><EyeOff className="w-3.5 h-3.5" /> Hide</>
                            ) : (
                              <><Eye className="w-3.5 h-3.5" /> Reveal</>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(backupCodes.join("\n"));
                                setAllCopied(true);
                                setTimeout(() => setAllCopied(false), 2000);
                              } catch { /* clipboard not available */ }
                            }}
                            className="flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors px-3 py-1.5 rounded-lg bg-amber-500/5 hover:bg-amber-500/10"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {allCopied ? "Copied!" : "Copy All"}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Remaining backup codes */}
                    {remainingBackupCodes !== null && (
                      <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                        <div>
                          <span className="text-sm text-text-secondary">
                            Remaining backup codes:{" "}
                            <span className="font-semibold text-foreground">{remainingBackupCodes}</span>
                          </span>
                          {remainingBackupCodes <= 3 && remainingBackupCodes > 0 && (
                            <p className="text-xs text-amber-400/70 mt-1">
                              Low! Consider regenerating new codes.
                            </p>
                          )}
                        </div>
                        {/* Step-up password prompt */}
                        {stepUpAction === "regenerate-backup-codes" ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-xs text-amber-300/80">Confirm password to regenerate backup codes</span>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                value={stepUpPassword}
                                onChange={(e) => setStepUpPassword(e.target.value)}
                                placeholder="Enter password"
                                className="flex-1 bg-black/50 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                                disabled={stepUpLoading}
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!session?.accessToken || !stepUpPassword) return;
                                  setStepUpLoading(true);
                                  setMfaError(null);
                                  try {
                                    const res = await authEndpoints.regenerateBackupCodes(
                                      { password: stepUpPassword },
                                      { headers: { Authorization: `Bearer ${session.accessToken}` } },
                                    );
                                    if (res.data.success && res.data.data) {
                                      setBackupCodes(res.data.data.codes);
                                      setBackupCodesVisible(true);
                                      setRemainingBackupCodes(10);
                                      setMfaSuccess("New backup codes generated. Save them in a safe place!");
                                      setStepUpAction(null);
                                      setStepUpPassword("");
                                    } else {
                                      setMfaError(res.data.message || "Invalid password.");
                                    }
                                  } catch {
                                    setMfaError("Failed to regenerate backup codes.");
                                  } finally {
                                    setStepUpLoading(false);
                                  }
                                }}
                                disabled={stepUpLoading || !stepUpPassword.trim()}
                                className="flex items-center gap-1 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50"
                              >
                                {stepUpLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  "Confirm"
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setStepUpAction(null);
                                  setStepUpPassword("");
                                }}
                                className="text-xs text-white/40 hover:text-white/70 transition-colors px-2"
                              >
                                Cancel
                              </button>
                            </div>
                            {mfaError && (
                              <p className="text-xs text-red-400">{mfaError}</p>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStepUpAction("regenerate-backup-codes")}
                            className="flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Regenerate
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setMfaState("disabling");
                        setMfaError(null);
                      }}
                      className="w-full bg-white/5 hover:bg-red-500/10 text-text-secondary hover:text-red-400 font-sans font-medium rounded-xl h-12 flex items-center justify-center border border-white/[0.06] hover:border-red-500/30 transition-all duration-300"
                    >
                      Disable MFA
                    </button>
                  </div>
                )}

                {/* ───── DISABLING - TOTP CONFIRMATION (email/password users only) ───── */}
                {(session?.user?.provider !== "GOOGLE" && mfaState === "disabling") && (
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
                        onClick={handleMfaDisable}
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
                          setMfaState("enabled");
                          setDisableTotp("");
                          setMfaError(null);
                        }}
                        className="text-sm text-text-secondary hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ───── ERROR STATE (email/password users only) ───── */}
                {(session?.user?.provider !== "GOOGLE" && mfaState === "error") && (
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
                      {mfaError || "Failed to load security settings."}
                    </p>
                    <button
                      onClick={() => {
                        setMfaState("loading");
                        setMfaError(null);
                        fetchMfaStatus();
                      }}
                      className="bg-white/10 hover:bg-white/15 text-white font-medium font-sans rounded-xl h-12 px-6 flex items-center justify-center gap-2 transition-all duration-300 text-sm"
                    >
                      <Loader2 className="w-4 h-4" />
                      Retry
                    </button>
                  </motion.div>
                )}

                {/* Inline error */}
                {mfaError && mfaState !== "error" && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400 text-center mt-4"
                  >
                    {mfaError}
                  </motion.p>
                )}

                {/* Success toast */}
                <AnimatePresence>
                  {mfaSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-sm text-emerald-300"
                    >
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      {mfaSuccess}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Change Password Section Component
// ═══════════════════════════════════════════════════════════════════

function ChangePasswordSection({ accessToken }: { accessToken: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleChangePassword = async () => {
    if (!accessToken) return;

    // Client-side validation
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await authEndpoints.changePassword(
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (res.data.success) {
        setSuccess("Password changed! Please sign in again with your new password.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowForm(false);
      } else {
        setError(res.data.message || "Failed to change password.");
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Clear success message after 6 seconds
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 6000);
    return () => clearTimeout(t);
  }, [success]);

  // Password strength indicator
  const getStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (!pwd) return { label: "", color: "", width: "0%" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>_\-~`]/.test(pwd)) score++;
    const levels = [
      { label: "Weak", color: "bg-red-500", width: "20%" },
      { label: "Fair", color: "bg-orange-500", width: "40%" },
      { label: "Good", color: "bg-yellow-500", width: "60%" },
      { label: "Strong", color: "bg-lime-500", width: "80%" },
      { label: "Very Strong", color: "bg-emerald-500", width: "100%" },
    ];
    return levels[Math.min(score, 5) - 1] ?? levels[0];
  };

  const strength = getStrength(newPassword);

  if (!showForm) {
    return (
      <div>
        <button
          onClick={() => {
            setShowForm(true);
            setError(null);
            setSuccess(null);
          }}
          className="bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-xl h-12 px-6 flex items-center justify-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-all duration-300"
        >
          <Lock className="w-4 h-4" />
          Change Password
        </button>
        <AnimatePresence>
          {success && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 text-xs flex items-center gap-1.5 text-emerald-400"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {success}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
          Current Password
        </label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
          className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3 px-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
          New Password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
          className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3 px-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
          disabled={isLoading}
        />
        {newPassword && (
          <div className="mt-2">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: strength.width }}
                className={`h-full rounded-full transition-colors ${strength.color}`}
              />
            </div>
            <p className="text-[0.65rem] text-text-secondary mt-1">
              {strength.label}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
          Confirm New Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3 px-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all"
          disabled={isLoading}
        />
      </div>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs flex items-center gap-1.5 text-red-400"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </motion.p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleChangePassword}
          disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
          className="flex-1 bg-white text-black font-semibold font-sans rounded-xl h-12 flex items-center justify-center gap-2 hover:bg-white/90 transition-all duration-300 disabled:opacity-50 text-sm"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              Update Password
            </>
          )}
        </button>
        <button
          onClick={() => {
            setShowForm(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setError(null);
          }}
          disabled={isLoading}
          className="bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-xl h-12 px-5 flex items-center justify-center text-sm font-medium text-white/60 hover:text-white transition-all duration-300"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Export / Import Section Component
// ═══════════════════════════════════════════════════════════════════

function ExportImportSection({ accessToken }: { accessToken: string }) {
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStatusAfter = (ms: number) => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setImportStatus({ type: null, message: "" }), ms);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, []);

  const handleExportJson = async () => {
    setExportingJson(true);
    setImportStatus({ type: null, message: "" });
    try {
      const res = await fetch("/api/auth/export?format=json");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookstore-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setImportStatus({ type: "success", message: "JSON export downloaded successfully." });
      clearStatusAfter(4000);
    } catch {
      setImportStatus({ type: "error", message: "Failed to export data." });
      clearStatusAfter(4000);
    } finally {
      setExportingJson(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    setImportStatus({ type: null, message: "" });
    try {
      const res = await fetch("/api/auth/export?format=csv");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookstore-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setImportStatus({ type: "success", message: "CSV export downloaded successfully." });
      clearStatusAfter(4000);
    } catch {
      setImportStatus({ type: "error", message: "Failed to export data." });
      clearStatusAfter(4000);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ type: null, message: "" });

    try {
      const text = await file.text();

      if (!file.name.endsWith(".json")) {
        setImportStatus({ type: "error", message: "Only JSON files are supported for import." });
        clearStatusAfter(4000);
        return;
      }

      const data = JSON.parse(text) as Record<string, unknown>;

      const res = await fetch("/api/auth/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      const json = (await res.json()) as { success?: boolean; message?: string };
      if (json.success) {
        setImportStatus({ type: "success", message: json.message || "Data imported successfully." });
      } else {
        setImportStatus({ type: "error", message: json.message || "Failed to import data." });
      }
      clearStatusAfter(4000);
    } catch {
      setImportStatus({ type: "error", message: "Invalid file or network error." });
      clearStatusAfter(4000);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleExportJson}
          disabled={exportingJson}
          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-xl h-12 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 text-sm font-medium"
        >
          {exportingJson ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileJson className="w-4 h-4" />
          )}
          Export JSON
        </button>
        <button
          onClick={handleExportCsv}
          disabled={exportingCsv}
          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-xl h-12 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 text-sm font-medium"
        >
          {exportingCsv ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4" />
          )}
          Export CSV
        </button>
      </div>

      {/* Import */}
      <div className="relative">
        <label className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/[0.12] hover:border-white/20 rounded-xl h-12 cursor-pointer transition-all duration-300 text-sm font-medium text-text-secondary hover:text-white">
          <Upload className="w-4 h-4" />
          Import JSON
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </label>
      </div>

      {/* Status message */}
      <AnimatePresence>
        {importStatus.type && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`text-xs flex items-center gap-1.5 ${
              importStatus.type === "success" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {importStatus.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {importStatus.message}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="text-[0.65rem] text-text-secondary/50 leading-relaxed">
        Your data includes your profile, order history (with addresses), reviews, and activity log.
        Exported data is downloaded as a file to your computer.
        Importing a previously exported JSON file will restore your profile name,
        saved addresses, and order records for books that are still in the catalog.
      </p>
    </div>
  );
}
