import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    mfaRequired?: boolean;
    mfaToken?: string;
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      provider: string;
    };
  }

  interface User {
    role?: string;
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    accessToken?: string;
    mfaRequired?: boolean;
    mfaToken?: string;
    provider?: string;
  }
}
