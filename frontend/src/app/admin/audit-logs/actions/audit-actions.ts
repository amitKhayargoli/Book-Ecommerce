"use server";

import { auth } from "@/auth";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://localhost:4000";

export interface AuditLogEntry {
  id: string;
  event: string;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogsResult {
  success: boolean;
  data?: AuditLogEntry[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  error?: string;
}

export type AuditEventType =
  | "register"
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "login_account_locked"
  | "google_oauth_success"
  | "mfa_challenge_issued"
  | "mfa_verify_success"
  | "mfa_verify_failed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "mfa_backup_codes_regenerated"
  | "forgot_password_requested"
  | "password_reset_success"
  | "password_reset_failed"
  | "password_reset_expired"
  | "email_verification_sent"
  | "email_verified"
  | "email_verification_resend"
  | "email_verification_failed"
  | "";

export async function fetchAuditLogs(params: {
  page?: number;
  limit?: number;
  event?: AuditEventType;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AuditLogsResult> {
  try {
    const session = await auth();

    if (!session?.accessToken) {
      return { success: false, error: "Authentication required" };
    }

    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.event) searchParams.set("event", params.event);
    if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params.dateTo) searchParams.set("dateTo", params.dateTo);

    const response = await fetch(
      `${BACKEND_URL}/api/auth/audit-logs?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.message || "Failed to fetch audit logs",
      };
    }

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to fetch audit logs",
    };
  }
}
