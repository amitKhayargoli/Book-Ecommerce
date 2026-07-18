import { UserRole } from "@prisma/client";

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  tokenVersion: number;
  userAgentHash?: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  user: AuthUserPayload;
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

export interface MfaStatusResponse {
  isMfaEnabled: boolean;
}

export interface BackupCodesResponse {
  codes: string[];
  message: string;
}

export interface BackupCodesStatus {
  remaining: number;
}

export interface ForgotPasswordResponse {
  message: string;
  resetUrl?: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface RegisterResponse {
  message: string;
  verificationUrl?: string;
}

export type LoginResult = AuthTokensResponse | MfaChallengeResponse;
