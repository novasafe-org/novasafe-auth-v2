import { useCallback, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

import {
  confirmPasswordResetAction,
  requestPasswordResetAction,
  verifyPasswordResetOtpAction,
} from "@/lib/auth/password-reset-actions";
import { OtpStep } from "@/components/auth/signup/OtpStep";
import { ResetPasswordStep } from "@/components/auth/forgot/ResetPasswordStep";
import { ErrorBanner, Field, Input, PrimaryButton, Section, Title } from "@/components/auth/primitives";

const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 6;

interface ForgotPasswordCardProps {
  initialEmail?: string;
  onBackToLogin: () => void;
  /** Called after password reset succeeds — parent should return user to login. */
  onComplete: (message: string) => void;
}

type Stage =
  | { step: "email"; email: string; error: string | null; sending: boolean }
  | {
      step: "otp";
      email: string;
      otpError: string | null;
      otpNotice: string | null;
      cooldownSeconds: number;
    }
  | {
      step: "password";
      email: string;
      resetProofToken: string;
      passwordError: string | null;
      passwordNotice: string | null;
    };

export function ForgotPasswordCard({
  initialEmail = "",
  onBackToLogin,
  onComplete,
}: ForgotPasswordCardProps) {
  const [stage, setStage] = useState<Stage>({
    step: "email",
    email: initialEmail.trim(),
    error: null,
    sending: false,
  });

  const sendResetCode = useCallback(async (email: string) => {
    const result = await requestPasswordResetAction({ data: { email } });
    if (result.status === "ok") {
      return { ok: true as const, message: result.message };
    }
    if (result.status === "rate-limited") {
      return {
        ok: false as const,
        message: result.message,
        cooldownSeconds: result.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS,
      };
    }
    return { ok: false as const, message: result.message };
  }, []);

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stage.step !== "email" || stage.sending) return;

    const trimmed = stage.email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStage({ ...stage, email: trimmed, error: "Enter a valid email address.", sending: false });
      return;
    }

    setStage({ ...stage, email: trimmed, error: null, sending: true });
    const result = await sendResetCode(trimmed);
    if (result.ok) {
      setStage({
        step: "otp",
        email: trimmed,
        otpError: null,
        otpNotice:
          "If an account exists for this email, we sent a reset code. Check your inbox and spam folder.",
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      });
      return;
    }

    const message =
      result.message ??
      ("cooldownSeconds" in result
        ? "Please wait before requesting another code."
        : "We couldn't send a reset code. Try again in a moment.");

    setStage({
      step: "email",
      email: trimmed,
      error: message,
      sending: false,
    });
  }

  const handleVerifyOtp = useCallback(
    async (otp: string): Promise<boolean> => {
      if (stage.step !== "otp") return false;
      const result = await verifyPasswordResetOtpAction({
        data: { email: stage.email, otp },
      });
      if (result.status === "ok") {
        setStage({
          step: "password",
          email: stage.email,
          resetProofToken: result.resetProofToken,
          passwordError: null,
          passwordNotice: "Code verified. Choose your new password.",
        });
        return true;
      }
      setStage({
        ...stage,
        otpError:
          result.message === "Invalid or expired reset code"
            ? "That code didn't work. It may be wrong, expired, or there may be no reset pending for this email."
            : result.message,
        otpNotice: null,
      });
      return false;
    },
    [stage],
  );

  const handleResend = useCallback(async () => {
    if (stage.step !== "otp") return { ok: false };
    const result = await sendResetCode(stage.email);
    if (result.ok) {
      setStage({
        ...stage,
        otpError: null,
        otpNotice: "Code re-sent. Check your inbox.",
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      });
      return { ok: true, cooldownSeconds: RESEND_COOLDOWN_SECONDS };
    }
    if ("cooldownSeconds" in result && result.cooldownSeconds) {
      setStage({
        ...stage,
        otpError: result.message ?? null,
        otpNotice: null,
        cooldownSeconds: result.cooldownSeconds,
      });
      return { ok: false, cooldownSeconds: result.cooldownSeconds, message: result.message };
    }
    setStage({
      ...stage,
      otpError: result.message ?? "Could not resend code. Try again shortly.",
      otpNotice: null,
    });
    return { ok: false, message: result.message };
  }, [stage, sendResetCode]);

  const handleResetPassword = useCallback(
    async (newPassword: string): Promise<boolean> => {
      if (stage.step !== "password") return false;
      const result = await confirmPasswordResetAction({
        data: {
          email: stage.email,
          resetProofToken: stage.resetProofToken,
          newPassword,
        },
      });
      if (result.status === "ok") {
        onComplete(result.message ?? "Password updated. Sign in with your new password.");
        return true;
      }
      setStage({
        ...stage,
        passwordError: result.message,
        passwordNotice: null,
      });
      return false;
    },
    [stage, onComplete],
  );

  if (stage.step === "otp") {
    return (
      <Section>
        <OtpStep
          email={stage.email}
          initialResendSeconds={stage.cooldownSeconds}
          onBack={() =>
            setStage({ step: "email", email: stage.email, error: null, sending: false })
          }
          onSubmit={handleVerifyOtp}
          onResend={handleResend}
          error={stage.otpError}
          notice={stage.otpNotice}
          showEyebrow={false}
          title="Enter your reset code"
          description={
            <>
              If an account exists for{" "}
              <span className="text-foreground font-medium">{stage.email}</span>, look for a{" "}
              {OTP_LENGTH}-digit code in your inbox (and spam).
            </>
          }
          submitLabel="Verify code"
          submitLoadingLabel="Verifying…"
          otpAriaLabel="Password reset code"
        />
      </Section>
    );
  }

  if (stage.step === "password") {
    return (
      <Section>
        <ResetPasswordStep
          email={stage.email}
          onBack={() =>
            setStage({
              step: "otp",
              email: stage.email,
              otpError: null,
              otpNotice: null,
              cooldownSeconds: RESEND_COOLDOWN_SECONDS,
            })
          }
          onSubmit={handleResetPassword}
          error={stage.passwordError}
          notice={stage.passwordNotice}
        />
      </Section>
    );
  }

  return (
    <Section>
      <button
        type="button"
        onClick={onBackToLogin}
        disabled={stage.sending}
        className="text-[12px] text-muted-foreground hover:text-foreground mb-2 transition-colors cursor-pointer disabled:opacity-60"
      >
        ← Back to sign in
      </button>

      <Title
        title="Reset your password"
        sub="Enter the email for your NovaSafe account. We'll send a one-time code if an account exists for that address."
      />

      <form onSubmit={submitEmail} className="space-y-4" noValidate>
        {stage.error && <ErrorBanner message={stage.error} />}

        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={stage.email}
            disabled={stage.sending}
            onChange={(e) =>
              setStage({ ...stage, email: e.target.value, error: null, sending: false })
            }
          />
        </Field>

        <PrimaryButton type="submit" loading={stage.sending} disabled={stage.sending}>
          {stage.sending ? (
            "Sending reset code…"
          ) : (
            <>
              Send reset code <ArrowRight className="h-4 w-4" />
            </>
          )}
        </PrimaryButton>
      </form>
    </Section>
  );
}
