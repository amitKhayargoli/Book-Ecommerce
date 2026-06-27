import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { BACKEND_URL } from "@/lib/server-config";

const backendBaseUrl = BACKEND_URL;

const providers = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      captchaToken: { label: "CAPTCHA", type: "text" },
      accessToken: { label: "Access Token", type: "text" },
    },
    authorize: async (credentials) => {
      // ─── MFA flow: pre-verified access token passed directly ──
      const preVerifiedToken = credentials?.accessToken;
      if (preVerifiedToken && typeof preVerifiedToken === "string") {
        // Validate the token by fetching user profile
        const profileResponse = await fetch(`${backendBaseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${preVerifiedToken}` },
        });

        if (!profileResponse.ok) {
          console.error(
            `[NextAuth] MFA authorize: Profile fetch returned ${profileResponse.status} for pre-verified token`,
          );
          return null;
        }

        const profilePayload = (await profileResponse.json()) as {
          success: boolean;
          data?: { id: string; name: string; email: string; role: string };
        };

        if (!profilePayload.success || !profilePayload.data) {
          console.error(
            "[NextAuth] MFA authorize: Backend rejected pre-verified token",
            profilePayload,
          );
          return null;
        }

        return {
          id: profilePayload.data.id,
          name: profilePayload.data.name,
          email: profilePayload.data.email,
          role: profilePayload.data.role,
          accessToken: preVerifiedToken,
        };
      }

      // ─── Normal flow: email + password login ─────────────────
      const email = credentials?.email;
      const password = credentials?.password;
      const captchaToken = credentials?.captchaToken;

      if (!email || !password) {
        console.warn(
          "[NextAuth] Authorize: Missing email or password in credentials",
        );
        return null;
      }

      const response = await fetch(`${backendBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaToken }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "(unreadable)");
        console.error(
          `[NextAuth] Authorize: Login returned ${response.status} for ${email}`,
          errorBody,
        );
        return null;
      }

      const payload = (await response.json()) as {
        success: boolean;
        data?: {
          accessToken: string;
          user: {
            id: string;
            name: string;
            email: string;
            role: string;
          };
        };
      };

      if (!payload.success || !payload.data) {
        console.error(
          `[NextAuth] Authorize: Backend rejected login for ${email}`,
          payload,
        );
        return null;
      }

      return {
        id: payload.data.user.id,
        name: payload.data.user.name,
        email: payload.data.user.email,
        role: payload.data.user.role,
        accessToken: payload.data.accessToken,
      };
    },
  }),
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    jwt: async ({ token, user, account }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
        token.accessToken = (user as { accessToken?: string }).accessToken;
      }

      if (account?.provider === "google" && token.email) {
        const idToken = account.id_token;  // Google provides this in the account object
        if (!idToken) {
          console.error("[NextAuth] Google OAuth: No ID token available for", token.email);
          return token;
        }
        try {
          const response = await fetch(`${backendBaseUrl}/api/auth/oauth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: token.name ?? "Google User",
              email: token.email,
              idToken,
            }),
          });

          if (response.ok) {
            const payload = (await response.json()) as {
              success: boolean;
              message?: string;
              data?: {
                accessToken?: string;
                mfaRequired?: boolean;
                mfaToken?: string;
                user?: {
                  id: string;
                  role: string;
                };
              };
            };

            if (payload.data?.mfaRequired && payload.data?.mfaToken) {
              // MFA is required — store the challenge token, don't set accessToken
              console.log(`[NextAuth] Google OAuth: MFA required for ${token.email}`);
              token.mfaRequired = true;
              token.mfaToken = payload.data.mfaToken;
              token.accessToken = undefined;
              // Use the email as a provisional identifier until MFA is verified
              token.role = token.role ?? "CUSTOMER";
            } else if (payload.success && payload.data?.accessToken) {
              token.id = payload.data.user?.id ?? token.id;
              token.role = payload.data.user?.role ?? token.role ?? "CUSTOMER";
              token.accessToken = payload.data.accessToken;
              token.mfaRequired = undefined;
              token.mfaToken = undefined;
            } else {
              console.error(
                `[NextAuth] Google OAuth: Backend rejected the token for ${token.email}`,
                payload,
              );
            }
          } else {
            const errorBody = await response.text().catch(() => "(unreadable)");
            console.error(
              `[NextAuth] Google OAuth: Backend returned ${response.status} for ${token.email}`,
              errorBody,
            );
          }
        } catch (err) {
          console.error(
            `[NextAuth] Google OAuth: Network error exchanging token for ${token.email}`,
            err instanceof TypeError ? err.message : err,
            `(backendBaseUrl: ${backendBaseUrl})`,
          );
          token.role = token.role ?? "CUSTOMER";
        }
      }

      // Refresh user profile on existing tokens to pick up role changes
      if (!user && !account && token.accessToken) {
        try {
          const response = await fetch(`${backendBaseUrl}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
            },
            cache: "no-store",
          });

          if (response.ok) {
            const payload = (await response.json()) as {
              success: boolean;
              data?: {
                id: string;
                role: string;
              };
            };

            if (payload.success && payload.data) {
              token.role = payload.data.role;
            } else {
              console.warn(
                `[NextAuth] Profile refresh: Backend returned success=false for user ${token.email ?? token.id}`,
                payload,
              );
            }
          } else {
            console.warn(
              `[NextAuth] Profile refresh: Backend returned ${response.status} for user ${token.email ?? token.id}`,
            );
          }
        } catch (err) {
          console.warn(
            `[NextAuth] Profile refresh: Network error for user ${token.email ?? token.id}`,
            err instanceof TypeError ? err.message : err,
            `(backendBaseUrl: ${backendBaseUrl})`,
          );
          // Keep existing token data on failure
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as string) ?? "";
      }
      session.accessToken = token.accessToken as string | undefined;
      session.mfaRequired = token.mfaRequired as boolean | undefined;
      session.mfaToken = token.mfaToken as string | undefined;
      return session;
    },
    authorized: async ({ auth: authState, request }) => {
      const pathname = request.nextUrl.pathname;

      // If MFA is pending (Google OAuth with MFA enabled), redirect to login
      if (authState?.mfaRequired && pathname !== "/login") {
        const callback = encodeURIComponent(pathname);
        return Response.redirect(new URL(`/login?mfa_pending=true&callbackUrl=${callback}`, request.url));
      }

      if (pathname.startsWith("/admin")) {
        return authState?.user?.role === "ADMIN";
      }
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
