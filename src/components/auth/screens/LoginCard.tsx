import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock } from "lucide-react";

import { loginAction, type LoginResult } from "@/lib/auth";
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
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    let result: LoginResult;
    try {
      result = await loginAction({ data: { email, password, next: next ?? null } });
    } catch (err) {
      console.error("[LoginCard] login action failed", err);
      setError("We couldn't reach the sign-in service. Try again in a moment.");
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

  return (
    <Section>
      <Title title="Sign in to NovaSafe" sub="Welcome back. Your vault is encrypted and waiting." />

      <div className="space-y-2">
        <SocialPlaceholder icon={<KeyRound className="h-4 w-4" />} label="Continue with Google" />
        <SocialPlaceholder icon={<KeyRound className="h-4 w-4" />} label="Sign in with Passkey" />
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

function SocialPlaceholder({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Coming in the next iteration"
      className="group w-full h-11 rounded-[10px] bg-card border border-border opacity-60 cursor-not-allowed text-[13px] font-medium inline-flex items-center justify-center gap-2.5 shadow-xs"
    >
      <span className="text-foreground">{icon}</span>
      {label}
    </button>
  );
}
