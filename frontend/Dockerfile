# ────────────────────────────────────────────────
#  STAGE 1 : Dependencies
# ────────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

# Skip Chromium download — puppeteer is only needed if using
# server-side PDF generation; system Chrome can be added later
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

# ────────────────────────────────────────────────
#  STAGE 2 : Build — compile Next.js + static assets
# ────────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NODE_ENV=production

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time.
# Override via --build-arg when deploying to a different host/port.
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ────────────────────────────────────────────────
#  STAGE 3 : Production — standalone runtime
# ────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone server bundle (includes all necessary deps)
COPY --from=build /app/.next/standalone ./

# Copy static assets that the standalone server expects
COPY --from=build /app/public ./public
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

# Environment variables overridden at runtime via docker-compose / k8s
CMD ["node", "server.js"]
