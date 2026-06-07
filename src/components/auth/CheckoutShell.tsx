import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { NovaLogo, ThemeToggle } from "@/components/novasafe/visuals";

/**
 * Centered checkout layout for authenticated upgrade flows.
 * No split-screen marketing panel — user already knows NovaSafe.
 */
export interface CheckoutShellProps {
  children: ReactNode;
  /** Optional back link (e.g. return to app billing). */
  backHref?: string;
  backLabel?: string;
}

export function CheckoutShell({
  children,
  backHref,
  backLabel = "Back to billing",
}: CheckoutShellProps) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-6 sm:px-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <NovaLogo compact />
          <ThemeToggle />
        </header>

        {backHref ? (
          <a
            href={backHref}
            className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition hover:text-foreground w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </a>
        ) : null}

        <main className="flex flex-1 flex-col justify-center pb-8">
          <div className="w-full anim-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
