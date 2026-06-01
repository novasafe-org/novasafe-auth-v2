/** sessionStorage key — extension callback URL with token fragment (same-origin, cleared immediately). */
export const EXTENSION_PAIRING_REDIRECT_KEY = "novasafe.extension.pairingRedirect";

export { EXTENSION_PAIRING_CONTEXT_KEY } from "./extension-pairing-context";

const pairingDebugEnabled = (): boolean => {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) return true;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") return true;
  const flag =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_EXTENSION_PAIRING_DEBUG) ||
    (typeof process !== "undefined" && process.env?.VITE_EXTENSION_PAIRING_DEBUG);
  return flag === "true" || flag === "1";
};

export const extensionPairingLog = (label: string, detail?: unknown): void => {
  if (!pairingDebugEnabled()) return;
  if (detail === undefined) {
    console.debug(`[NovaSafe Pairing] ${label}`);
    return;
  }
  console.debug(`[NovaSafe Pairing] ${label}`, detail);
};
