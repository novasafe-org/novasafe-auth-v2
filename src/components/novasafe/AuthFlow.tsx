import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Fingerprint,
  Mail,
  Lock,
  ShieldCheck,
  Smartphone,
  Download,
  KeyRound,
  Users,
  Sparkles,
  Laptop,
  MapPin,
  Clock,
  RefreshCw,
  Plus,
  X,
  ScanFace,
  Loader2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { EditorialPanel, NovaLogo, ThemeToggle } from "./visuals";
import {
  confirmPasswordResetAction,
  requestPasswordResetAction,
} from "@/lib/auth/password-reset-actions";

type Step =
  | "login"
  | "forgot"
  | "resetPassword"
  | "resetSuccess"
  | "signup"
  | "password"
  | "otp"
  | "recoveryKit"
  | "recoveryConfirm"
  | "biometric"
  | "device"
  | "workspace"
  | "welcome";

const COPY: Record<Step, { kicker: string; headline: string }> = {
  login: { kicker: "Welcome back", headline: "The vault that disappears when you don't need it." },
  forgot: {
    kicker: "Account recovery",
    headline: "Recovery, the way it should be — private and effortless.",
  },
  resetPassword: {
    kicker: "Set new password",
    headline: "Choose a new master password for your account.",
  },
  resetSuccess: { kicker: "All set", headline: "Your access is restored. Quietly and securely." },
  signup: { kicker: "Create account", headline: "A calmer place for your digital identity." },
  password: { kicker: "Sign in", headline: "Decrypted on your device. Never on our servers." },
  otp: { kicker: "Two-factor", headline: "A second factor that takes one second." },
  recoveryKit: {
    kicker: "Critical step",
    headline: "The only key that opens your vault — held only by you.",
  },
  recoveryConfirm: {
    kicker: "Verify",
    headline: "A small ritual that keeps the vault yours forever.",
  },
  biometric: { kicker: "Biometrics", headline: "You are the password. Nothing more is needed." },
  device: { kicker: "Device trust", headline: "Trust the devices you love. Question the rest." },
  workspace: { kicker: "Workspace", headline: "Share credentials without ever sharing secrets." },
  welcome: { kicker: "All set", headline: "Welcome to a quieter, safer internet." },
};

