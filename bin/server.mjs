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

const handlerModule = await import("../dist/server/server.js");
const handler = handlerModule.default ?? handlerModule;

if (typeof handler.fetch !== "function") {
  console.error("[novasafe-auth] dist/server/server.js does not export a fetch handler.");
  process.exit(1);
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

const server = serve({
  fetch: (request) => handler.fetch(request, process.env, {}),
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
