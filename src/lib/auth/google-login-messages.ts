import type { GoogleOauthIntent } from "@/lib/api";
import type { ApiError } from "@/lib/api";

/** Shown when login-time Google OAuth requires NovaSafe email OTP (legacy mobile users). */
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

export const GOOGLE_LOGIN_NO_ACCOUNT_MESSAGE =
  "No NovaSafe account is connected to this Google account. Please create an account first.";

export const GOOGLE_LOGIN_ACCOUNT_NOT_READY_MESSAGE =
  "This account is not ready to sign in yet. Please finish creating your account on the sign up page.";

export const GOOGLE_SIGNUP_ACCOUNT_EXISTS_MESSAGE =
  "A NovaSafe account is already linked to this Google account. Please sign in instead.";

export const GOOGLE_SIGNUP_PROVIDER_NOT_LINKED_MESSAGE =
  "An account already exists with this email. Sign in with your existing method, then connect Google from account settings.";

export function mapGoogleApiError(err: ApiError): string | undefined {
  switch (err.code) {
    case "NO_ACCOUNT":
      return GOOGLE_LOGIN_NO_ACCOUNT_MESSAGE;
    case "ACCOUNT_NOT_VERIFIED":
      return GOOGLE_LOGIN_ACCOUNT_NOT_READY_MESSAGE;
    case "ACCOUNT_ALREADY_EXISTS":
      return GOOGLE_SIGNUP_ACCOUNT_EXISTS_MESSAGE;
    case "ACCOUNT_EXISTS_PROVIDER_NOT_LINKED":
      return GOOGLE_SIGNUP_PROVIDER_NOT_LINKED_MESSAGE;
    case "GOOGLE_EMAIL_NOT_VERIFIED":
      return "Google did not verify this email address. Use another sign-in method.";
    case "GOOGLE_IDENTITY_ALREADY_LINKED":
      return "This Google account is already connected to another NovaSafe account.";
    case "GOOGLE_TOKEN_INVALID":
    case "GOOGLE_TOKEN_EXPIRED":
      return "Google sign-in expired or was invalid. Try again.";
    default:
      return undefined;
  }
}