export function AuthFlow() {
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const go = (s: Step) => setStep(s);

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="w-full p-3 md:p-5 lg:p-6">
        <div className="grid lg:grid-cols-2 gap-5 h-[calc(100vh-1.5rem)] md:h-[calc(100vh-2.5rem)] lg:h-[calc(100vh-3rem)]">
          {/* Left editorial */}
          <div className="hidden lg:block">
            <EditorialPanel headline={COPY[step].headline} kicker={COPY[step].kicker} />
          </div>

          {/* Right auth panel */}
          <div className="relative flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-2 lg:px-6 pt-2">
              <div className="lg:hidden">
                <NovaLogo />
              </div>
              <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>Already have an account?</span>
                <button
                  onClick={() => go("login")}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  Sign in
                </button>
              </div>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center overflow-y-auto scrollbar-hide">
              <div className="w-full max-w-[440px] py-10 px-2 lg:px-6">
                <div key={step} className="anim-fade-up">
                  {step === "login" && <LoginScreen email={email} setEmail={setEmail} go={go} />}
                  {step === "password" && <PasswordScreen email={email} go={go} />}
                  {step === "otp" && <OtpScreen email={email} go={go} />}
                  {step === "forgot" && <ForgotScreen email={email} setEmail={setEmail} go={go} />}
                  {step === "resetPassword" && (
                    <ResetPasswordScreen email={email} go={go} />
                  )}
                  {step === "resetSuccess" && <ResetSuccess go={go} />}
                  {step === "signup" && (
                    <SignupScreen
                      email={email}
                      setEmail={setEmail}
                      name={name}
                      setName={setName}
                      company={company}
                      setCompany={setCompany}
                      go={go}
                    />
                  )}
                  {step === "recoveryKit" && <RecoveryKitScreen go={go} />}
                  {step === "recoveryConfirm" && <RecoveryConfirmScreen go={go} />}
                  {step === "biometric" && <BiometricScreen go={go} />}
                  {step === "device" && <DeviceScreen go={go} />}
                  {step === "workspace" && <WorkspaceScreen company={company} go={go} />}
                  {step === "welcome" && <WelcomeScreen name={name || "there"} go={go} />}
                </div>

                <FlowMap step={step} go={go} />

                <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                  <a className="hover:text-foreground transition" href="#">
                    Privacy
                  </a>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <a className="hover:text-foreground transition" href="#">
                    Terms
                  </a>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <a className="hover:text-foreground transition" href="#">
                    Status
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Shared UI ----------------- */

function Section({ children }: { children: React.ReactNode }) {
  return <div className="space-y-7">{children}</div>;
}

function Title({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div>
      {eyebrow && (
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
          <span className="h-1 w-1 rounded-full bg-primary" /> {eyebrow}
        </div>
      )}
      <h1 className="text-[30px] leading-[1.1] font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {sub && <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-11 rounded-[10px] bg-input border border-border px-3.5 text-[14px]
        text-foreground placeholder:text-muted-foreground/70
        outline-none transition-all
        hover:border-border-strong
        focus:border-primary focus:ring-soft focus:bg-card ${props.className ?? ""}`}
    />
  );
}

function PrimaryButton({
  children,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={`anim-shine relative w-full h-11 rounded-[10px] bg-gradient-primary text-primary-foreground
        font-medium text-[14px] shadow-cta transition-all
        hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        inline-flex items-center justify-center gap-2 ${rest.className ?? ""}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full h-11 rounded-[10px] border border-border bg-card text-[13px] font-medium text-foreground
        hover:bg-secondary hover:border-border-strong transition-all inline-flex items-center justify-center gap-2 shadow-xs ${props.className ?? ""}`}
    />
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-6 transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}

function useAsync() {
  const [loading, setLoading] = useState(false);
  const run = (cb: () => void, ms = 800) => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      cb();
    }, ms);
  };
  return { loading, run };
}

/* ----------------- Login ----------------- */

function LoginScreen({
  email,
  setEmail,
  go,
}: {
  email: string;
  setEmail: (s: string) => void;
  go: (s: Step) => void;
}) {
  const [loading, setLoading] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      go("password");
    }, 700);
  };
  return (
    <Section>
      <Title title="Sign in to NovaSafe" sub="Welcome back. Your vault is encrypted and waiting." />

      <div className="space-y-2">
        <SocialBtn icon="apple" label="Continue with Apple" />
        <SocialBtn icon="google" label="Continue with Google" />
        {/* <SocialBtn icon="passkey" label="Sign in with Passkey" /> */}
      </div>

      <Divider label="or" />

      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
            <Checkbox defaultChecked /> Remember me
          </label>
          <button
            type="button"
            onClick={() => go("forgot")}
            className="text-[12px] text-foreground hover:text-primary transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <PrimaryButton loading={loading}>
          Continue <ArrowRight className="h-4 w-4" />
        </PrimaryButton>
      </form>

      <p className="text-center text-[13px] text-muted-foreground">
        New to NovaSafe?{" "}
        <button
          onClick={() => go("signup")}
          className="text-foreground font-medium hover:text-primary transition-colors"
        >
          Create an account
        </button>
      </p>
    </Section>
  );
}

function Checkbox(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      {...props}
      className="h-4 w-4 rounded-[5px] border-border accent-[var(--primary)]"
    />
  );
}

function SocialBtn({ icon, label }: { icon: "google" | "apple" | "passkey"; label: string }) {
  const Icons: Record<string, React.ReactNode> = {
    google: (
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path
          fill="#EA4335"
          d="M12 11v3.2h4.5c-.2 1.2-1.4 3.4-4.5 3.4-2.7 0-4.9-2.2-4.9-5s2.2-5 4.9-5c1.5 0 2.6.7 3.2 1.2L17.5 7C16 5.6 14.2 5 12 5c-3.9 0-7 3.1-7 7s3.1 7 7 7c4 0 6.7-2.8 6.7-6.8 0-.5 0-.8-.1-1.2H12z"
        />
      </svg>
    ),
    apple: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.5-.1-2.8.9-3.6.9-.7 0-1.9-.9-3.1-.8-1.6 0-3 .9-3.8 2.4-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.4 1.2 0 1.6-.7 3.1-.7 1.4 0 1.8.7 3.1.7 1.3 0 2.1-1.1 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.6-3.9zM14 5.7c.6-.8 1.1-1.9 1-2.9-.9 0-2.1.6-2.7 1.3-.6.7-1.1 1.8-1 2.8 1.1.1 2.1-.5 2.7-1.2z" />
      </svg>
    ),
    passkey: <KeyRound className="h-4 w-4" />,
  };
  return (
    <button
      type="button"
      className="group w-full h-11 rounded-[10px] bg-card border border-border hover:border-border-strong hover:bg-secondary transition-all text-[13px] font-medium inline-flex items-center justify-center gap-2.5 shadow-xs"
    >
      <span className="text-foreground">{Icons[icon]}</span>
      {label}
    </button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <span>{label}</span>
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
    <Section>
      <BackBtn onClick={() => go("login")} />

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
        <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold shadow-cta">
          {(email[0] || "U").toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">Signing in as</div>
          <div className="text-[13px] font-medium truncate">{email || "you@company.com"}</div>
        </div>
        <button
          onClick={() => go("login")}
          className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
        >
          Switch
        </button>
      </div>

      <Title
        title="Enter master password"
        sub="Decrypted only on this device. Never sent to our servers."
      />

      <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-[12px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" /> Trusted device · MacBook Pro · San
        Francisco
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            go("otp");
          }, 800);
        }}
        className="space-y-4"
      >
        <Field label="Master password">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              placeholder="Enter your password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <PrimaryButton loading={loading}>
          <Lock className="h-4 w-4" /> Unlock vault
        </PrimaryButton>

        <GhostButton type="button" onClick={() => go("biometric")}>
          <Fingerprint className="h-4 w-4 text-primary" /> Use biometrics instead
        </GhostButton>

        <button
          type="button"
          onClick={() => go("forgot")}
          className="block w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Forgot master password?
        </button>
      </form>
    </Section>
  );
}

/* ----------------- OTP ----------------- */

function OtpScreen({ email, go }: { email: string; go: (s: Step) => void }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [timer, setTimer] = useState(30);
  const [verified, setVerified] = useState(false);
  const { loading, run } = useAsync();

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const setIdx = (i: number, v: string) => {
    const ch = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = ch;
    setCode(next);
    if (ch && i < 5) refs.current[i + 1]?.focus();
    if (next.every((c) => c) && next.join("").length === 6) {
      setVerified(true);
      setTimeout(() => go("recoveryKit"), 900);
    }
  };

  return (
    <Section>
      <BackBtn onClick={() => go("password")} />
      <Title
        eyebrow="Two-factor"
        title="Verify it's you"
        sub={`We sent a 6-digit code to ${email || "your email"}.`}
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

      <div className="flex gap-2 justify-between">
        {code.map((c, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={c}
            onChange={(e) => setIdx(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !c && i > 0) refs.current[i - 1]?.focus();
            }}
            inputMode="numeric"
            maxLength={1}
            className={`h-14 w-12 rounded-xl border text-center text-[20px] font-semibold transition-all bg-input
              ${verified ? "border-success bg-success/10 text-success" : c ? "border-primary text-foreground ring-soft bg-card" : "border-border text-foreground"}
              outline-none focus:border-primary focus:ring-soft focus:bg-card`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>Didn't receive a code?</span>
        {timer > 0 ? (
          <span>Resend in 0:{timer.toString().padStart(2, "0")}</span>
        ) : (
          <button
            onClick={() => setTimer(30)}
            className="text-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Resend code
          </button>
        )}
      </div>

      <PrimaryButton
        loading={loading}
        onClick={() =>
          run(() => {
            setVerified(true);
            setTimeout(() => go("recoveryKit"), 400);
          }, 900)
        }
        disabled={!code.every((c) => c)}
      >
        {verified ? (
          <>
            <Check className="h-4 w-4" /> Verified
          </>
        ) : loading ? (
          "Verifying…"
        ) : (
          "Verify & continue"
        )}
      </PrimaryButton>
    </Section>
  );
}

/* ----------------- Forgot / Reset ----------------- */

function ForgotScreen({
  email,
  setEmail,
  go,
}: {
  email: string;
  setEmail: (s: string) => void;
  go: (s: Step) => void;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState(0);
  return (
    <Section>
      <BackBtn onClick={() => go("login")} />
      <Title
        eyebrow="Recovery"
        title="Recover your access"
        sub="Choose a recovery method. Your vault stays encrypted throughout."
      />

      <div className="grid gap-2">
        {[
          { icon: Mail, title: "Email recovery code", desc: "Send a one-time code to your inbox" },
          { icon: KeyRound, title: "Recovery key file", desc: "Use the encrypted PDF you saved" },
          { icon: Fingerprint, title: "Passkey or biometric", desc: "Use a trusted device" },
        ].map((opt, i) => (
          <RecoveryOption
            key={opt.title}
            icon={opt.icon}
            title={opt.title}
            desc={opt.desc}
            active={method === i}
            onClick={() => setMethod(i)}
          />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (method !== 0) {
            setError("Only email recovery is available right now.");
            return;
          }
          setSent(true);
          setError(null);
          void requestPasswordResetAction({ data: { email } })
            .then((result) => {
              if (!result.success) {
                setError(result.message ?? "Could not send reset code.");
                setSent(false);
                return;
              }
              go("resetPassword");
            })
            .catch(() => {
              setError("Could not send reset code.");
              setSent(false);
            });
        }}
        className="space-y-4"
      >
        <Field label="Email on your account">
          <Input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {error && <p className="text-[12px] text-destructive">{error}</p>}
        <PrimaryButton loading={sent}>
          {sent ? "Sending code…" : "Send recovery code"}
        </PrimaryButton>
      </form>
    </Section>
  );
}

function ResetPasswordScreen({
  email,
  go,
}: {
  email: string;
  go: (s: Step) => void;
}) {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Section>
      <BackBtn onClick={() => go("forgot")} />
      <Title
        eyebrow="New password"
        title="Set a new master password"
        sub={`Enter the code sent to ${email || "your email"}.`}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (password !== confirm) {
            setError("Passwords do not match.");
            return;
          }
          setLoading(true);
          setError(null);
          void confirmPasswordResetAction({
            data: { email, otp, newPassword: password },
          })
            .then((result) => {
              if (!result.success) {
                setError(result.message ?? "Could not reset password.");
                setLoading(false);
                return;
              }
              go("resetSuccess");
            })
            .catch(() => {
              setError("Could not reset password.");
              setLoading(false);
            });
        }}
        className="space-y-4"
      >
        <Field label="Recovery code">
          <Input
            required
            inputMode="numeric"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        </Field>
        <Field label="New password">
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        {error && <p className="text-[12px] text-destructive">{error}</p>}
        <PrimaryButton loading={loading}>Update password</PrimaryButton>
      </form>
    </Section>
  );
}

function RecoveryOption({
  icon: Icon,
  title,
  desc,
  active,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition-all
      ${active ? "border-primary bg-primary-soft/40 ring-soft" : "border-border bg-card hover:border-border-strong shadow-xs"}`}
    >
      <div
        className={`h-9 w-9 rounded-xl flex items-center justify-center ${active ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-medium text-foreground">{title}</div>
        <div className="text-[12px] text-muted-foreground">{desc}</div>
      </div>
      {active && <Check className="h-4 w-4 text-primary" />}
    </button>
  );
}

function ResetSuccess({ go }: { go: (s: Step) => void }) {
  const { loading, run } = useAsync();
  return (
    <Section>
      <div className="flex flex-col items-center text-center pt-4">
        <div className="relative h-20 w-20 mb-6">
          <div className="absolute inset-0 rounded-full bg-success/15" />
          <div className="absolute inset-2 rounded-full bg-success flex items-center justify-center">
            <Check className="h-9 w-9 text-success-foreground" strokeWidth={3} />
          </div>
        </div>
        <Title
          eyebrow="Reset complete"
          title="You're all set"
          sub="Your master password has been securely updated. Sessions on other devices were signed out."
        />
        <div className="mt-6 w-full">
          <PrimaryButton loading={loading} onClick={() => run(() => go("login"), 600)}>
            {loading ? "Redirecting…" : "Continue to sign in"}
          </PrimaryButton>
        </div>
      </div>
    </Section>
  );
}

/* ----------------- Signup ----------------- */

function SignupScreen({
  email,
  setEmail,
  name,
  setName,
  company,
  setCompany,
  go,
}: {
  email: string;
  setEmail: (s: string) => void;
  name: string;
  setName: (s: string) => void;
  company: string;
  setCompany: (s: string) => void;
  go: (s: Step) => void;
}) {
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const steps = ["Identity", "Security", "Workspace"];
  const { loading, run } = useAsync();

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
    <Section>
      <BackBtn onClick={() => (step === 0 ? go("login") : setStep(step - 1))} />
      <Title
        eyebrow={`Step ${step + 1} of 3`}
        title="Create your vault"
        sub="Two minutes to a calmer, safer life online."
      />

      {/* Stepper */}
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className={`h-[3px] rounded-full transition-all ${i <= step ? "bg-gradient-primary" : "bg-border"}`}
            />
            <div
              className={`mt-2 text-[11px] ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
              {s}
            </div>
          </div>
        ))}
      </div>

      {step === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => setStep(1), 600);
          }}
          className="space-y-4"
        >
          <Field label="Full name">
            <Input
              required
              placeholder="Ada Lovelace"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              required
              placeholder="ada@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <PrimaryButton loading={loading}>
            {loading ? (
              "Checking…"
            ) : (
              <>
                Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </PrimaryButton>
        </form>
      )}

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => setStep(2), 700);
          }}
          className="space-y-4"
        >
          <Field
            label="Master password"
            // hint={
            //   <span className="inline-flex items-center gap-1">
            //     <Sparkles className="h-3 w-3" /> AI-evaluated
            //   </span>
            // }
          >
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                required
                minLength={8}
                placeholder="At least 12 characters"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <div>
            <div className="flex gap-1 mb-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-[3px] flex-1 rounded-full transition-all ${
                    i < strength
                      ? strength <= 2
                        ? "bg-destructive"
                        : strength <= 3
                          ? "bg-yellow-500"
                          : "bg-success"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
            <div className="text-[12px] text-muted-foreground">
              {pwd
                ? ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"][strength]
                : "Use at least 12 characters with letters, numbers and symbols."}
            </div>
          </div>

          {breached && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[12px] text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5" /> This password has appeared in 3,847 known
              breaches. Pick another.
            </div>
          )}

          <button
            type="button"
            onClick={() => setPwd("Sapphire-Orbit-Falcon-94!")}
            className="text-[12px] text-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" /> Generate a secure passphrase
          </button>

          <PrimaryButton loading={loading} disabled={strength < 3 || breached}>
            {loading ? (
              "Securing password…"
            ) : (
              <>
                Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </PrimaryButton>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => go("otp"), 1100);
          }}
          className="space-y-4"
        >
          <Field label="Company or team (optional)">
            <Input
              placeholder="NovaSafe Inc."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </Field>
          <Field label="Team size">
            <div className="grid grid-cols-4 gap-2">
              {["Just me", "2–10", "11–50", "50+"].map((s, i) => (
                <button
                  type="button"
                  key={s}
                  className={`h-10 rounded-[10px] border text-[12px] font-medium transition-all ${i === 1 ? "border-primary bg-primary-soft text-foreground ring-soft" : "border-border bg-card hover:border-border-strong"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <div className="rounded-xl border border-border bg-secondary p-3 text-[12px] text-muted-foreground inline-flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" />
            We never see your master password or vault contents. Encryption happens on your device.
          </div>
          <PrimaryButton loading={loading}>
            {loading ? "Creating vault…" : "Create vault & verify email"}
          </PrimaryButton>
        </form>
      )}
    </Section>
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
        if (p >= 100) {
          clearInterval(i);
          setDone(true);
          setDownloading(false);
          triggerPdf();
          return 100;
        }
        return p + 4;
      });
    }, 50);
  };

  const triggerPdf = () => {
    const content = `NovaSafe Recovery Kit\n=====================\nGenerated: ${new Date().toISOString()}\n\nRecovery Key:\nA1B2-C3D4-E5F6-G7H8-J9K0-L1M2-N3P4-Q5R6\n\nKeep this kit safe. NovaSafe cannot recover your vault without it.`;
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "NovaSafe-Recovery-Kit.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Section>
      <Title
        eyebrow="Important"
        title="Your recovery kit"
        sub="Only you can decrypt your vault. If you lose your password, this kit is the only way back in."
      />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-cta">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate">NovaSafe Recovery Kit.pdf</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Encrypted · 4.2 KB</div>
          </div>
          {done && (
            <div className="h-7 w-7 rounded-full bg-success flex items-center justify-center">
              <Check className="h-4 w-4 text-success-foreground" />
            </div>
          )}
        </div>
        <div className="mt-4 font-mono text-[11px] tracking-[0.12em] text-foreground break-all bg-secondary rounded-lg p-3 border border-border">
          {downloading || done
            ? "A1B2-C3D4-E5F6-G7H8-J9K0-L1M2-N3P4-Q5R6"
            : "•••• •••• •••• •••• •••• •••• •••• ••••"}
        </div>
        {downloading && (
          <div className="mt-3">
            <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-gradient-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1.5">
              Generating encrypted bundle… {progress}%
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Bullet>Zero-knowledge — NovaSafe cannot read or recover your vault.</Bullet>
        <Bullet>Print it, store it offline, share only with your future self.</Bullet>
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
      <button
        onClick={() => go("recoveryConfirm")}
        className="block w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip for now (not recommended)
      </button>
    </Section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-[12px] text-muted-foreground">
      <Check className="h-3.5 w-3.5 mt-0.5 text-success shrink-0" /> <span>{children}</span>
    </div>
  );
}

/* ----------------- Recovery Phrase Confirmation ----------------- */

const PHRASE = [
  "sapphire",
  "orbit",
  "falcon",
  "lunar",
  "harbor",
  "matrix",
  "pixel",
  "ember",
  "north",
  "quantum",
  "zenith",
  "rivet",
];

function RecoveryConfirmScreen({ go }: { go: (s: Step) => void }) {
  const challenge = [3, 7, 10];
  const [picks, setPicks] = useState<Record<number, string>>({});
  const { loading, run } = useAsync();
  const options = useMemo(() => {
    const opts = [...challenge.map((i) => PHRASE[i]), "vector", "shadow", "circuit"];
    return opts.sort(() => 0.5 - Math.random());
  }, []);

  const allCorrect = challenge.every((i) => picks[i] === PHRASE[i]);

  return (
    <Section>
      <BackBtn onClick={() => go("recoveryKit")} />
      <Title
        eyebrow="Confirm phrase"
        title="Verify your recovery phrase"
        sub="Tap the words from your recovery phrase in the right slots."
      />

      <div className="grid grid-cols-3 gap-2">
        {PHRASE.map((w, i) => (
          <div
            key={i}
            className={`relative rounded-xl border p-3 ${challenge.includes(i) ? "border-primary bg-primary-soft/40" : "border-border bg-card"}`}
          >
            <div className="text-[10px] text-muted-foreground">{i + 1}</div>
            <div className="text-[13px] font-medium mt-0.5 text-foreground">
              {challenge.includes(i)
                ? picks[i] || <span className="text-muted-foreground/70">—</span>
                : w}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
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
              className={`px-3.5 h-9 rounded-lg border text-[12px] font-medium transition-all
                ${used ? "border-border bg-secondary text-muted-foreground/50" : "border-border bg-card hover:border-primary hover:bg-primary-soft/40 shadow-xs"}`}
            >
              {w}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setPicks({})}
          className="px-4 h-11 rounded-[10px] border border-border bg-card text-[13px] font-medium hover:bg-secondary transition-colors"
        >
          Reset
        </button>
        <PrimaryButton
          loading={loading}
          disabled={!allCorrect}
          onClick={() => run(() => go("biometric"), 700)}
        >
          {loading ? (
            "Confirming…"
          ) : allCorrect ? (
            <>
              <Check className="h-4 w-4" /> Confirmed
            </>
          ) : (
            "Confirm phrase"
          )}
        </PrimaryButton>
      </div>
    </Section>
  );
}

/* ----------------- Biometric ----------------- */

function BiometricScreen({ go }: { go: (s: Step) => void }) {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const { loading: continuing, run } = useAsync();
  const start = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setDone(true);
    }, 1500);
  };
  return (
    <Section>
      <BackBtn onClick={() => go("recoveryConfirm")} />
      <Title
        eyebrow="Biometrics"
        title="You are the password"
        sub="Unlock instantly with Face ID, fingerprint or a passkey."
      />

      <div className="relative mx-auto h-36 w-36">
        <div className="absolute inset-0 rounded-full border border-border" />
        <div className="absolute inset-3 rounded-full border border-border" />
        <div
          className={`absolute inset-6 rounded-full bg-primary-soft flex items-center justify-center transition-all ${scanning ? "ring-soft" : ""}`}
        >
          {done ? (
            <Check className="h-12 w-12 text-success" strokeWidth={2.5} />
          ) : (
            <ScanFace className="h-12 w-12 text-primary" strokeWidth={1.5} />
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <BioOption icon={ScanFace} label="Face ID" sub="Recommended on this Mac" active />
        <BioOption icon={Fingerprint} label="Touch ID" sub="Use registered fingerprints" />
        <BioOption icon={KeyRound} label="Hardware passkey" sub="YubiKey, Titan or platform key" />
      </div>

      {!done ? (
        <PrimaryButton onClick={start} loading={scanning}>
          {scanning ? (
            "Scanning…"
          ) : (
            <>
              <ScanFace className="h-4 w-4" /> Enable Face ID
            </>
          )}
        </PrimaryButton>
      ) : (
        <PrimaryButton loading={continuing} onClick={() => run(() => go("device"), 600)}>
          {continuing ? (
            "Saving…"
          ) : (
            <>
              Continue <ArrowRight className="h-4 w-4" />
            </>
          )}
        </PrimaryButton>
      )}
      <button
        onClick={() => go("device")}
        className="block w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip — set up later
      </button>
    </Section>
  );
}

function BioOption({
  icon: Icon,
  label,
  sub,
  active,
}: {
  icon: React.ElementType;
  label: string;
  sub: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${active ? "border-primary bg-primary-soft/40 ring-soft" : "border-border bg-card shadow-xs"}`}
    >
      <div
        className={`h-9 w-9 rounded-xl flex items-center justify-center ${active ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
      {active && (
        <span className="text-[10px] uppercase tracking-[0.18em] text-primary">Active</span>
      )}
    </div>
  );
}

/* ----------------- Device Trust ----------------- */

function DeviceScreen({ go }: { go: (s: Step) => void }) {
  const [trusted, setTrusted] = useState(true);
  const { loading, run } = useAsync();
  return (
    <Section>
      <BackBtn onClick={() => go("biometric")} />
      <Title
        eyebrow="Device trust"
        title="Trust this device?"
        sub="We'll skip 2FA on this device for the next 30 days."
      />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-md">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-cta">
            <Laptop className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate">MacBook Pro · Chrome 132</div>
            <div className="text-[11px] text-muted-foreground">macOS 15.2 · This device</div>
          </div>
          <span className="px-2 py-1 rounded-md bg-success/15 text-success text-[10px] uppercase tracking-[0.18em] font-medium">
            Verified
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <DeviceRow icon={MapPin} label="Location" value="San Francisco" />
          <DeviceRow icon={Clock} label="Last activity" value="Just now" />
          <DeviceRow icon={ShieldCheck} label="Encryption" value="AES-256-GCM" />
          <DeviceRow icon={Smartphone} label="IP" value="73.42.•••.••" />
        </div>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-border bg-card p-4 cursor-pointer shadow-xs">
        <div>
          <div className="text-[13px] font-medium">Trust this device for 30 days</div>
          <div className="text-[11px] text-muted-foreground">Skip OTP on subsequent logins</div>
        </div>
        <button
          type="button"
          onClick={() => setTrusted(!trusted)}
          className={`relative h-6 w-11 rounded-full transition-colors ${trusted ? "bg-gradient-primary" : "bg-border"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition-all ${trusted ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </label>

      <PrimaryButton loading={loading} onClick={() => run(() => go("workspace"), 700)}>
        {loading ? (
          "Saving device…"
        ) : (
          <>
            Continue <ArrowRight className="h-4 w-4" />
          </>
        )}
      </PrimaryButton>
    </Section>
  );
}

function DeviceRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-secondary border border-border p-2.5">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="text-[12px] font-medium text-foreground">{value}</div>
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
  const { loading, run } = useAsync();
  const add = () => {
    if (!draft.includes("@")) return;
    setInvites([...invites, { email: draft, role: "Member" }]);
    setDraft("");
  };
  return (
    <Section>
      <BackBtn onClick={() => go("device")} />
      <Title
        eyebrow="Workspace"
        title="Set up your team vault"
        sub="Securely share credentials with role-based access."
      />

      <Field label="Workspace name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] font-medium text-foreground">Invite teammates</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="teammate@company.com"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          />
          <button
            type="button"
            onClick={add}
            className="h-11 w-11 rounded-[10px] bg-gradient-primary text-primary-foreground inline-flex items-center justify-center shadow-cta shrink-0 hover:-translate-y-[1px] transition-transform"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {invites.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 shadow-xs"
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-primary text-primary-foreground text-[12px] font-semibold flex items-center justify-center">
                {m.email[0].toUpperCase()}
              </div>
              <div className="flex-1 text-[13px] text-foreground truncate">{m.email}</div>
              <select
                value={m.role}
                onChange={(e) =>
                  setInvites(invites.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))
                }
                className="bg-secondary border border-border rounded-lg px-2 py-1 text-[11px] text-foreground"
              >
                <option>Admin</option>
                <option>Member</option>
                <option>Viewer</option>
              </select>
              <button
                onClick={() => setInvites(invites.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { v: "256-bit", l: "Encryption" },
          { v: "SOC 2", l: "Compliant" },
          { v: "Zero", l: "Knowledge" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-border bg-card p-3 shadow-xs">
            <div className="text-[13px] font-semibold text-foreground">{s.v}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
              {s.l}
            </div>
          </div>
        ))}
      </div>

      <div>
        <PrimaryButton loading={loading} onClick={() => run(() => go("welcome"), 1000)}>
          {loading ? "Sending invites…" : "Send invites & finish"}
        </PrimaryButton>
        <button
          onClick={() => go("welcome")}
          className="mt-3 block w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip — I'll invite later
        </button>
      </div>
    </Section>
  );
}

/* ----------------- Welcome ----------------- */

function WelcomeScreen({ name, go }: { name: string; go: (s: Step) => void }) {
  const { loading, run } = useAsync();
  return (
    <Section>
      <div className="flex flex-col items-center text-center">
        <div className="relative h-24 w-24 mb-6">
          <div className="absolute inset-0 rounded-full bg-primary-soft" />
          <div className="absolute inset-3 rounded-full bg-gradient-primary flex items-center justify-center shadow-cta anim-float">
            <ShieldCheck className="h-10 w-10 text-primary-foreground" strokeWidth={2} />
          </div>
        </div>

        <Title
          eyebrow="Vault unlocked"
          title={`Welcome, ${name}.`}
          sub="Your encrypted vault is live. Add your first credentials and bring the rest of your digital life into NovaSafe."
        />

        <div className="mt-7 grid grid-cols-3 gap-2 w-full">
          {[
            { v: "92", l: "Security score" },
            { v: "0", l: "Compromised" },
            { v: "1", l: "Trusted device" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-3 shadow-xs">
              <div className="text-[20px] font-semibold text-foreground">{s.v}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 w-full">
          <PrimaryButton loading={loading} onClick={() => run(() => go("login"), 800)}>
            {loading ? (
              "Opening vault…"
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Open my vault
              </>
            )}
          </PrimaryButton>
          <button
            onClick={() => go("login")}
            className="mt-3 block w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Take the 60-second tour
          </button>
        </div>
      </div>
    </Section>
  );
}

/* ----------------- Flow Map ----------------- */

const ALL: { id: Step; label: string }[] = [
  { id: "login", label: "Login" },
  { id: "signup", label: "Sign up" },
  { id: "password", label: "Password" },
  { id: "otp", label: "OTP" },
  { id: "recoveryKit", label: "Recovery" },
  { id: "recoveryConfirm", label: "Phrase" },
  { id: "biometric", label: "Biometric" },
  { id: "device", label: "Device" },
  { id: "workspace", label: "Workspace" },
  { id: "welcome", label: "Welcome" },
  { id: "forgot", label: "Forgot" },
  { id: "resetSuccess", label: "Reset" },
];

function FlowMap({ step, go }: { step: Step; go: (s: Step) => void }) {
  return (
    <div className="mt-10 rounded-2xl border border-border bg-card p-3 shadow-xs">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 px-1">
        Demo · jump to any screen
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL.map((s) => (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            className={`px-2.5 h-7 rounded-md text-[11px] font-medium transition-all border
              ${
                step === s.id
                  ? "bg-gradient-primary text-primary-foreground border-transparent shadow-cta"
                  : "bg-card border-border hover:border-border-strong text-muted-foreground hover:text-foreground"
              }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
