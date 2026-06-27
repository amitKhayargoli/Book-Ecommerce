import { UserRole } from "@prisma/client";

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

export type LoginResult = AuthTokensResponse | MfaChallengeResponse;
