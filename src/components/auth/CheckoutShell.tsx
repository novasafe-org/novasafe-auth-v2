import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { NovaLogo, ThemeToggle } from "@/components/novasafe/visuals";

/**
 * Checkout layout for authenticated upgrade flows (`/pro`).
 * Wide centered container — no marketing split-screen.
 */
export interface CheckoutShellProps {
  children: ReactNode;
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
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between gap-3">
          <NovaLogo compact />
          <ThemeToggle />
        </header>

        {backHref ? (
          <a
            href={backHref}
            className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition hover:text-foreground w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </a>
        ) : null}

        <main className="flex-1 pb-10">
          <div className="w-full anim-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
