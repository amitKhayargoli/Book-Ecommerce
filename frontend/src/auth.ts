import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const backendBaseUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

const providers = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email = credentials?.email;
      const password = credentials?.password;

      if (!email || !password) return null;

      const response = await fetch(`${backendBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) return null;

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

      if (!payload.success || !payload.data) return null;

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
        try {
          const response = await fetch(`${backendBaseUrl}/api/auth/oauth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: token.name ?? "Google User",
              email: token.email,
            }),
          });

          if (response.ok) {
            const payload = (await response.json()) as {
              success: boolean;
              data?: {
                accessToken: string;
                user: {
                  id: string;
                  role: string;
                };
              };
            };

            if (payload.success && payload.data) {
              token.id = payload.data.user.id;
              token.role = payload.data.user.role;
              token.accessToken = payload.data.accessToken;
            }
          }
        } catch {
          token.role = token.role ?? "CUSTOMER";
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
      return session;
    },
    authorized: async ({ auth: authState, request }) => {
      const pathname = request.nextUrl.pathname;
      if (pathname.startsWith("/admin")) {
        return authState?.user?.role === "ADMIN";
      }
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
