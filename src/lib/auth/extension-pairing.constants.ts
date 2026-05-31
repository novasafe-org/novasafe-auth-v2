/** sessionStorage key — extension callback URL with token fragment (same-origin, cleared immediately). */
export const EXTENSION_PAIRING_REDIRECT_KEY = "novasafe.extension.pairingRedirect";

export const extensionPairingLog = (label: string, detail?: unknown): void => {
  if (detail === undefined) {
    console.debug(`[NovaSafe Pairing] ${label}`);
    return;
  }
  console.debug(`[NovaSafe Pairing] ${label}`, detail);
};
