import { useCallback, useState, type ReactNode } from "react";

import {
  completeSignupAction,
  requestSignupOtpAction,
  type CompleteSignupResult,
  type RequestOtpResult,
} from "@/lib/auth";
import { Section, Title } from "@/components/auth/primitives";
import { IdentityStep } from "@/components/auth/signup/IdentityStep";
import { PasswordStep } from "@/components/auth/signup/PasswordStep";
import { OtpStep } from "@/components/auth/signup/OtpStep";
import { SignupStepper } from "@/components/auth/signup/SignupStepper";

/* ------------------------------------------------------------------------- */
/* Public types                                                              */
/* ------------------------------------------------------------------------- */

export interface SignupSuccess {
  user: { id: string; email: string; name?: string; picture?: string };
  fullName: string;
  redirectTo: string;
}

interface SignupCardProps {
  /** Optional `next` URL to forward to the app after signup completes. */
  next?: string;
  /**
   * Called when the OTP-verify-create-login pipeline succeeds AND a session
   * cookie has been written. Free signup goes straight to `WelcomeCard`;
   * Pro signup will intercept this in Phase 5 to show a paywall first.
   */
  onComplete: (result: SignupSuccess) => void;
}

/* ------------------------------------------------------------------------- */
/* State machine                                                             */
/* ------------------------------------------------------------------------- */

type Stage =
  | { step: "identity"; fullName: string; email: string }
  | { step: "password"; fullName: string; email: string; passwordError: string | null }
  | {
      step: "otp";
      fullName: string;
      email: string;
      password: string;
      otpError: string | null;
      otpNotice: string | null;
      cooldownSeconds: number;
    };

const RESEND_COOLDOWN_SECONDS = 30;

export function SignupCard({ next, onComplete }: SignupCardProps) {
  const [stage, setStage] = useState<Stage>({ step: "identity", fullName: "", email: "" });

  const handleIdentityContinue = useCallback(
    ({ fullName, email }: { fullName: string; email: string }) => {
      setStage({ step: "password", fullName, email, passwordError: null });
    },
    [],
  );

  const handlePasswordSubmit = useCallback(
    async (password: string): Promise<boolean> => {
      if (stage.step !== "password") return false;
      let result: RequestOtpResult;
      try {
        result = await requestSignupOtpAction({ data: { email: stage.email } });
      } catch (err) {
        console.error("[SignupCard] requestSignupOtpAction failed", err);
        setStage({
          ...stage,
          passwordError: "We couldn't send your verification code. Try again in a moment.",
        });
        return false;
      }
      if (result.status === "ok") {
        setStage({
          step: "otp",
          fullName: stage.fullName,
          email: stage.email,
          password,
          otpError: null,
          otpNotice: result.message ?? "Code sent. Check your inbox.",
          cooldownSeconds: RESEND_COOLDOWN_SECONDS,
        });
        return true;
      }
      if (result.status === "rate-limited") {
        setStage({
          ...stage,
          passwordError: result.message || "Too many attempts. Try again later.",
        });
        return false;
      }
      setStage({ ...stage, passwordError: result.message });
      return false;
    },
    [stage],
  );

  const handleOtpSubmit = useCallback(
    async (otp: string): Promise<boolean> => {
      if (stage.step !== "otp") return false;
      let result: CompleteSignupResult;
      try {
        result = await completeSignupAction({
          data: {
            email: stage.email,
            fullName: stage.fullName,
            password: stage.password,
            otp,
            next: next ?? null,
          },
        });
      } catch (err) {
        console.error("[SignupCard] completeSignupAction failed", err);
        setStage({
          ...stage,
          otpError: "We couldn't reach the signup service. Try again in a moment.",
          otpNotice: null,
        });
        return false;
      }

      if (result.status === "ok") {
        onComplete({
          user: result.user,
          fullName: stage.fullName,
          redirectTo: result.redirectTo,
        });
        return true;
      }

      if (result.status === "invalid-otp") {
        setStage({
          ...stage,
          otpError: result.message,
          otpNotice: null,
        });
        return false;
      }

      if (result.status === "email-taken") {
        setStage({
          step: "identity",
          fullName: stage.fullName,
          email: stage.email,
        });
        return false;
      }

      setStage({
        ...stage,
        otpError: result.message,
        otpNotice: null,
      });
      return false;
    },
    [stage, next, onComplete],
  );

  const handleResendOtp = useCallback(async (): Promise<{
    ok: boolean;
    cooldownSeconds?: number;
    message?: string;
  }> => {
    if (stage.step !== "otp") return { ok: false };
    let result: RequestOtpResult;
    try {
      result = await requestSignupOtpAction({ data: { email: stage.email } });
    } catch (err) {
      console.error("[SignupCard] resend OTP failed", err);
      setStage({
        ...stage,
        otpError: "We couldn't resend the code. Try again in a moment.",
        otpNotice: null,
      });
      return { ok: false };
    }

    if (result.status === "ok") {
      setStage({
        ...stage,
        otpError: null,
        otpNotice: "Code re-sent. Check your inbox.",
        cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      });
      return { ok: true, cooldownSeconds: RESEND_COOLDOWN_SECONDS };
    }
    if (result.status === "rate-limited") {
      const wait = result.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS;
      setStage({
        ...stage,
        otpError: result.message,
        otpNotice: null,
        cooldownSeconds: wait,
      });
      return { ok: false, cooldownSeconds: wait };
    }
    setStage({
      ...stage,
      otpError: result.message,
      otpNotice: null,
    });
    return { ok: false };
  }, [stage]);

  /* --------------------------- Render -------------------------------- */

  const stepIndex: 0 | 1 | 2 = stage.step === "identity" ? 0 : stage.step === "password" ? 1 : 2;

  return (
    <Section>
      <SignupStepper current={stepIndex} />

      <StepBody stage={stage}>
        {stage.step === "identity" && (
          <>
            <Title
              title="Create your NovaSafe account"
              sub="Free forever. No card required. End-to-end encrypted from day one."
            />
            <IdentityStep
              defaults={{ fullName: stage.fullName, email: stage.email }}
              next={next}
              onContinue={handleIdentityContinue}
            />
          </>
        )}

        {stage.step === "password" && (
          <>
            <Title
              title="Pick a master password"
              sub="This unlocks every secret in your vault. Make it strong — you only have to remember this one."
            />
            <PasswordStep
              email={stage.email}
              error={stage.passwordError}
              onBack={() =>
                setStage({ step: "identity", fullName: stage.fullName, email: stage.email })
              }
              onSubmit={handlePasswordSubmit}
            />
          </>
        )}

        {stage.step === "otp" && (
          <OtpStep
            email={stage.email}
            initialResendSeconds={stage.cooldownSeconds}
            error={stage.otpError}
            notice={stage.otpNotice}
            onBack={() =>
              setStage({
                step: "password",
                fullName: stage.fullName,
                email: stage.email,
                passwordError: null,
              })
            }
            onSubmit={handleOtpSubmit}
            onResend={handleResendOtp}
          />
        )}
      </StepBody>
    </Section>
  );
}

function StepBody({ stage, children }: { stage: Stage; children: ReactNode }) {
  // Wraps the active step in a single keyed div so React fully resets DOM
  // state (and any focus traps) when the user navigates between steps.
  return (
    <div key={stage.step} className="space-y-7">
      {children}
    </div>
  );
}
