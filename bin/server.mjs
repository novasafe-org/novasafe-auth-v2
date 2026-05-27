// Production Node server entry for the NovaSafe Auth project.
//
// TanStack Start's Vite build emits a fetch-handler bundle at
// `dist/server/server.js` (the same shape Cloudflare Workers expects). To
// run it as a long-lived Node process inside our Docker image we use
// `srvx/node` — the same fetch-to-Node adapter TanStack Start itself uses
// during local dev, so request semantics match between dev and prod.
//
// Configuration is driven entirely by environment variables:
//
//   PORT      — listen port (default 3000; we set 80 in the Docker image).
//   HOSTNAME  — bind address (default 0.0.0.0; container-friendly).
//   NODE_ENV  — informational; the SSR bundle reads it directly.
//
// This file is plain ESM (`.mjs`) — no transpilation step, no extra build
// dependency. It is committed to the repo and copied into the final image
// alongside `dist/`, so `node bin/server.mjs` is the only command needed
// to start the service.

import { serve } from "srvx/node";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const handlerModule = await import("../dist/server/server.js");
const handler = handlerModule.default ?? handlerModule;
const clientDistDir = fileURLToPath(new URL("../dist/client", import.meta.url));

const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
});

function getContentType(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

async function maybeServeStaticAsset(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const url = new URL(request.url);
  const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!relativePath) return null;

  const absolutePath = resolve(clientDistDir, relativePath);
  const clientRootPrefix = `${clientDistDir}${sep}`;
  if (absolutePath !== clientDistDir && !absolutePath.startsWith(clientRootPrefix)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const body = request.method === "HEAD" ? null : await readFile(absolutePath);
    const contentType = getContentType(absolutePath);
    const isHashedAsset = url.pathname.startsWith("/assets/");
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": isHashedAsset
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600",
      },
    });
  } catch {
    return null;
  }
}

if (typeof handler.fetch !== "function") {
  console.error("[novasafe-auth] dist/server/server.js does not export a fetch handler.");
  process.exit(1);
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

const server = serve({
  fetch: async (request) => {
    const staticResponse = await maybeServeStaticAsset(request);
    if (staticResponse) return staticResponse;
    return handler.fetch(request, process.env, {});
  },
  port: Number.isFinite(port) && port > 0 ? port : 3000,
  hostname,
});

await server.ready();

const banner = `[novasafe-auth] listening on http://${hostname}:${server.addr?.port ?? port}`;
console.log(banner);

function shutdown(signal) {
  console.log(`[novasafe-auth] received ${signal}, closing…`);
  server.close().finally(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
