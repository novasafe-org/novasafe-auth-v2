import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { z } from "zod";

import { ApiError, authApi } from "@/lib/api";
import { buildLoginUrl } from "@/config";
import { extensionPairingLog } from "./extension-pairing.constants";
import {
  buildConnectExtensionReturnUrl,
} from "./extension-pairing-context";
import { readSessionToken } from "./session.server";

const pairSchema = z.object({
  installId: z.string().min(1),
  redirectUri: z.string().url(),
  state: z.string().min(8),
  browser: z.string().optional(),
  browserVersion: z.string().optional(),
  platform: z.string().optional(),
  extensionVersion: z.string().optional(),
});

const isAllowedExtensionRedirect = (redirectUri: string): boolean => {
  try {
    const url = new URL(redirectUri);
    return (
      url.protocol === "https:" &&
      (url.hostname.endsWith(".chromiumapp.org") || url.hostname.endsWith(".firefoxusercontent.com"))
    );
  } catch {
    return false;
  }
};

export type ExtensionPairResult =
  | { status: "success"; extensionRedirectTo: string }
  | { status: "error"; message: string; code?: string };

/**
 * Creates a dedicated extension session via Core and returns a redirect URL
 * with a one-time pairing code in the fragment (extension SW redeems over HTTPS).
 */
export const completeExtensionPairingAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => pairSchema.parse(data))
  .handler(async ({ data }): Promise<ExtensionPairResult> => {
    extensionPairingLog("Pairing Started", { installId: data.installId.slice(0, 8) });

    if (!isAllowedExtensionRedirect(data.redirectUri)) {
      return { status: "error", message: "Invalid extension redirect URI." };
    }

    const webToken = await readSessionToken();
    if (!webToken) {
      const returnUrl = buildConnectExtensionReturnUrl({
        installId: data.installId,
        redirect_uri: data.redirectUri,
        state: data.state,
        browser: data.browser,
        browserVersion: data.browserVersion,
        platform: data.platform,
        extensionVersion: data.extensionVersion,
      });
      throw redirect({
        href: buildLoginUrl({ next: returnUrl }),
        replace: true,
      });
    }

    try {
      const response = await authApi.createExtensionPairingHandoff(
        {
          installationId: data.installId,
          state: data.state,
        },
        webToken,
      );

      if (!response.success || !response.pairingCode) {
        return {
          status: "error",
          message: response.message ?? "Could not authorize the extension.",
          code: response.code,
        };
      }

      const redirectUrl = new URL(data.redirectUri);
      const hash = new URLSearchParams({
        pairing_code: response.pairingCode,
        state: data.state,
      });
      redirectUrl.hash = hash.toString();

      extensionPairingLog("Pairing code issued", { redirectHost: redirectUrl.hostname });
      extensionPairingLog("Pairing Completed");

      return { status: "success", extensionRedirectTo: redirectUrl.toString() };
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isUnauthorized()) {
          return { status: "error", message: "Your web session expired. Sign in again." };
        }
        return { status: "error", message: error.message, code: error.code };
      }
      return { status: "error", message: "Unexpected pairing error." };
    }
  });

export const requireAuthenticatedForPairingAction = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ authenticated: boolean; loginUrl?: string }> => {
    const token = await readSessionToken();
    if (token) return { authenticated: true };
    return { authenticated: false, loginUrl: buildLoginUrl() };
  },
);
