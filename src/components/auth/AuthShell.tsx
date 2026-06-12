import type { ReactNode } from "react";
import { EditorialPanel, NovaLogo, ThemeToggle } from "@/components/novasafe/visuals";

/**
 * Full-page layout used by every auth route.
 *
 * Left half (lg+): editorial panel with kicker + headline.
 * Right half: top bar (logo + theme toggle + optional CTA) and the screen
 * card the route renders.
 *
 * Routes pass per-screen copy via `kicker` / `headline` and per-screen actions
 * via `topBarAction` (e.g. a "Create account" link on the login screen).
 */
export interface AuthShellProps {
  kicker: string;
  headline: string;
  /** Right-side primary content (the auth card). */
  children: ReactNode;
  /** Optional content rendered on the top-right of the right column. */
  topBarAction?: ReactNode;
  /** Footer links (defaults to Privacy · Terms · Status). */
  footer?: ReactNode;
}

export function AuthShell({ kicker, headline, children, topBarAction, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="w-full p-3 md:p-5 lg:p-6">
        <div className="grid lg:grid-cols-[minmax(0,8fr)_minmax(0,12fr)] gap-5 h-[calc(100vh-1.5rem)] md:h-[calc(100vh-2.5rem)] lg:h-[calc(100vh-3rem)]">
          <div className="hidden lg:block min-w-0">
            <EditorialPanel kicker={kicker} headline={headline} />
          </div>

          <div className="relative flex flex-col min-w-0">
            <div className="flex items-center justify-between px-2 lg:px-6 pt-2">
              <div className="lg:hidden">
                <NovaLogo />
              </div>
              <div className="hidden lg:block">{topBarAction}</div>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>

            <div className="flex-1 flex items-start lg:items-center justify-center overflow-y-auto scrollbar-hide">
              <div className="w-full max-w-[520px] py-8 lg:py-10 px-2 lg:px-5">
                <div className="anim-fade-up">{children}</div>

                <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                  {footer ?? (
                    <>
                      <a className="hover:text-foreground transition" href="#" rel="noopener">
                        Privacy
                      </a>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <a className="hover:text-foreground transition" href="#" rel="noopener">
                        Terms
                      </a>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <a className="hover:text-foreground transition" href="#" rel="noopener">
                        Status
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
