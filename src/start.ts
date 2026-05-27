import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

import { appConfig } from "./config";
import { renderErrorPage } from "./lib/error-page";

/**
 * SSR runtime instance for the NovaSafe Auth project.
 *
 * The middleware chain runs in declaration order:
 *
 *   1. `csrfMiddleware` — validates that mutating server-function calls
 *      originate from this exact subdomain (`start.novasafe.io` in prod,
 *      `localhost:3001` in dev). Cross-site form posts and fetch requests
 *      from a different origin (e.g. `attacker.com`) are rejected with 403.
 *
 *   2. `errorMiddleware` — wraps any uncaught exception thrown by route
 *      loaders, server functions, or downstream middleware in a branded
 *      error page so users never see a raw stack trace.
 */

const csrfMiddleware = createCsrfMiddleware({
  // Only validate server-function invocations. Plain page navigations
  // (`GET /login`, `GET /signup`, etc.) carry no CSRF risk on their own
  // and can be initiated cross-site by design (e.g. the landing pricing
  // page deep-linking into `/signup`). Without this filter the middleware
  // would 403 those requests.
  filter: (ctx) => ctx.handlerType === "serverFn",
  // Same-origin only. The TanStack Start default is already
  // `same-origin`, but we set it explicitly so the contract is auditable
  // from this file alone.
  secFetchSite: "same-origin",
  // The browser submits server-function calls back to the auth subdomain
  // they were rendered from — never to the app subdomain — so the trusted
  // origin is `appConfig.urls.auth`. Reading it from config keeps prod
  // (`https://start.novasafe.io`) and dev (`http://localhost:3001`)
  // identical from the middleware's point of view.
  origin: appConfig.urls.auth,
  referer: true,
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // Allow framework redirects and HTTP-shaped errors to bubble up so
    // the router can handle them — only swallow truly unexpected ones.
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, errorMiddleware],
}));
