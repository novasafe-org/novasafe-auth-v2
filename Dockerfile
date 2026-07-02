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

ARG APP_VERSION=1.0.0
ARG BUILD_NUMBER=unknown
ARG GIT_COMMIT=unknown
ARG GIT_BRANCH=main
ARG REPOSITORY=novasafe-auth-v2
ARG RELEASED_AT

RUN corepack enable && corepack prepare pnpm@10.18.2 --activate \
    && apk add --no-cache git

WORKDIR /app

ENV NODE_ENV=production \
    APP_VERSION=$APP_VERSION \
    BUILD_NUMBER=$BUILD_NUMBER \
    GIT_COMMIT=$GIT_COMMIT \
    GIT_BRANCH=$GIT_BRANCH \
    REPOSITORY=$REPOSITORY \
    RELEASED_AT=$RELEASED_AT \
    VITE_AUTH_URL=https://start.novasafe.io \
    VITE_APP_URL=https://app.novasafe.io \
    VITE_LANDING_URL=https://novasafe.io \
    VITE_API_URL=https://mobile-api.novasafe.io \
    VITE_GOOGLE_WEB_CLIENT_ID= \
    VITE_REVENUECAT_PUBLIC_API_KEY_WEB= \
    VITE_REVENUECAT_ENTITLEMENT_PRO=pro \
    VITE_REVENUECAT_PACKAGE_MONTHLY=$rc_monthly \
    VITE_REVENUECAT_PACKAGE_YEARLY=$rc_annual \
    VITE_APP_VERSION=$APP_VERSION

COPY package.json pnpm-lock.yaml .npmrc ./
COPY scripts/sync-feature-flags-catalog.mjs scripts/sync-feature-flags-catalog.mjs
RUN --mount=type=cache,id=pnpm-store-auth,target=/root/.local/share/pnpm/store \
    SKIP_FEATURE_FLAG_COMPILE=1 node scripts/sync-feature-flags-catalog.mjs \
    && pnpm install --frozen-lockfile

COPY . .
RUN node scripts/sync-feature-flags-catalog.mjs \
    && pnpm install --frozen-lockfile \
    && pnpm build

RUN rm -rf node_modules \
    && pnpm install --frozen-lockfile --prod --ignore-scripts

# -----------------------------------------------------------------------------
# Stage 2 — runner
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

RUN apk upgrade --no-cache \
    && apk add --no-cache tini wget \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
       /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3101 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/vendor ./vendor
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3101

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --spider --method=HEAD http://localhost:${PORT}/login || exit 1

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "bin/server.mjs"]
