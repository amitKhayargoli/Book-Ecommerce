# ────────────────────────────────────────────────
#  STAGE 1 : Deps - install ALL dependencies
# ────────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ────────────────────────────────────────────────
#  STAGE 2 : Development - hot-reload with ts-node
# ────────────────────────────────────────────────
FROM deps AS development

WORKDIR /app

COPY . .

RUN npx prisma generate

EXPOSE 3001

CMD npx prisma generate && npm run dev

# ────────────────────────────────────────────────
#  STAGE 3 : Build - compile TypeScript
# ────────────────────────────────────────────────
FROM deps AS build

WORKDIR /app

COPY . .
RUN npx prisma generate && npm run build

# ────────────────────────────────────────────────
#  STAGE 4 : Production - minimal runtime image
# ────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Install only production deps - uses the lockfile for reproducible builds
COPY package*.json ./
RUN npm ci --omit=dev

# Generated Prisma client from the build stage
# (@prisma/client dep provides the import; .prisma has the runtime)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Compiled output
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/server.js"]
