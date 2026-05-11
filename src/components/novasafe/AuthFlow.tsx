import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, Eye, EyeOff, Fingerprint, Mail, Lock,
  ShieldCheck, Smartphone, Download, KeyRound, Users, Sparkles,
  Laptop, MapPin, Clock, Copy, RefreshCw, Plus, X, ScanFace, Loader2,
  AlertTriangle, FileText,
} from "lucide-react";
import { CinematicPanel, NovaLogo } from "./visuals";

type Step =
  | "login" | "forgot" | "resetSuccess"
  | "signup" | "password" | "otp"
  | "recoveryKit" | "recoveryConfirm"
  | "biometric" | "device" | "workspace" | "welcome";

const TAGLINES: Record<Step, string> = {
  login: "Your digital vault.",
  forgot: "Recovery, the secure way.",
  resetSuccess: "Access restored.",
  signup: "Zero compromise security.",
  password: "End-to-end encrypted.",
  otp: "Your identity. Protected.",
  recoveryKit: "Only you hold the keys.",
  recoveryConfirm: "Verify, then vault it.",
  biometric: "You are the password.",
  device: "Trust, but verify devices.",
  workspace: "Secure your team.",
  welcome: "Welcome to NovaSafe.",
};

export function AuthFlow() {
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const go = (s: Step) => setStep(s);

  return (
    <div className="min-h-screen w-full p-3 md:p-5 lg:p-6">
      <div className="grid h-[calc(100vh-1.5rem)] md:h-[calc(100vh-2.5rem)] lg:h-[calc(100vh-3rem)] grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-5">
        {/* Left cinematic */}
        <div className="hidden lg:block">
          <CinematicPanel tagline={TAGLINES[step]} />
        </div>

        {/* Right panel */}
        <div className="relative flex items-center justify-center overflow-y-auto">
          <div className="absolute inset-0 -z-10 grid-bg opacity-40 lg:hidden" />
          <div className="absolute top-5 left-5 lg:hidden">
            <NovaLogo />
          </div>
          <div className="w-full max-w-md py-14 lg:py-6">
            <div key={step} className="animate-fade-up">
              {step === "login" && <LoginScreen email={email} setEmail={setEmail} go={go} />}
              {step === "password" && <PasswordScreen email={email} go={go} />}
              {step === "otp" && <OtpScreen email={email} go={go} />}
              {step === "forgot" && <ForgotScreen email={email} setEmail={setEmail} go={go} />}
              {step === "resetSuccess" && <ResetSuccess go={go} />}
              {step === "signup" && (
                <SignupScreen
                  email={email} setEmail={setEmail}
                  name={name} setName={setName}
                  company={company} setCompany={setCompany}
                  go={go}
                />
              )}
              {step === "recoveryKit" && <RecoveryKitScreen go={go} />}
              {step === "recoveryConfirm" && <RecoveryConfirmScreen go={go} />}
              {step === "biometric" && <BiometricScreen go={go} />}
              {step === "device" && <DeviceScreen go={go} />}
              {step === "workspace" && <WorkspaceScreen company={company} go={go} />}
              {step === "welcome" && <WelcomeScreen name={name || "Operator"} go={go} />}
            </div>

            <FlowMap step={step} go={go} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Shared UI ----------------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl p-7 md:p-8 shadow-elevated">
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

function Title({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mb-7">
      {eyebrow && (
        <div className="text-[10px] uppercase tracking-[0.25em] text-primary-glow mb-2">{eyebrow}</div>
      )}
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{title}</h1>
      {sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Field({
  icon: Icon, label, children,
}: { icon?: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-12 rounded-xl bg-input/60 border border-border px-4 text-sm
        outline-none transition-all
        focus:border-primary/70 focus:bg-input focus:shadow-[0_0_0_4px_oklch(0.72_0.18_235_/_0.15)]
        placeholder:text-muted-foreground/60 ${props.className ?? ""}`}
    />
  );
}

function PrimaryButton({
  children, loading, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={`group relative w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground
        font-medium text-sm overflow-hidden transition-all
        hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${rest.className ?? ""}`}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </span>
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
    </button>
  );
}

function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full h-12 rounded-xl border border-border bg-secondary/40 text-sm font-medium
        hover:bg-secondary hover:border-primary/40 transition-all inline-flex items-center justify-center gap-2 ${props.className ?? ""}`}
    />
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-5 transition">
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}

/* ----------------- Login ----------------- */

function LoginScreen({ email, setEmail, go }: { email: string; setEmail: (s: string) => void; go: (s: Step) => void }) {
  const [loading, setLoading] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); go("password"); }, 700);
  };
  return (
    <Card>
      <Title eyebrow="Sign in" title="Log in to NovaSafe" sub="Welcome back. Your vault is encrypted and waiting." />

      <div className="space-y-2.5 mb-6">
        <SocialBtn icon="google" label="Continue with Google" />
        <SocialBtn icon="apple" label="Continue with Apple" />
        <SocialBtn icon="passkey" label="Sign in with Passkey" />
      </div>

      <Divider label="or use email" />

      <form onSubmit={submit} className="space-y-4 mt-6">
        <Field icon={Mail} label="Work email">
          <Input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>

        <label className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border bg-input accent-[oklch(0.72_0.18_235)]" />
            Remember this device
          </span>
          <button type="button" onClick={() => go("forgot")} className="text-primary-glow hover:underline">Forgot password?</button>
        </label>

        <PrimaryButton loading={loading}>
          Continue <ArrowRight className="h-4 w-4" />
        </PrimaryButton>
      </form>

      <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        Session encrypted with AES-256 · Zero-knowledge
      </div>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        New to NovaSafe?{" "}
        <button onClick={() => go("signup")} className="text-primary-glow hover:underline font-medium">Create an account</button>
      </p>
    </Card>
  );
}

function SocialBtn({ icon, label }: { icon: "google" | "apple" | "github" | "passkey"; label: string }) {
  const Icons: Record<string, React.ReactNode> = {
    google: <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#EA4335" d="M12 11v3.2h4.5c-.2 1.2-1.4 3.4-4.5 3.4-2.7 0-4.9-2.2-4.9-5s2.2-5 4.9-5c1.5 0 2.6.7 3.2 1.2L17.5 7C16 5.6 14.2 5 12 5c-3.9 0-7 3.1-7 7s3.1 7 7 7c4 0 6.7-2.8 6.7-6.8 0-.5 0-.8-.1-1.2H12z"/></svg>,
    apple: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.5-.1-2.8.9-3.6.9-.7 0-1.9-.9-3.1-.8-1.6 0-3 .9-3.8 2.4-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.4 1.2 0 1.6-.7 3.1-.7 1.4 0 1.8.7 3.1.7 1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.6-3.9zM14 5.7c.6-.8 1.1-1.9 1-2.9-.9 0-2.1.6-2.7 1.3-.6.7-1.1 1.8-1 2.8 1.1.1 2.1-.5 2.7-1.2z"/></svg>,
    github: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12 .5C5.7.5.5 5.8.5 12.3c0 5.2 3.4 9.6 8 11.2.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.6 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.6 8-6 8-11.2C23.5 5.8 18.3.5 12 .5z"/></svg>,
    passkey: <KeyRound className="h-4 w-4" />,
  };
  return (
    <button type="button" className="group w-full h-11 rounded-xl bg-secondary/50 border border-border hover:border-primary/40 hover:bg-secondary transition-all text-sm font-medium inline-flex items-center justify-center gap-2.5">
      <span className="text-foreground/90">{Icons[icon]}</span>
      {label}
    </button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
      <div className="h-px flex-1 bg-border" />
      {label}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ----------------- Password ----------------- */

function PasswordScreen({ email, go }: { email: string; go: (s: Step) => void }) {
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <Card>
      <BackBtn onClick={() => go("login")} />
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold shadow-glow">
          {(email[0] || "U").toUpperCase()}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Signing in as</div>
          <div className="text-sm font-medium">{email || "you@company.com"}</div>
        </div>
      </div>

      <Title title="Enter master password" sub="Decrypted only on this device. Never sent to our servers." />

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
        <ShieldCheck className="h-4 w-4" /> Trusted device · MacBook Pro · San Francisco
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setLoading(true); setTimeout(() => { setLoading(false); go("otp"); }, 800); }} className="space-y-4">
        <Field icon={Lock} label="Master password">
          <div className="relative">
            <Input type={show ? "text" : "password"} placeholder="••••••••••" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <PrimaryButton loading={loading}>Unlock vault</PrimaryButton>

        <GhostButton type="button" onClick={() => go("biometric")}>
          <Fingerprint className="h-4 w-4 text-primary-glow" /> Use biometric instead
        </GhostButton>

        <button type="button" onClick={() => go("forgot")} className="block w-full text-center text-xs text-muted-foreground hover:text-primary-glow transition">
          Forgot master password?
        </button>
      </form>
    </Card>
  );
}

