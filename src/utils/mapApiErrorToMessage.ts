import type { AxiosError } from "axios";
import type { TFunction } from "i18next";
import i18n from "../i18n";

type ApiErrorPayload = {
  success?: boolean;
  code?: string;
  message?: string;
  correlationId?: string;
  details?: Record<string, unknown>;
};

const ERROR_CODE_MAP: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "errors.authInvalidCredentials",
  AUTH_ACCOUNT_DISABLED: "errors.authAccountDisabled",
  AUTH_SESSION_EXPIRED: "auth.sessionExpired",
  ADDRESS_INVALID_ZONE: "errors.addressInvalidZone",
  ADDRESS_NOT_FOUND: "errors.addressInvalidZone",
  ADDRESS_ZONE_INACTIVE: "errors.addressZoneInactive",
  ADDRESS_ZONE_REQUIRED: "errors.addressZoneRequired",
  DELIVERY_ZONE_INACTIVE: "errors.addressZoneInactive",
  DELIVERY_ZONE_NOT_FOUND: "errors.addressInvalidZone",
  CART_EMPTY: "errors.cartEmpty",
  CART_PRODUCT_UNAVAILABLE: "errors.cartProductUnavailable",
  CART_PRODUCT_OUT_OF_STOCK: "errors.cartProductOutOfStock",
  CART_PROVIDER_UNAVAILABLE: "errors.cartProviderUnavailable",
  CART_PROVIDER_MISMATCH: "errors.cartProviderMismatch",
  CART_BRANCH_MISMATCH: "errors.cartBranchMismatch",
  CART_OPTIONS_INVALID: "errors.cartOptionsInvalid",
  DELIVERY_TERMS_NOT_ACCEPTED: "errors.deliveryTermsNotAccepted",
  CHECKOUT_ADDRESS_REQUIRED: "errors.checkoutAddressRequired",
  DELIVERY_WINDOW_REQUIRED: "errors.deliveryWindowRequired",
  DELIVERY_WINDOW_INVALID: "errors.deliveryWindowInvalid",
  COUPON_INVALID: "errors.couponInvalid",
  COUPON_EXPIRED: "errors.couponExpired",
  PAYMENT_METHOD_DISABLED: "errors.paymentMethodDisabled",
  LOYALTY_DISABLED: "errors.loyaltyDisabled",
  LOYALTY_NOT_ENOUGH_POINTS: "errors.loyaltyNotEnoughPoints",
  LOYALTY_RULE_VIOLATION: "errors.loyaltyRuleViolation",
  OTP_RATE_LIMIT: "errors.otpRateLimit",
  OTP_DAILY_LIMIT: "errors.otpDailyLimit",
  OTP_IP_LIMIT: "errors.otpIpLimit",
  OTP_INVALID: "errors.otpInvalid",
  OTP_EXPIRED: "errors.otpExpired",
  OTP_TOO_MANY_ATTEMPTS: "errors.otpTooManyAttempts",
  OTP_LOCKED: "errors.otpLocked",
  ORDER_NOT_FOUND: "errors.orderNotFound",
  ORDER_ALREADY_COMPLETED: "errors.orderInvalidState",
  ORDER_CANCEL_NOT_ALLOWED: "errors.orderCancelNotAllowed",
  ORDER_UNAUTHORIZED: "errors.orderInvalidState",
  ORDER_INVALID_STATUS_TRANSITION: "errors.orderInvalidState",
  ORDER_INVALID_STATE: "errors.orderInvalidState",
  ORDER_DRIVER_ALREADY_ASSIGNED: "errors.orderInvalidState",
  DRIVER_NOT_FOUND: "errors.driverNotFound",
  DRIVER_INACTIVE: "errors.driverInactive",
  RECEIPT_FORBIDDEN: "errors.orderInvalidState",
  VALIDATION_FAILED: "errors.validationFailed",
};

const NETWORK_ERROR_CODES = new Set(["ERR_NETWORK"]);
const DEFAULT_FALLBACK = "common.errorGeneric";
const SAFE_MESSAGE_PATTERN = /^[\w\s.,'"!?-]{1,180}$/i;

type Translator = TFunction<"translation">;

function translate(key: string, translator?: Translator) {
  const fn: Translator = translator ?? (i18n.t.bind(i18n) as Translator);
  return fn(key);
}

export type ExtractedApiError = {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  status?: number;
  requestUrl?: string;
};

export function extractApiError(error: unknown): ExtractedApiError {
  if (!error) return {};
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const data = axiosError?.response?.data;
  const nested = data && typeof (data as any).error === "object" ? (data as any).error : undefined;
  return {
    code: (nested?.code as string | undefined) ?? data?.code,
    message: (nested?.message as string | undefined) ?? data?.message,
    details: (nested?.details as Record<string, unknown> | undefined) ?? data?.details,
    status: axiosError?.response?.status,
    requestUrl: (axiosError?.config?.url as string | undefined) || "",
  };
}

export function mapApiErrorToMessage(
  error: unknown,
  fallbackKey: string = DEFAULT_FALLBACK,
  translator?: Translator
): string {
  if (!error) return translate(fallbackKey, translator);
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const { code, message, status, requestUrl = "" } = extractApiError(error);

  if (axiosError?.code === "ECONNABORTED") {
    return translate("errors.timeout", translator);
  }

  if (NETWORK_ERROR_CODES.has(axiosError?.code || "") || status === 0 || axiosError?.message === "Network Error") {
    return translate("errors.network", translator);
  }

  if (code && ERROR_CODE_MAP[code]) {
    return translate(ERROR_CODE_MAP[code], translator);
  }

  const isLoginAttempt = requestUrl.includes("/auth/login") || requestUrl.includes("auth/login");
  if (status === 401 && isLoginAttempt) {
    return translate("errors.authInvalidCredentials", translator);
  }

  if (status === 401) {
    return translate("auth.sessionExpired", translator);
  }

  if (message && typeof message === "string") {
    const keyCandidate = message.trim();
    if (keyCandidate && /^[a-z0-9._-]+$/i.test(keyCandidate) && i18n.exists(keyCandidate)) {
      return translate(keyCandidate, translator);
    }
    const knownMessageKeys: Record<string, string> = {
      "Ordering is closed right now": "errors.orderingClosed",
      "User already exists": "auth.userAlreadyExists",
    };
    if (keyCandidate && knownMessageKeys[keyCandidate]) {
      return translate(knownMessageKeys[keyCandidate], translator);
    }
    if (keyCandidate && SAFE_MESSAGE_PATTERN.test(keyCandidate)) {
      return keyCandidate;
    }
  }

  if (axiosError?.message) {
    return axiosError.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return translate(fallbackKey, translator);
}
