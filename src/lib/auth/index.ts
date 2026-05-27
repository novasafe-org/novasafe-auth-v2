export type { SessionRecord, PendingOauthSession, AuthUser } from "./types";
export { deriveSessionFromLoginResponse } from "./types";

export {
  setClientSession,
  getClientSession,
  clearClientSession,
  subscribeToClientSession,
  assertBrowserSessionContext,
  type ClientSession,
} from "./session-cache";

export {
  loginAction,
  googleLoginAction,
  verifyTwoFactorAction,
  logoutAction,
  type LoginResult,
  type GoogleLoginResult,
  type LogoutResult,
} from "./server-actions";

export {
  checkSignupEmailAction,
  requestSignupOtpAction,
  completeSignupAction,
  type CheckEmailResult,
  type RequestOtpResult,
  type CompleteSignupResult,
} from "./signup-actions";

/**
 * Server-only helpers (cookie read/write/clear) live in
 * `./session.server`. They are intentionally NOT re-exported from this
 * barrel — importing them directly keeps them out of the browser bundle.
 */
