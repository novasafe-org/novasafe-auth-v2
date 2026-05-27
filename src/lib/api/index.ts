export { ApiError, apiFetch } from "./http";
export type { RequestOptions, ApiErrorBody } from "./http";

export { authApi } from "./endpoints/auth";
export type {
  AuthApi,
  AuthUser,
  LoginPayload,
  LoginResponse,
  GoogleSignInPayload,
  GoogleOauthIntent,
  ValidateSessionResponse,
  SubscriptionBlockedResponse,
  VerifyOtpPayload,
  DeviceContext,
} from "./endpoints/auth";

export { onboardingApi } from "./endpoints/onboarding";
export type {
  OnboardingApi,
  CheckEmailResponse,
  SendOtpResponse,
  VerifyOtpResponse,
  CreateAccountPayload,
  CreateAccountResponse,
} from "./endpoints/onboarding";

export { subscriptionsApi } from "./endpoints/subscriptions";
export type {
  SubscriptionsApi,
  SubscriptionState,
  SubscriptionEnvelope,
  SubscriptionEntitlements,
  SubscriptionLimits,
  SubscriptionOfferings,
  SubscriptionOffering,
  SubscriptionOfferingPackage,
  PlanTier,
  SubscriptionLifecycleStatus,
} from "./endpoints/subscriptions";
