import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Mail, RefreshCw } from "lucide-react";

import { verifyTwoFactorAction, type LoginResult } from "@/lib/auth";
import { toAuthActionMessage, isExpectedAuthClientError } from "@/lib/auth/action-errors";
import { OtpInput } from "@/components/auth/OtpInput";
import { ErrorBanner, PrimaryButton, Section, Title } from "@/components/auth/primitives";

interface TwoFactorCardProps {
  email: string;
  /** Optional `next` URL forwarded from the landing CTAs. */
  next?: string;
  onBack: () => void;
}

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export function TwoFactorCard({ email, next, onBack }: TwoFactorCardProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (timer <= 0) return;
    const id = window.setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [timer]);

  const filled = code.length === CODE_LENGTH;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!filled || loading) return;
    setError(null);
    setLoading(true);
    let result: LoginResult;
    try {
      result = await verifyTwoFactorAction({
        data: { email, code, next: next ?? null },
      });
    } catch (err) {
      if (import.meta.env.DEV && !isExpectedAuthClientError(err)) {
        console.error("[TwoFactorCard] verify action failed", err);
      }
      setError(toAuthActionMessage(err, "Something went wrong. Try again in a moment."));
      setLoading(false);
      return;
    }

    if (result.status === "ok") {
      window.location.assign(result.redirectTo);
      return;
    }

    setLoading(false);
    if (result.status === "two-factor-required") {
      setError(result.message);
      return;
    }
    setError(result.message);
  }

  return (
    <Section>
      <button
        type="button"
        onClick={onBack}
        className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-2 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </button>

      <Title
        eyebrow="Two-factor"
        title="Verify it's you"
        sub={
          <>
            We sent a {CODE_LENGTH}-digit code to{" "}
            <span className="text-foreground font-medium">{email || "your email"}</span>.
          </>
        }
      />

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-xs">
        <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center">
          <Mail className="h-4 w-4 text-primary" />
        </div>
        <div className="text-[12px]">
          <div className="font-medium text-foreground">Code sent</div>
          <div className="text-muted-foreground">Expires in 10 minutes · check spam if missing</div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <ErrorBanner message={error} />}

        <OtpInput
          length={CODE_LENGTH}
          value={code}
          onChange={setCode}
          disabled={loading}
          ariaLabel="Two-factor code"
        />

        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Didn't receive a code?</span>
          {timer > 0 ? (
            <span>Resend in 0:{timer.toString().padStart(2, "0")}</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTimer(RESEND_SECONDS);
                setError("Code re-sent. Check your email.");
              }}
              className="text-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Resend code
            </button>
          )}
        </div>

        <PrimaryButton type="submit" loading={loading} disabled={!filled}>
          {loading ? (
            "Verifying…"
          ) : (
            <>
              <Check className="h-4 w-4" /> Verify &amp; continue
            </>
          )}
        </PrimaryButton>
      </form>
    </Section>
  );
}
