import type { GoogleOauthIntent } from "@/lib/api";

/** Shown when login-time Google OAuth requires NovaSafe email OTP (register flow only). */
export function messageForGoogleOtpRequired(
  intent: GoogleOauthIntent | string | undefined,
  backendMessage?: string,
): string {
  switch (intent) {
    case "google_returning_pending_email":
      return "Your email still needs to be verified before you can sign in. Check your inbox for the 6-digit code from NovaSafe.";
    default:
      return (
        backendMessage ||
        "Email verification is required before you can sign in. If you are new to NovaSafe, create an account first."
      );
  }
}

/** Login page: Google sign-in rejected because no NovaSafe user exists. */
export const GOOGLE_LOGIN_NO_ACCOUNT_MESSAGE =
  "No NovaSafe account for this Google email. Please sign up first.";

/** Login page: user exists but never finished NovaSafe signup verification. */
export const GOOGLE_LOGIN_ACCOUNT_NOT_READY_MESSAGE =
  "This account is not ready to sign in yet. Please finish creating your account on the sign up page.";
