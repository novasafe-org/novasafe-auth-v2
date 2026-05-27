import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Mail, RefreshCw } from "lucide-react";

import { OtpInput } from "@/components/auth/OtpInput";
import { ErrorBanner, PrimaryButton, Title } from "@/components/auth/primitives";

interface OtpStepProps {
  email: string;
  /** Initial cooldown countdown in seconds (set by parent right after a send). */
  initialResendSeconds: number;
  onBack: () => void;
  onSubmit: (otp: string) => Promise<boolean>;
  onResend: () => Promise<{ ok: boolean; cooldownSeconds?: number; message?: string }>;
  /** Forwarded from parent — shown above the OTP grid. */
  error?: string | null;
  /** Toast-style hint (e.g. "Code re-sent. Check your inbox."). */
  notice?: string | null;
}

const CODE_LENGTH = 6;

/**
 * Step 3 — verify the email + complete the signup pipeline.
 *
 * The parent owns the verify-create-login chain (`completeSignupAction`);
 * we just collect the digits, fire `onSubmit(otp)`, and surface the
 * resulting error / success state.
 */
export function OtpStep({
  email,
  initialResendSeconds,
  onBack,
  onSubmit,
  onResend,
  error,
  notice,
}: OtpStepProps) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(initialResendSeconds);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setResendCountdown(initialResendSeconds);
  }, [initialResendSeconds]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = window.setTimeout(() => setResendCountdown((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendCountdown]);

  const filled = code.length === CODE_LENGTH;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!filled || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit(code);
    if (!ok) setSubmitting(false);
  }

  async function resend() {
    if (resending || resendCountdown > 0) return;
    setResending(true);
    const result = await onResend();
    setResending(false);
    if (result.cooldownSeconds && result.cooldownSeconds > 0) {
      setResendCountdown(result.cooldownSeconds);
    } else if (result.ok) {
      setResendCountdown(initialResendSeconds);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-2 transition-colors disabled:opacity-60"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <Title
        eyebrow="Verify email"
        title="Confirm it's you"
        sub={
          <>
            We emailed a {CODE_LENGTH}-digit code to{" "}
            <span className="text-foreground font-medium">{email}</span>.
          </>
        }
      />

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-xs">
        <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center">
          <Mail className="h-4 w-4 text-primary" />
        </div>
        <div className="text-[12px]">
          <div className="font-medium text-foreground">Code sent</div>
          <div className="text-muted-foreground">
            Expires in 10 minutes · check spam if it didn't arrive
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <ErrorBanner message={error} />}
        {notice && !error && (
          <div className="rounded-xl border border-primary/30 bg-primary-soft/40 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground">
            {notice}
          </div>
        )}

        <OtpInput
          length={CODE_LENGTH}
          value={code}
          onChange={setCode}
          disabled={submitting}
          ariaLabel="Email verification code"
        />

        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Didn't get it?</span>
          {resendCountdown > 0 ? (
            <span>Resend in 0:{resendCountdown.toString().padStart(2, "0")}</span>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="text-foreground hover:text-primary inline-flex items-center gap-1 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
        </div>

        <PrimaryButton type="submit" loading={submitting} disabled={!filled}>
          {submitting ? (
            "Creating your vault…"
          ) : (
            <>
              <Check className="h-4 w-4" /> Verify &amp; create account
            </>
          )}
        </PrimaryButton>
      </form>
    </>
  );
}
