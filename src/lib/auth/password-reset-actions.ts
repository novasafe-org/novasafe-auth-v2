import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ApiError, authApi } from "@/lib/api";

const emailSchema = z.object({
  email: z.string().email(),
});

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4),
});

const confirmSchema = z.object({
  email: z.string().email(),
  resetProofToken: z.string().min(16),
  newPassword: z.string().min(8),
});

export type RequestPasswordResetResult =
  | { status: "ok"; message?: string }
  | { status: "rate-limited"; message: string; retryAfterSeconds?: number }
  | { status: "error"; message: string };

export type VerifyPasswordResetOtpResult =
  | { status: "ok"; resetProofToken: string; message?: string }
  | { status: "error"; message: string };

export type ConfirmPasswordResetResult =
  | { status: "ok"; message?: string }
  | { status: "error"; message: string };

export const requestPasswordResetAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => emailSchema.parse(data))
  .handler(async ({ data }): Promise<RequestPasswordResetResult> => {
    try {
      const response = await authApi.requestPasswordReset({ email: data.email });
      if (!response.success) {
        return { status: "error", message: response.message ?? "Could not send reset code." };
      }
      return { status: "ok", message: response.message };
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 429) {
          const body =
            error.body && typeof error.body === "object" && !Array.isArray(error.body)
              ? (error.body as { retryAfterSeconds?: number })
              : null;
          return {
            status: "rate-limited",
            message: error.message,
            retryAfterSeconds: body?.retryAfterSeconds,
          };
        }
        return { status: "error", message: error.message };
      }
      console.error("[requestPasswordResetAction]", error);
      return { status: "error", message: "Could not send reset code. Try again in a moment." };
    }
  });

export const verifyPasswordResetOtpAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => verifySchema.parse(data))
  .handler(async ({ data }): Promise<VerifyPasswordResetOtpResult> => {
    try {
      const response = await authApi.verifyPasswordResetOtp({
        email: data.email,
        otp: data.otp,
      });
      if (!response.success || !response.resetProofToken) {
        return { status: "error", message: response.message ?? "That code didn't work." };
      }
      return {
        status: "ok",
        resetProofToken: response.resetProofToken,
        message: response.message,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return { status: "error", message: error.message };
      }
      console.error("[verifyPasswordResetOtpAction]", error);
      return { status: "error", message: "Could not verify that code. Try again." };
    }
  });

export const confirmPasswordResetAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => confirmSchema.parse(data))
  .handler(async ({ data }): Promise<ConfirmPasswordResetResult> => {
    try {
      const response = await authApi.confirmPasswordReset({
        email: data.email,
        resetProofToken: data.resetProofToken,
        newPassword: data.newPassword,
      });
      if (!response.success) {
        return { status: "error", message: response.message ?? "Could not update your password." };
      }
      return { status: "ok", message: response.message };
    } catch (error) {
      if (error instanceof ApiError) {
        return { status: "error", message: error.message };
      }
      console.error("[confirmPasswordResetAction]", error);
      return { status: "error", message: "Could not update your password. Try again." };
    }
  });
