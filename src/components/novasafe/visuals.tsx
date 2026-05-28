import { useEffect, useState } from "react";
import {
  Shield,
  ShieldCheck,
  Fingerprint,
  KeyRound,
  Globe2,
  Sparkles,
  Lock,
  Smartphone,
  Sun,
  Moon,
  Check,
} from "lucide-react";
import { appConfig } from "@/config";

const LANDING_LOGO_URL = `${appConfig.urls.landing}/logo.svg`;

/* ---------- Logo ---------- */
export function NovaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-8 w-8 rounded-[10px] bg-gradient-primary shadow-cta flex items-center justify-center">
        <img
          src={LANDING_LOGO_URL}
          alt="NovaSafe"
          className="h-4 w-4 object-contain"
        />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight">NovaSafe</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
            Identity Vault
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Theme toggle ---------- */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("nv-theme");
    const isDark = saved ? saved === "dark" : false;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("nv-theme", next ? "dark" : "light");
    } catch {
      /* localStorage may be unavailable in privacy mode — ignore */
    }
  };
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="group inline-flex items-center gap-1 rounded-full border border-border bg-card/70 backdrop-blur px-1 py-1 text-xs shadow-xs hover:shadow-sm transition-all"
    >
      <span
        className={`h-7 w-7 rounded-full inline-flex items-center justify-center transition-all ${!dark ? "bg-secondary text-foreground shadow-xs" : "text-muted-foreground"}`}
      >
        <Sun className="h-3.5 w-3.5" />
      </span>
      <span
        className={`h-7 w-7 rounded-full inline-flex items-center justify-center transition-all ${dark ? "bg-secondary text-foreground shadow-xs" : "text-muted-foreground"}`}
      >
        <Moon className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

/* ---------- Editorial left panel ---------- */
export function EditorialPanel({ headline, kicker }: { headline: string; kicker: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] border border-border bg-gradient-soft">
      {/* ambient gradient */}
      <div className="absolute inset-0 bg-ambient opacity-90" />
      {/* dot grid */}
      <div className="absolute inset-0 dot-grid opacity-40" />
      {/* soft top highlight */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-card/50 to-transparent" />

      {/* Top bar */}
      <div className="absolute left-8 right-8 top-7 flex items-center justify-between">
        <NovaLogo />
        <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground rounded-full border border-border bg-card/60 backdrop-blur px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          End-to-end encrypted
        </div>
      </div>

      {/* Floating credential card */}
      <FloatingVaultCard />
      <FloatingActivityCard />
      <FloatingPasskeyCard />

      {/* Editorial copy */}
      <div className="absolute bottom-10 left-8 right-8 max-w-[460px]">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-4">
          {kicker}
        </div>
        <h2 className="text-[34px] leading-[1.08] font-semibold tracking-tight text-gradient">
          {headline}
        </h2>
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground max-w-md">
          A private, AI-assisted vault for every credential, passkey and identity you carry.
          Designed in the open — engineered to disappear.
        </p>

        <div className="mt-7 flex items-center gap-5 text-[11px] text-muted-foreground">
          <Stat icon={Lock} label="Zero-knowledge" />
          <span className="h-3 w-px bg-border" />
          <Stat icon={ShieldCheck} label="SOC 2 · ISO 27001" />
          <span className="h-3 w-px bg-border" />
          <Stat icon={Globe2} label="14 regions" />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

/* ---------- Floating elements ---------- */
function FloatingVaultCard() {
  return (
    <div className="absolute right-8 top-24 w-[280px] rounded-2xl border border-border bg-card shadow-lg p-4 anim-float">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[#0a66c2]/10 flex items-center justify-center">
          <span className="text-[#0a66c2] font-bold text-sm">in</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate">LinkedIn</div>
          <div className="text-[11px] text-muted-foreground truncate">ada@nova.dev</div>
        </div>
        <Check className="h-4 w-4 text-success" />
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Strong · 28 chars
        </span>
        <span>•••••••••••</span>
      </div>
    </div>
  );
}

function FloatingActivityCard() {
  return (
    <div className="absolute left-8 top-[42%] w-[260px] rounded-2xl border border-border bg-card shadow-lg p-4 anim-drift">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          This week
        </div>
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {[40, 55, 38, 72, 60, 85, 68].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-gradient-primary opacity-90"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-foreground font-medium">214 unlocks</span>
        <span className="text-success">+12%</span>
      </div>
    </div>
  );
}

function FloatingPasskeyCard() {
  return (
    <div
      className="absolute right-12 top-[52%] w-[240px] rounded-2xl border border-border bg-card shadow-lg p-4 anim-float"
      style={{ animationDelay: "1.5s" }}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary-soft flex items-center justify-center">
          <Fingerprint className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-medium">Passkey ready</div>
          <div className="text-[11px] text-muted-foreground">Touch ID · MacBook Pro</div>
        </div>
      </div>
      <button className="mt-3 w-full h-8 rounded-lg bg-gradient-primary text-primary-foreground text-[11px] font-medium shadow-cta">
        Sign in instantly
      </button>
    </div>
  );
}
