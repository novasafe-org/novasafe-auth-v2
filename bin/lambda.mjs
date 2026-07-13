/**
 * AWS Lambda entry for TanStack Start SSR (Function URL v2.0).
 *
 * Converts Lambda HTTP events to fetch() calls against the Vite SSR bundle.
 * Static assets are served from dist/client/ (same logic as bin/server.mjs).
 */
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const runtimeDir = fileURLToPath(new URL(".", import.meta.url));
const clientDistDir = resolve(runtimeDir, "../client");

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

function eventToRequest(event) {
  const domain = event.requestContext?.domainName ?? "localhost";
  const path = event.rawPath ?? event.requestContext?.http?.path ?? "/";
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const method = event.requestContext?.http?.method ?? "GET";

  const headers = new Headers();
  if (event.headers) {
    for (const [key, value] of Object.entries(event.headers)) {
      if (value != null && value !== "") headers.set(key, String(value));
    }
  }

  let body;
  if (event.body && method !== "GET" && method !== "HEAD") {
    body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
  }

  return new Request(`https://${domain}${path}${query}`, { method, headers, body });
}

async function responseToLambda(response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const isText =
    (response.headers.get("content-type") ?? "").includes("text/") ||
    (response.headers.get("content-type") ?? "").includes("application/json") ||
    (response.headers.get("content-type") ?? "").includes("application/javascript");

  if (isText) {
    return {
      statusCode: response.status,
      headers,
      body: buffer.toString("utf8"),
      isBase64Encoded: false,
    };
  }

  return {
    statusCode: response.status,
    headers,
    body: buffer.toString("base64"),
    isBase64Encoded: true,
  };
}

let ssrHandlerPromise;

async function getSsrHandler() {
  if (!ssrHandlerPromise) {
    ssrHandlerPromise = import("../server/server.js").then((module) => module.default ?? module);
  }
  return ssrHandlerPromise;
}

export const handler = async (event) => {
  const request = eventToRequest(event);
  const staticResponse = await maybeServeStaticAsset(request);
  const ssrHandler = await getSsrHandler();
  const response =
    staticResponse ?? (await ssrHandler.fetch(request, process.env, {}));
  return responseToLambda(response);
};
