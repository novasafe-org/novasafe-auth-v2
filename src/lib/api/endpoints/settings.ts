import { apiFetch } from "../http";

const PREFIX = "/api/v1/settings";

export const settingsApi = {
  setLoginPassword(newPassword: string, token: string) {
    return apiFetch<{ success: boolean; message?: string }>(`${PREFIX}/set-login-password`, {
      method: "POST",
      body: { newPassword },
      token,
    });
  },
};
