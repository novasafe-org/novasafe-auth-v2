# syntax=docker/dockerfile:1.7
#
# NovaSafe Auth (start.novasafe.io) — production image.
#
# Public VITE_* values are read from the server `.env` at runtime (SSR +
# browser injection). Build uses production defaults only — no GitHub secrets.

# -----------------------------------------------------------------------------
# Stage 1 — builder
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

WORKDIR /app

# Build-time placeholders only — runtime values come from server .env.
ENV NODE_ENV=production \
    VITE_AUTH_URL=https://start.novasafe.io \
    VITE_APP_URL=https://app.novasafe.io \
    VITE_LANDING_URL=https://novasafe.io \
    VITE_API_URL=https://mobile-api.novasafe.io \
    VITE_GOOGLE_WEB_CLIENT_ID= \
    VITE_REVENUECAT_PUBLIC_API_KEY_WEB= \
    VITE_REVENUECAT_ENTITLEMENT_PRO=pro \
    VITE_REVENUECAT_PACKAGE_MONTHLY=$rc_monthly \
    VITE_REVENUECAT_PACKAGE_YEARLY=$rc_annual \
    VITE_APP_VERSION=0.0.0

COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store-auth,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

RUN --mount=type=cache,id=pnpm-store-auth,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts

# -----------------------------------------------------------------------------
# Stage 2 — runner
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache tini wget

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3101 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/package.json ./package.json

EXPOSE 3101

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --spider --method=HEAD http://localhost:${PORT}/login || exit 1

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "bin/server.mjs"]
