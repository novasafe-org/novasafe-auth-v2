import type { GoogleOauthIntent } from "@/lib/api";

/**
 * User-facing copy when Google sign-in stops at NovaSafe email OTP (login screen).
 */
export function messageForGoogleOtpRequired(
  intent: GoogleOauthIntent | string | undefined,
  backendMessage?: string,
): string {
  switch (intent) {
    case "google_register_pending_email":
      return "No NovaSafe account exists for this Google email yet. Please create an account first using Sign up.";
    case "google_returning_pending_email":
      return "Your email still needs to be verified before you can sign in. Check your inbox for the 6-digit code from NovaSafe.";
    default:
      return (
        backendMessage ||
        "Email verification is required before you can sign in. If you are new to NovaSafe, create an account first."
      );
  }
}
