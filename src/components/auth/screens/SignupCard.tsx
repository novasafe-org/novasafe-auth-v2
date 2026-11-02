import { useCallback, useState, type ReactNode } from "react";

import {
  completeSignupAction,
  googleSignupSetPasswordAction,
  googleSignupStartAction,
  requestSignupOtpAction,
  type CompleteSignupResult,
  type RequestOtpResult,
} from "@/lib/auth";
import { toAuthActionMessage, isExpectedAuthClientError } from "@/lib/auth/action-errors";
import { getGoogleWebClientId } from "@/lib/auth/google-config";
import { requestGoogleIdToken } from "@/lib/auth/google";
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
  | { step: "identity"; fullName: string; email: string; googleError: string | null }
  | { step: "password"; fullName: string; email: string; passwordError: string | null }
  | {
      step: "google-password";
      fullName: string;
      email: string;
      passwordError: string | null;
    }
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
  const [stage, setStage] = useState<Stage>({
    step: "identity",
    fullName: "",
    email: "",
    googleError: null,
  });
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleIdentityContinue = useCallback(
    ({ fullName, email }: { fullName: string; email: string }) => {
      setStage({ step: "password", fullName, email, passwordError: null });
    },
    [],
  );

  const handleGoogleSignup = useCallback(async () => {
    const clientId = getGoogleWebClientId();
    if (!clientId || googleLoading) return;
    setGoogleLoading(true);
    if (stage.step === "identity") {
      setStage({ ...stage, googleError: null });
    }
    try {
      const idToken = await requestGoogleIdToken(clientId);
      const result = await googleSignupStartAction({ data: { idToken, next: next ?? null } });
      if (result.status === "master-password-required") {
        setStage({
          step: "google-password",
          fullName: result.fullName,
          email: result.email,
          passwordError: null,
        });
        return;
      }
      if (result.status === "ok") {
        onComplete({
          user: result.user,
          fullName: result.user.name ?? result.user.email,
          redirectTo: result.redirectTo,
        });
        return;
      }
      if (stage.step === "identity") {
        setStage({ ...stage, googleError: result.message });
      }
    } catch (err) {
      if (stage.step === "identity") {
        setStage({
          ...stage,
          googleError: toAuthActionMessage(err, "Google sign-up was cancelled or unavailable."),
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading, next, onComplete, stage]);

  const handleGooglePasswordSubmit = useCallback(
    async (password: string): Promise<boolean> => {
      if (stage.step !== "google-password") return false;
      let result;
      try {
        result = await googleSignupSetPasswordAction({
          data: { password, next: next ?? null },
        });
      } catch (err) {
        setStage({
          ...stage,
          passwordError: toAuthActionMessage(err, "Could not save your master password."),
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
      setStage({ ...stage, passwordError: result.message });
      return false;
    },
    [stage, next, onComplete],
  );

  const handlePasswordSubmit = useCallback(
    async (password: string): Promise<boolean> => {
      if (stage.step !== "password") return false;
      let result: RequestOtpResult;
      try {
        result = await requestSignupOtpAction({ data: { email: stage.email } });
      } catch (err) {
        if (import.meta.env.DEV && !isExpectedAuthClientError(err)) {
          console.error("[SignupCard] requestSignupOtpAction failed", err);
        }
        setStage({
          ...stage,
          passwordError: toAuthActionMessage(err, "We couldn't send your verification code. Try again."),
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
        if (import.meta.env.DEV && !isExpectedAuthClientError(err)) {
          console.error("[SignupCard] completeSignupAction failed", err);
        }
        setStage({
          ...stage,
          otpError: toAuthActionMessage(err, "Something went wrong. Try again in a moment."),
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
          googleError: null,
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
      if (import.meta.env.DEV && !isExpectedAuthClientError(err)) {
        console.error("[SignupCard] resend OTP failed", err);
      }
      setStage({
        ...stage,
        otpError: toAuthActionMessage(err, "We couldn't resend the code. Try again."),
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

  const stepIndex: 0 | 1 | 2 =
    stage.step === "identity"
      ? 0
      : stage.step === "password" || stage.step === "google-password"
        ? 1
        : 2;

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
              onGoogleSignup={handleGoogleSignup}
              googleLoading={googleLoading}
              googleError={stage.googleError}
            />
          </>
        )}

        {stage.step === "google-password" && (
          <>
            <Title
              title="Pick a master password"
              sub="Google verified your email. Choose a master password to encrypt your vault — we never store it in plain text."
            />
            <PasswordStep
              email={stage.email}
              error={stage.passwordError}
              onBack={() =>
                setStage({
                  step: "identity",
                  fullName: stage.fullName,
                  email: stage.email,
                  googleError: null,
                })
              }
              onSubmit={handleGooglePasswordSubmit}
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
                setStage({
                  step: "identity",
                  fullName: stage.fullName,
                  email: stage.email,
                  googleError: null,
                })
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
