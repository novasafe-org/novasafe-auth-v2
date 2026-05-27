interface GoogleCredentialResponse {
  credential?: string;
}

interface GooglePromptMomentNotification {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
}

interface GoogleAccountsId {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: "popup" | "redirect";
  }) => void;
  prompt: (listener?: (notification: GooglePromptMomentNotification) => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

let gisScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in requires a browser environment."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ns-gsi="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Sign-In.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.nsGsi = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In."));
    document.head.appendChild(script);
  });

  return gisScriptPromise;
}

export async function requestGoogleIdToken(clientId: string): Promise<string> {
  if (!clientId.trim()) {
    throw new Error("Google Sign-In is not configured.");
  }

  await loadGoogleIdentityScript();

  const googleAccounts = window.google?.accounts?.id;
  if (!googleAccounts) {
    throw new Error("Google Sign-In is unavailable right now.");
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    googleAccounts.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      ux_mode: "popup",
      callback: (response) => {
        const token = response.credential;
        if (!token) {
          settle(() => reject(new Error("Google did not return a token.")));
          return;
        }
        settle(() => resolve(token));
      },
    });

    googleAccounts.prompt((notification) => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        settle(() => reject(new Error("Google sign-in was cancelled or blocked.")));
      }
    });

    window.setTimeout(() => {
      settle(() => reject(new Error("Google sign-in timed out. Please try again.")));
    }, 45000);
  });
}
