# syntax=docker/dockerfile:1.7
#
# NovaSafe Auth (start.novasafe.io) — production image.
#
# Two-stage build:
#   1. `builder`  — installs full deps (incl. devDependencies), bakes the
#                   browser bundle's `VITE_*` env values via build-args, and
#                   produces `dist/` (TanStack Start node-server target).
#   2. `runner`   — slim Node runtime that contains only what the SSR
#                   server needs at runtime: production deps, the built
#                   `dist/` output, and our `bin/server.mjs` listener.
#
# Image layout in the final stage:
#   /app/dist/                    SSR + client bundles produced by Vite
#   /app/bin/server.mjs           srvx-based Node listener (entrypoint)
#   /app/node_modules/            production-only deps
#
# Notes:
#   - All `VITE_*` values are bundled into the browser JS at *build time*.
#     Passing different values requires a fresh image build — that is by
#     design (Vite cannot read these at runtime). Server-only secrets
#     (`AUTH_COOKIE_*`, etc.) are read from `process.env` at runtime via
#     docker-compose.
#   - `NODE_ENV=production` is set before `pnpm build` so React's prod
#     JSX runtime is used. Without it, the SSR bundle imports
#     `react/jsx-dev-runtime`, which isn't shipped in the prod build,
#     and every render throws `jsxDEV is not a function`.

# -----------------------------------------------------------------------------
# Stage 1 — builder
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

# Pin to the same pnpm major/minor that generated `pnpm-lock.yaml`. Using
# `@latest` here previously pulled pnpm 11+, which (a) silently bypasses
# the legacy `package.json#pnpm` block and (b) ships a stricter default
# `minimumReleaseAge` than the lockfile-generation environment, both of
# which break a frozen-lockfile install.
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

WORKDIR /app

# Build-time public env (bundled into the browser JS).
# Defaults are production values — CI overrides via build-args.
ARG VITE_AUTH_URL=https://start.novasafe.io
ARG VITE_APP_URL=https://app.novasafe.io
ARG VITE_LANDING_URL=https://novasafe.io
ARG VITE_API_URL=https://api.novasafe.io
ARG VITE_GOOGLE_WEB_CLIENT_ID=
ARG VITE_REVENUECAT_PUBLIC_API_KEY_WEB=
ARG VITE_REVENUECAT_ENTITLEMENT_PRO=pro
ARG VITE_REVENUECAT_PACKAGE_MONTHLY=$rc_monthly
ARG VITE_REVENUECAT_PACKAGE_YEARLY=$rc_annual
ARG VITE_APP_VERSION=0.0.0

ENV NODE_ENV=production \
    VITE_AUTH_URL=${VITE_AUTH_URL} \
    VITE_APP_URL=${VITE_APP_URL} \
    VITE_LANDING_URL=${VITE_LANDING_URL} \
    VITE_API_URL=${VITE_API_URL} \
    VITE_GOOGLE_WEB_CLIENT_ID=${VITE_GOOGLE_WEB_CLIENT_ID} \
    VITE_REVENUECAT_PUBLIC_API_KEY_WEB=${VITE_REVENUECAT_PUBLIC_API_KEY_WEB} \
    VITE_REVENUECAT_ENTITLEMENT_PRO=${VITE_REVENUECAT_ENTITLEMENT_PRO} \
    VITE_REVENUECAT_PACKAGE_MONTHLY=${VITE_REVENUECAT_PACKAGE_MONTHLY} \
    VITE_REVENUECAT_PACKAGE_YEARLY=${VITE_REVENUECAT_PACKAGE_YEARLY} \
    VITE_APP_VERSION=${VITE_APP_VERSION}

COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store-auth,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Re-install with prod-only deps so the runner stage gets a smaller node_modules.
RUN --mount=type=cache,id=pnpm-store-auth,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts

# -----------------------------------------------------------------------------
# Stage 2 — runner
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

# tini reaps zombies and forwards SIGTERM/SIGINT to the Node process so
# `docker stop` results in a clean shutdown instead of a 10s SIGKILL wait.
RUN apk add --no-cache tini wget

WORKDIR /app

# Listen on a non-privileged port so we can drop to the unprivileged
# `node` user. Port 3101 is the cluster-wide convention for this service:
# the shared nginx reverse-proxy uses `proxy_pass http://auth:3101;` and
# docker-compose maps the same port through to the host (127.0.0.1:3101)
# for on-box debugging.
ENV NODE_ENV=production \
    PORT=3101 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/package.json ./package.json

EXPOSE 3101

# `/login` is the cheapest known-200 page on the auth surface. HEAD avoids
# downloading the full HTML body each probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --spider --method=HEAD http://localhost:${PORT}/login || exit 1

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "bin/server.mjs"]
