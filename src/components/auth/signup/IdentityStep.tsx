import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";

import { checkSignupEmailAction, type CheckEmailResult } from "@/lib/auth";
import { buildLoginUrl } from "@/config";
import { Divider, ErrorBanner, Field, Input, PrimaryButton } from "@/components/auth/primitives";

interface IdentityStepProps {
  defaults: { fullName: string; email: string };
  /** Optional `next` URL — forwarded to the "sign in instead" link. */
  next?: string;
  onContinue: (values: { fullName: string; email: string }) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEBOUNCE_MS = 500;

/**
 * Step 1 — collect full name + email.
 *
 * Performs a debounced server-side `check-email` lookup so we can warn
 * about duplicate accounts before the user invests time picking a password.
 */
export function IdentityStep({ defaults, next, onContinue }: IdentityStepProps) {
  const [fullName, setFullName] = useState(defaults.fullName);
  const [email, setEmail] = useState(defaults.email);
  const [emailLookup, setEmailLookup] = useState<{
    state: "idle" | "checking" | "available" | "taken" | "error";
    message?: string;
  }>({ state: "idle" });
  const [submitting, setSubmitting] = useState(false);

  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookupSeq = useRef(0);

  // Debounced background email lookup.
  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (!EMAIL_RE.test(email)) {
      setEmailLookup({ state: "idle" });
      return;
    }
    setEmailLookup({ state: "checking" });
    const seq = ++lookupSeq.current;
    lookupTimer.current = setTimeout(async () => {
      let result: CheckEmailResult;
      try {
        result = await checkSignupEmailAction({ data: { email } });
      } catch (err) {
        if (seq !== lookupSeq.current) return;
        console.error("[IdentityStep] email lookup failed", err);
        setEmailLookup({ state: "error" });
        return;
      }
      if (seq !== lookupSeq.current) return;
      if (result.status === "taken") {
        setEmailLookup({
          state: "taken",
          message: "This email already has a NovaSafe account.",
        });
      } else if (result.status === "available") {
        setEmailLookup({ state: "available" });
      } else {
        setEmailLookup({ state: "error" });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, [email]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!fullName.trim() || !EMAIL_RE.test(email)) return;
    if (emailLookup.state === "taken") return;
    setSubmitting(true);
    // No async here — just hand off to the next step. We keep `submitting`
    // true so the button shows a loading state while the parent transitions.
    onContinue({ fullName: fullName.trim(), email: email.trim().toLowerCase() });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Full name" htmlFor="signup-fullname">
        <Input
          id="signup-fullname"
          required
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </Field>

      <Field
        label="Email"
        htmlFor="signup-email"
        hint={
          emailLookup.state === "checking" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking…
            </span>
          ) : emailLookup.state === "available" ? (
            <span className="text-success">Available</span>
          ) : null
        }
      >
        <Input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          placeholder="ada@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      {emailLookup.state === "taken" && emailLookup.message && (
        <ErrorBanner message={emailLookup.message} />
      )}

      <PrimaryButton type="submit" loading={submitting} disabled={emailLookup.state === "taken"}>
        Continue <ArrowRight className="h-4 w-4" />
      </PrimaryButton>

      <Divider label="or" />

      <a
        href={buildLoginUrl(next ? { next } : undefined)}
        className="w-full h-11 rounded-[10px] border border-border bg-card text-[13px] font-medium text-foreground
          hover:bg-secondary hover:border-border-strong transition-all inline-flex items-center justify-center gap-2 shadow-xs"
      >
        <KeyRound className="h-4 w-4" /> I already have an account
      </a>
    </form>
  );
}
