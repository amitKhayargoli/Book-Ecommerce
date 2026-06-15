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
