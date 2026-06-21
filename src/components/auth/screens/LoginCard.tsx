import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock } from "lucide-react";

import { loginAction, googleLoginAction, type LoginResult } from "@/lib/auth";
import { toAuthActionMessage, isExpectedAuthClientError } from "@/lib/auth/action-errors";
import { getGoogleWebClientId, isGoogleSignInEnabled } from "@/lib/auth/google-config";
import { requestGoogleIdToken } from "@/lib/auth/google";
import {
  Divider,
  ErrorBanner,
  Field,
  Input,
  PrimaryButton,
  Section,
  Title,
} from "@/components/auth/primitives";

interface LoginCardProps {
  /** Optional `next` URL forwarded from the landing CTAs (open-redirect-safe). */
  next?: string;
  /** Called when the backend reports `requiresTwoFactor`. */
  onTwoFactorRequired: (email: string, message: string) => void;
}

export function LoginCard({ next, onTwoFactorRequired }: LoginCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    let result: LoginResult;
    try {
      result = await loginAction({ data: { email: trimmedEmail, password, next: next ?? null } });
    } catch (err) {
      if (import.meta.env.DEV && !isExpectedAuthClientError(err)) {
        console.error("[LoginCard] login action failed", err);
      }
      setError(
        toAuthActionMessage(err, "Something went wrong. Try again in a moment."),
      );
      setLoading(false);
      return;
    }

    if (result.status === "ok") {
      // Cross-subdomain handoff — full document navigation.
      window.location.assign(result.redirectTo);
      return;
    }

    setLoading(false);

    if (result.status === "two-factor-required") {
      onTwoFactorRequired(result.email, result.message);
      return;
    }

    if (result.status === "subscription-blocked") {
      setError(
        result.message ||
          "Your subscription requires action before you can sign in. Please review your billing settings.",
      );
      return;
    }

    setError(result.message);
  }

  async function continueWithGoogle() {
    const clientId = getGoogleWebClientId();
    if (!clientId || googleLoading) {
      if (!clientId) {
        setError("Google Sign-In is not configured. Set VITE_GOOGLE_WEB_CLIENT_ID on the auth service.");
      }
      return;
    }
    setError(null);
    setGoogleLoading(true);
    try {
      const idToken = await requestGoogleIdToken(clientId);
      const result = await googleLoginAction({ data: { idToken, next: next ?? null } });
      if (result.status === "ok") {
        window.location.assign(result.redirectTo);
        return;
      }
      if (result.status === "otp-required") {
        setError(
          result.message ||
            "This Google account still needs email verification. Please finish signup first.",
        );
        return;
      }
      setError(result.message);
    } catch (err) {
      if (import.meta.env.DEV && !isExpectedAuthClientError(err)) {
        console.error("[LoginCard] Google sign-in failed", err);
      }
      setError(toAuthActionMessage(err, "Google sign-in was cancelled or unavailable. Try again."));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <Section>
      <Title title="Sign in to NovaSafe" sub="Welcome back. Your vault is encrypted and waiting." />

      <div className="space-y-2">
        <button
          type="button"
          onClick={continueWithGoogle}
          disabled={!isGoogleSignInEnabled() || googleLoading || loading}
          title={
            isGoogleSignInEnabled()
              ? undefined
              : "Google Sign-In requires VITE_GOOGLE_WEB_CLIENT_ID"
          }
          className="group w-full h-11 rounded-[10px] bg-card border border-border text-[13px] font-medium inline-flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
        >
          <span className="text-foreground">
            <KeyRound className="h-4 w-4" />
          </span>
          {googleLoading ? "Connecting to Google..." : "Continue with Google"}
        </button>
        {/* <SocialPlaceholder icon={<KeyRound className="h-4 w-4" />} label="Sign in with Passkey" /> */}
      </div>

      <Divider label="or" />

      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <ErrorBanner message={error} />}

        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field
          label="Master password"
          hint={
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setError("Password recovery isn't wired yet.")}
            >
              Forgot password?
            </button>
          }
        >
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <PrimaryButton type="submit" loading={loading}>
          {loading ? (
            "Signing in…"
          ) : (
            <>
              <Lock className="h-4 w-4" /> Unlock vault
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </PrimaryButton>
      </form>
    </Section>
  );
}
