import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { z } from "zod";

import { ApiError, authApi } from "@/lib/api";
import { buildLoginUrl } from "@/config";
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
  | { status: "redirect"; redirectTo: string }
  | { status: "error"; message: string; code?: string };

/**
 * Creates a dedicated extension session via Core and returns a redirect URL
 * with the access token in the fragment (extension SW reads it once, never shown in UI).
 */
export const completeExtensionPairingAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => pairSchema.parse(data))
  .handler(async ({ data }): Promise<ExtensionPairResult> => {
    if (!isAllowedExtensionRedirect(data.redirectUri)) {
      return { status: "error", message: "Invalid extension redirect URI." };
    }

    const webToken = await readSessionToken();
    if (!webToken) {
      throw redirect({
        href: buildLoginUrl({
          next: undefined,
          query: {
            next: `/connect/extension?installId=${encodeURIComponent(data.installId)}&redirect_uri=${encodeURIComponent(data.redirectUri)}&state=${encodeURIComponent(data.state)}`,
          },
        }),
        replace: true,
      });
    }

    try {
      const response = await authApi.pairExtension(
        {
          installationId: data.installId,
          deviceModel: `${data.browser ?? "Browser"} Extension`,
          devicePlatform: data.platform ?? "extension",
          deviceOsVersion: data.browserVersion,
          extensionVersion: data.extensionVersion,
        },
        webToken,
      );

      if (!response.success || !response.accessToken) {
        return {
          status: "error",
          message: response.message ?? "Could not authorize the extension.",
          code: response.code,
        };
      }

      const redirectUrl = new URL(data.redirectUri);
      const hash = new URLSearchParams({
        access_token: response.accessToken,
        state: data.state,
        token_type: "Bearer",
        expires_in: String(7 * 24 * 60 * 60),
      });
      redirectUrl.hash = hash.toString();

      return { status: "redirect", redirectTo: redirectUrl.toString() };
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