/* ----------------- OTP ----------------- */

function OtpScreen({ email, go }: { email: string; go: (s: Step) => void }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [timer, setTimer] = useState(30);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const setIdx = (i: number, v: string) => {
    const ch = v.replace(/\D/g, "").slice(-1);
    const next = [...code]; next[i] = ch; setCode(next);
    if (ch && i < 5) refs.current[i + 1]?.focus();
    if (next.every((c) => c) && next.join("").length === 6) {
      setVerified(true);
      setTimeout(() => go("recoveryKit"), 900);
    }
  };

  return (
    <Card>
      <BackBtn onClick={() => go("password")} />
      <Title eyebrow="Two-factor" title="Verify it's really you" sub={`We sent a 6-digit code to ${email || "your email"}.`} />

      <div className="mb-6 rounded-xl border border-border bg-surface-1/60 p-3 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
          <Mail className="h-4 w-4 text-primary-glow" />
        </div>
        <div className="text-xs">
          <div className="font-medium">Code sent</div>
          <div className="text-muted-foreground">Expires in 10 minutes · check spam if missing</div>
        </div>
      </div>

      <div className="flex gap-2 justify-between mb-5">
        {code.map((c, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={c}
            onChange={(e) => setIdx(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Backspace" && !c && i > 0) refs.current[i - 1]?.focus(); }}
            inputMode="numeric"
            maxLength={1}
            className={`h-14 w-12 rounded-xl border text-center text-xl font-semibold transition-all
              ${verified ? "border-success bg-success/10 text-success" : c ? "border-primary/70 bg-input shadow-[0_0_0_4px_oklch(0.72_0.18_235_/_0.15)]" : "border-border bg-input/60"}
              outline-none focus:border-primary/70 focus:shadow-[0_0_0_4px_oklch(0.72_0.18_235_/_0.15)]`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-6">
        <span>Didn't receive a code?</span>
        {timer > 0 ? (
          <span className="text-muted-foreground">Resend in 0:{timer.toString().padStart(2, "0")}</span>
        ) : (
          <button onClick={() => setTimer(30)} className="text-primary-glow hover:underline inline-flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Resend code
          </button>
        )}
      </div>

      <PrimaryButton onClick={() => go("recoveryKit")} disabled={!code.every((c) => c)}>
        {verified ? <><Check className="h-4 w-4" /> Verified</> : "Verify & continue"}
      </PrimaryButton>
    </Card>
  );
}

/* ----------------- Forgot / Reset ----------------- */

function ForgotScreen({ email, setEmail, go }: { email: string; setEmail: (s: string) => void; go: (s: Step) => void }) {
  const [sent, setSent] = useState(false);
  return (
    <Card>
      <BackBtn onClick={() => go("login")} />
      <Title eyebrow="Account recovery" title="Recover access" sub="Choose a recovery method. Your vault stays encrypted throughout." />

      <div className="grid gap-2.5 mb-6">
        <RecoveryOption icon={Mail} title="Email recovery link" desc="Send a magic link to your inbox" active />
        <RecoveryOption icon={KeyRound} title="Recovery key file" desc="Use the encrypted PDF you saved" />
        <RecoveryOption icon={Fingerprint} title="Passkey or biometric" desc="Use a trusted device" />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setSent(true); setTimeout(() => go("resetSuccess"), 1200); }} className="space-y-4">
        <Field icon={Mail} label="Email on your account">
          <Input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <PrimaryButton loading={sent}>{sent ? "Sending secure link…" : "Send recovery link"}</PrimaryButton>
      </form>
    </Card>
  );
}

function RecoveryOption({ icon: Icon, title, desc, active }: { icon: React.ElementType; title: string; desc: string; active?: boolean }) {
  return (
    <button className={`w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition-all
      ${active ? "border-primary/60 bg-primary/10 ring-glow" : "border-border bg-surface-1/60 hover:border-primary/40"}`}>
      <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary-glow" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {active && <Check className="h-4 w-4 text-primary-glow" />}
    </button>
  );
}

function ResetSuccess({ go }: { go: (s: Step) => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center py-4">
        <div className="relative h-24 w-24 mb-6">
          <div className="absolute inset-0 rounded-full bg-success/15 animate-pulse-glow" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-success to-primary flex items-center justify-center">
            <ShieldCheck className="h-10 w-10 text-success-foreground" />
          </div>
        </div>
        <Title eyebrow="Success" title="Password reset" sub="Your master password has been securely updated. All sessions on other devices were signed out." />
        <PrimaryButton onClick={() => go("login")}>Continue to login</PrimaryButton>
      </div>
    </Card>
  );
}

/* ----------------- Signup ----------------- */

function SignupScreen({
  email, setEmail, name, setName, company, setCompany, go,
}: {
  email: string; setEmail: (s: string) => void;
  name: string; setName: (s: string) => void;
  company: string; setCompany: (s: string) => void;
  go: (s: Step) => void;
}) {
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const steps = ["Identity", "Security", "Workspace"];

  const strength = useMemo(() => {
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    if (pwd.length >= 14) s++;
    return s;
  }, [pwd]);
  const breached = pwd.toLowerCase() === "password" || pwd === "12345678";

  return (
    <Card>
      <BackBtn onClick={() => (step === 0 ? go("login") : setStep(step - 1))} />
      <Title eyebrow={`Step ${step + 1} of 3`} title="Create your vault" sub="Two minutes to a more secure life." />

      {/* Stepper */}
      <div className="flex gap-1.5 mb-7">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full transition-all ${i <= step ? "bg-gradient-primary" : "bg-border"}`} />
            <div className={`mt-2 text-[10px] uppercase tracking-wider ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</div>
          </div>
        ))}
      </div>

      {step === 0 && (
        <form onSubmit={(e) => { e.preventDefault(); setStep(1); }} className="space-y-4">
          <Field label="Full name">
            <Input required placeholder="Ada Lovelace" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field icon={Mail} label="Work email">
            <Input type="email" required placeholder="ada@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <PrimaryButton>Continue <ArrowRight className="h-4 w-4" /></PrimaryButton>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
          <Field icon={Lock} label="Master password">
            <div className="relative">
              <Input type={show ? "text" : "password"} required minLength={8} placeholder="At least 12 characters" value={pwd} onChange={(e) => setPwd(e.target.value)} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <div>
            <div className="flex gap-1 mb-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                  i < strength
                    ? strength <= 2 ? "bg-destructive" : strength <= 3 ? "bg-yellow-400" : "bg-success"
                    : "bg-border"
                }`} />
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={strength <= 2 ? "text-destructive" : strength <= 3 ? "text-yellow-400" : "text-success"}>
                {pwd ? ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"][strength] : "Set a strong password"}
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary-glow" /> AI-evaluated
              </span>
            </div>
          </div>

          {breached && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5" /> This password has appeared in 3,847 known breaches. Pick a different one.
            </div>
          )}

          <button type="button" onClick={() => setPwd("Sapphire-Orbit-Falcon-94!")} className="text-xs text-primary-glow hover:underline inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Generate a secure passphrase
          </button>

          <PrimaryButton disabled={strength < 3 || breached}>Continue <ArrowRight className="h-4 w-4" /></PrimaryButton>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={(e) => { e.preventDefault(); go("otp"); }} className="space-y-4">
          <Field label="Company / team (optional)">
            <Input placeholder="NovaSafe Inc." value={company} onChange={(e) => setCompany(e.target.value)} />
          </Field>
          <Field label="Team size">
            <div className="grid grid-cols-4 gap-2">
              {["Just me", "2–10", "11–50", "50+"].map((s, i) => (
                <button type="button" key={s} className={`h-11 rounded-xl border text-xs font-medium transition-all ${i === 1 ? "border-primary/60 bg-primary/15 text-foreground" : "border-border bg-secondary/40 hover:border-primary/40"}`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <div className="rounded-xl border border-border bg-surface-1/60 p-3 text-xs text-muted-foreground inline-flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
            We never see your master password or vault contents. Encryption happens on your device.
          </div>
          <PrimaryButton>Create vault & verify email</PrimaryButton>
        </form>
      )}
    </Card>
  );
}

/* ----------------- Recovery Kit ----------------- */

function RecoveryKitScreen({ go }: { go: (s: Step) => void }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const startDownload = () => {
    setDownloading(true);
    setProgress(0);
    const i = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(i); setDone(true); setDownloading(false); triggerPdf(); return 100; }
        return p + 4;
      });
    }, 60);
  };

  const triggerPdf = () => {
    const content = `NovaSafe Recovery Kit\n=====================\nUser: you@company.com\nGenerated: ${new Date().toISOString()}\n\nRecovery Key:\nA1B2-C3D4-E5F6-G7H8-J9K0-L1M2-N3P4-Q5R6\n\nKeep this kit in a safe place. NovaSafe cannot recover your vault without it.`;
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "NovaSafe-Recovery-Kit.pdf"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <Title eyebrow="Critical step" title="Your recovery kit" sub="Only you can decrypt your vault. If you lose your password, this kit is the only way back in." />

      <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/10 p-5 mb-5 overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Recovery Kit · NovaSafe.pdf</div>
            <div className="text-xs text-muted-foreground mt-0.5">Encrypted · 4.2 KB · 1 of 1</div>
          </div>
          {done && <Check className="h-6 w-6 text-success" />}
        </div>
        <div className="relative mt-4 font-mono text-[11px] tracking-wider text-primary-glow/90 break-all bg-background/40 rounded-lg p-3 border border-border/50">
          {downloading || done ? "A1B2-C3D4-E5F6-G7H8-J9K0-L1M2-N3P4-Q5R6"
            : "•••• •••• •••• •••• •••• •••• •••• ••••"}
        </div>
        {downloading && (
          <div className="relative mt-3">
            <div className="h-1.5 w-full rounded-full bg-background/50 overflow-hidden">
              <div className="h-full bg-gradient-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1.5">Generating encrypted bundle… {progress}%</div>
          </div>
        )}
      </div>

      <div className="grid gap-2 mb-5 text-xs">
        <Bullet>Zero-knowledge: NovaSafe cannot read or recover your vault.</Bullet>
        <Bullet>Print it, store it offline, and share only with your future self.</Bullet>
        <Bullet>You'll confirm a 12-word phrase on the next screen.</Bullet>
      </div>

      {!done ? (
        <PrimaryButton onClick={startDownload} loading={downloading}>
          <Download className="h-4 w-4" /> Download recovery kit
        </PrimaryButton>
      ) : (
        <PrimaryButton onClick={() => go("recoveryConfirm")}>
          I've saved it · Continue <ArrowRight className="h-4 w-4" />
        </PrimaryButton>
      )}
      <button onClick={() => go("recoveryConfirm")} className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground">
        Skip for now (not recommended)
      </button>
    </Card>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-muted-foreground">
      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-glow" /> {children}
    </div>
  );
}

/* ----------------- Recovery Phrase Confirmation ----------------- */

const PHRASE = ["sapphire", "orbit", "falcon", "lunar", "harbor", "matrix", "pixel", "ember", "north", "quantum", "zenith", "rivet"];

function RecoveryConfirmScreen({ go }: { go: (s: Step) => void }) {
  const challenge = [3, 7, 10]; // indices to verify
  const [picks, setPicks] = useState<Record<number, string>>({});
  const options = useMemo(() => {
    const opts = [...challenge.map((i) => PHRASE[i]), "vector", "shadow", "circuit"];
    return opts.sort(() => 0.5 - Math.random());
  }, []);

  const allCorrect = challenge.every((i) => picks[i] === PHRASE[i]);

  return (
    <Card>
      <BackBtn onClick={() => go("recoveryKit")} />
      <Title eyebrow="Verify recovery phrase" title="Confirm you saved it" sub="Tap the words from your recovery phrase in the right slots." />

      <div className="grid grid-cols-3 gap-2 mb-6">
        {PHRASE.map((w, i) => (
          <div key={i} className={`relative rounded-xl border p-3 ${challenge.includes(i) ? "border-primary/60 bg-primary/10" : "border-border bg-surface-1/60"}`}>
            <div className="text-[10px] text-muted-foreground">{i + 1}</div>
            <div className="text-sm font-medium mt-0.5">
              {challenge.includes(i) ? (picks[i] || <span className="text-muted-foreground/70">— select —</span>) : w}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {options.map((w) => {
          const used = Object.values(picks).includes(w);
          return (
            <button
              key={w}
              disabled={used}
              onClick={() => {
                const slot = challenge.find((i) => !picks[i]);
                if (slot != null) setPicks({ ...picks, [slot]: w });
              }}
              className={`px-3.5 h-9 rounded-lg border text-xs font-medium transition-all
                ${used ? "border-border/40 bg-surface-1/40 text-muted-foreground/50" : "border-border bg-secondary/50 hover:border-primary/60 hover:bg-primary/10"}`}
            >{w}</button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setPicks({})} className="px-4 h-12 rounded-xl border border-border bg-secondary/40 text-sm font-medium hover:bg-secondary">Reset</button>
        <PrimaryButton disabled={!allCorrect} onClick={() => go("biometric")}>
          {allCorrect ? <><Check className="h-4 w-4" /> Confirmed</> : "Confirm phrase"}
        </PrimaryButton>
      </div>
    </Card>
  );
}

/* ----------------- Biometric ----------------- */

function BiometricScreen({ go }: { go: (s: Step) => void }) {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const start = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setDone(true); }, 1800);
  };
  return (
    <Card>
      <BackBtn onClick={() => go("recoveryConfirm")} />
      <Title eyebrow="Biometric setup" title="You are the password" sub="Unlock instantly with Face ID, fingerprint, or a passkey." />

      <div className="relative mx-auto h-44 w-44 mb-6">
        <div className="absolute inset-0 rounded-full border border-primary/30" />
        <div className="absolute inset-3 rounded-full border border-primary/20" />
        <div className={`absolute inset-6 rounded-full bg-gradient-primary/20 flex items-center justify-center ${scanning ? "animate-pulse-glow" : ""}`}>
          {done ? <Check className="h-14 w-14 text-success" /> : <ScanFace className="h-14 w-14 text-primary-glow" />}
        </div>
        {scanning && (
          <div className="absolute inset-6 rounded-full overflow-hidden">
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary-glow to-transparent animate-scan" />
          </div>
        )}
      </div>

      <div className="grid gap-2 mb-6">
        <BioOption icon={ScanFace} label="Face ID" sub="Recommended on this Mac" active />
        <BioOption icon={Fingerprint} label="Touch ID" sub="Use registered fingerprints" />
        <BioOption icon={KeyRound} label="Hardware passkey" sub="YubiKey, Titan, or platform key" />
      </div>

      {!done ? (
        <PrimaryButton onClick={start} loading={scanning}>
          {scanning ? "Scanning…" : <><ScanFace className="h-4 w-4" /> Enable Face ID</>}
        </PrimaryButton>
      ) : (
        <PrimaryButton onClick={() => go("device")}>Continue <ArrowRight className="h-4 w-4" /></PrimaryButton>
      )}
      <button onClick={() => go("device")} className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground">
        Skip — set up later
      </button>
    </Card>
  );
}

function BioOption({ icon: Icon, label, sub, active }: { icon: React.ElementType; label: string; sub: string; active?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${active ? "border-primary/60 bg-primary/10" : "border-border bg-surface-1/60"}`}>
      <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center"><Icon className="h-4 w-4 text-primary-glow" /></div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      {active && <span className="text-[10px] uppercase tracking-wider text-primary-glow">Active</span>}
    </div>
  );
}

/* ----------------- Device Trust ----------------- */

function DeviceScreen({ go }: { go: (s: Step) => void }) {
  const [trusted, setTrusted] = useState(true);
  return (
    <Card>
      <BackBtn onClick={() => go("biometric")} />
      <Title eyebrow="Device trust" title="Trust this device?" sub="We'll skip 2FA on this device for the next 30 days." />

      <div className="relative rounded-2xl border border-border bg-surface-1/60 p-5 mb-5 overflow-hidden">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Laptop className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">MacBook Pro · Chrome 132</div>
            <div className="text-xs text-muted-foreground">macOS 15.2 Sequoia · This device</div>
          </div>
          <span className="px-2 py-1 rounded-md bg-success/15 text-success text-[10px] uppercase tracking-wider">Verified</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
          <DeviceRow icon={MapPin} label="Location" value="San Francisco, US" />
          <DeviceRow icon={Clock} label="Last activity" value="Just now" />
          <DeviceRow icon={ShieldCheck} label="Encryption" value="AES-256-GCM" />
          <DeviceRow icon={Smartphone} label="IP" value="73.42.•••.••" />
        </div>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-border bg-surface-1/60 p-4 cursor-pointer mb-6">
        <div>
          <div className="text-sm font-medium">Trust this device for 30 days</div>
          <div className="text-xs text-muted-foreground">Skip OTP on subsequent logins</div>
        </div>
        <button
          onClick={() => setTrusted(!trusted)}
          className={`relative h-6 w-11 rounded-full transition-colors ${trusted ? "bg-gradient-primary" : "bg-border"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-all ${trusted ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </label>

      <PrimaryButton onClick={() => go("workspace")}>Continue <ArrowRight className="h-4 w-4" /></PrimaryButton>
    </Card>
  );
}

function DeviceRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-background/40 border border-border/50 p-2.5">
      <Icon className="h-3.5 w-3.5 text-primary-glow" />
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xs font-medium">{value}</div>
      </div>
    </div>
  );
}

/* ----------------- Workspace ----------------- */

function WorkspaceScreen({ company, go }: { company: string; go: (s: Step) => void }) {
  const [name, setName] = useState(company || "Atlas Labs");
  const [invites, setInvites] = useState<{ email: string; role: string }[]>([
    { email: "kira@atlas.dev", role: "Admin" },
    { email: "marco@atlas.dev", role: "Member" },
  ]);
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.includes("@")) return;
    setInvites([...invites, { email: draft, role: "Member" }]);
    setDraft("");
  };
  return (
    <Card>
      <BackBtn onClick={() => go("device")} />
      <Title eyebrow="Workspace" title="Set up your team vault" sub="Securely share credentials with role-based access." />

      <Field icon={Users} label="Workspace name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <div className="mt-5">
        <div className="text-xs font-medium text-muted-foreground mb-2">Invite teammates</div>
        <div className="flex gap-2">
          <Input placeholder="teammate@company.com" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
          <button onClick={add} className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground inline-flex items-center justify-center shadow-glow shrink-0">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {invites.map((m, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface-1/60 p-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                {m.email[0].toUpperCase()}
              </div>
              <div className="flex-1 text-sm">{m.email}</div>
              <select
                value={m.role}
                onChange={(e) => setInvites(invites.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                className="bg-input border border-border rounded-lg px-2 py-1 text-xs"
              >
                <option>Admin</option><option>Member</option><option>Viewer</option>
              </select>
              <button onClick={() => setInvites(invites.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        {[
          { v: "256-bit", l: "Encryption" },
          { v: "SOC 2", l: "Compliant" },
          { v: "Zero", l: "Knowledge" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-border bg-surface-1/60 p-3">
            <div className="text-sm font-semibold text-gradient">{s.v}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <PrimaryButton onClick={() => go("welcome")}>Send invites & finish</PrimaryButton>
        <button onClick={() => go("welcome")} className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground">
          Skip — I'll invite later
        </button>
      </div>
    </Card>
  );
}

/* ----------------- Welcome ----------------- */

function WelcomeScreen({ name, go }: { name: string; go: (s: Step) => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center py-2">
        <div className="relative h-32 w-32 mb-6">
          <div className="absolute inset-0 rounded-full border border-primary/30 animate-spin-slow" />
          <div className="absolute inset-3 rounded-full border border-primary/20 animate-spin-slow" style={{ animationDirection: "reverse" }} />
          <div className="absolute inset-6 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow animate-float">
            <ShieldCheck className="h-12 w-12 text-primary-foreground" />
          </div>
          <div className="absolute -inset-2 rounded-full animate-pulse-glow" />
        </div>

        <div className="text-[10px] uppercase tracking-[0.3em] text-primary-glow mb-2">Vault unlocked</div>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome, {name}.</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Your encrypted vault is live. Let's add your first credentials and bring the rest of your digital life into NovaSafe.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2 w-full">
          {[
            { v: "92", l: "Security score" },
            { v: "0", l: "Compromised" },
            { v: "1", l: "Trusted device" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-surface-1/60 p-3">
              <div className="text-xl font-semibold text-gradient">{s.v}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 w-full">
          <PrimaryButton onClick={() => go("login")}>
            <Sparkles className="h-4 w-4" /> Start exploring vault
          </PrimaryButton>
          <button onClick={() => go("login")} className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground">
            Take the 60-second tour
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ----------------- Flow Map (jump between screens for demo) ----------------- */

const ALL: { id: Step; label: string }[] = [
  { id: "login", label: "Login" },
  { id: "signup", label: "Sign up" },
  { id: "password", label: "Password" },
  { id: "otp", label: "OTP" },
  { id: "recoveryKit", label: "Recovery kit" },
  { id: "recoveryConfirm", label: "Phrase" },
  { id: "biometric", label: "Biometric" },
  { id: "device", label: "Device" },
  { id: "workspace", label: "Workspace" },
  { id: "welcome", label: "Welcome" },
  { id: "forgot", label: "Forgot" },
  { id: "resetSuccess", label: "Reset ✓" },
];

function FlowMap({ step, go }: { step: Step; go: (s: Step) => void }) {
  return (
    <div className="mt-6 rounded-2xl border border-border/60 bg-surface-1/40 p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 px-1">Flow preview · jump to any screen</div>
      <div className="flex flex-wrap gap-1.5">
        {ALL.map((s) => (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            className={`px-2.5 h-7 rounded-md text-[11px] font-medium transition-all border
              ${step === s.id
                ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                : "bg-secondary/40 border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"}`}
          >{s.label}</button>
        ))}
      </div>
    </div>
  );
}
