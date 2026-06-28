import { AxiosRequestConfig } from "axios";
import { api } from "../api-client";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  captchaToken?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  user: AuthUser;
}

export interface MfaChallengeResponse {
  mfaRequired: true;
  mfaToken: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCode: string;
  provisioningUri: string;
}

export interface BackupCodesResponse {
  codes: string[];
  message: string;
}

export interface BackupCodesStatusResponse {
  remaining: number;
}

export interface RegisterResponse {
  message: string;
  verificationUrl?: string;
}

export interface AuthResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field?: string; message?: string }>;
}

export const authEndpoints = {
  register: (payload: RegisterPayload, config?: AxiosRequestConfig) =>
    api.post<AuthResponse<RegisterResponse>>("/api/auth/register", payload, config),

  login: (payload: LoginPayload, config?: AxiosRequestConfig) =>
    api.post<AuthResponse<AuthTokensResponse | MfaChallengeResponse>>("/api/auth/login", payload, config),

  me: (config?: AxiosRequestConfig) =>
    api.get<AuthResponse<AuthUser>>("/api/auth/me", config),

  // MFA endpoints
  verifyMfaLogin: (payload: { mfaToken: string; totpCode: string }, config?: AxiosRequestConfig) =>
    api.post<AuthResponse<AuthTokensResponse>>("/api/auth/mfa/verify-login", payload, config),

  mfaStatus: (config?: AxiosRequestConfig) =>
    api.get<AuthResponse<{ isMfaEnabled: boolean }>>("/api/auth/mfa/status", config),

  setupMfa: (config?: AxiosRequestConfig) =>
    api.post<AuthResponse<MfaSetupResponse>>("/api/auth/mfa/setup", {}, config),

  enableMfa: (payload: { secret: string; totpCode: string }, config?: AxiosRequestConfig) =>
    api.post<AuthResponse<{ message: string }>>("/api/auth/mfa/enable", payload, config),

  disableMfa: (payload: { totpCode: string }, config?: AxiosRequestConfig) =>
    api.post<AuthResponse<{ message: string }>>("/api/auth/mfa/disable", payload, config),

  // Backup code endpoints
  regenerateBackupCodes: (config?: AxiosRequestConfig) =>
    api.post<AuthResponse<BackupCodesResponse>>("/api/auth/mfa/backup-codes/regenerate", {}, config),

  backupCodesStatus: (config?: AxiosRequestConfig) =>
    api.get<AuthResponse<BackupCodesStatusResponse>>("/api/auth/mfa/backup-codes/status", config),

  // Email verification
  verifyEmail: (token: string, config?: AxiosRequestConfig) =>
    api.get<AuthResponse<{ message: string }>>(`/api/auth/verify-email?token=${token}`, config),

  resendVerification: (payload: { email: string }, config?: AxiosRequestConfig) =>
    api.post<AuthResponse<{ message: string; verificationUrl?: string }>>("/api/auth/resend-verification", payload, config),
};
