import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { ApiError, authApi } from "@/lib/api";

const requestSchema = z.object({
  email: z.string().email(),
});

const confirmSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4),
  newPassword: z.string().min(8),
});

export const requestPasswordResetAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const response = await authApi.requestPasswordReset({ email: data.email });
      return { success: response.success, message: response.message };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message };
      }
      return { success: false, message: "Could not send reset code." };
    }
  });

export const confirmPasswordResetAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => confirmSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const response = await authApi.confirmPasswordReset({
        email: data.email,
        otp: data.otp,
        newPassword: data.newPassword,
      });
      return { success: response.success, message: response.message };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message };
      }
      return { success: false, message: "Could not reset password." };
    }
  });
