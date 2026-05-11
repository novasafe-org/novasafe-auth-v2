import { Shield } from "lucide-react";

export function NovaLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
        <Shield className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
      </div>
      <div className="leading-none">
        <div className="text-[15px] font-semibold tracking-tight">NovaSafe</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">Vault OS</div>
      </div>
    </div>
  );
}

export function CinematicPanel({ tagline }: { tagline: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-surface-1 border border-border/50">
      {/* Aurora */}
      <div className="absolute inset-0 bg-aurora opacity-90" />
      {/* Grid */}
      <div className="absolute inset-0 grid-bg" />
      {/* Orbit rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-[460px] w-[460px]">
          <div className="absolute inset-0 rounded-full border border-primary/20 animate-spin-slow" />
          <div className="absolute inset-8 rounded-full border border-primary/15 animate-spin-slow" style={{ animationDirection: "reverse", animationDuration: "24s" }} />
          <div className="absolute inset-20 rounded-full border border-accent/20 animate-spin-slow" style={{ animationDuration: "30s" }} />
          {/* Vault core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-40 w-40 rounded-3xl bg-gradient-primary shadow-glow flex items-center justify-center animate-float">
              <Shield className="h-20 w-20 text-primary-foreground/90" strokeWidth={1.5} />
              <div className="absolute inset-0 rounded-3xl ring-1 ring-white/30" />
              <div className="absolute -inset-4 rounded-[2rem] border border-primary/30 animate-pulse-glow" />
            </div>
          </div>
          {/* Orbit dots */}
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-glow shadow-[0_0_12px_var(--primary-glow)]"
              style={{ transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(-230px)` }}
            />
          ))}
        </div>
      </div>
      {/* Particles */}
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary-glow/60 animate-float"
          style={{
            left: `${(i * 53) % 100}%`,
            top: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 8) * 0.4}s`,
            animationDuration: `${5 + (i % 5)}s`,
          }}
        />
      ))}
      {/* Scanline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/20 to-transparent animate-scan" />

      {/* Header */}
      <div className="absolute left-8 top-8 right-8 flex items-center justify-between">
        <NovaLogo />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          Encrypted session
        </div>
      </div>

      {/* Tagline */}
      <div className="absolute bottom-10 left-8 right-8">
        <div className="text-xs uppercase tracking-[0.3em] text-primary-glow mb-3">NovaSafe Vault OS</div>
        <h2 className="text-3xl font-semibold leading-tight max-w-md">
          <span className="text-gradient">{tagline}</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-sm">
          End-to-end encrypted. Zero-knowledge. Built for the next decade of digital identity.
        </p>
      </div>
    </div>
  );
}
