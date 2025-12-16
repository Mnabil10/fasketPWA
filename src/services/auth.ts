import { api } from "../api/client";
import type { UserProfile } from "../types/api";

export type LoginBody = {
  /** Backend expects identifier=phone|email (E.164 for phone) */
  identifier?: string;
  /** Legacy alias kept for compatibility with existing form wiring */
  phoneOrEmail?: string;
  password: string;
  otp?: string;
};

export type RegisterBody = {
  name: string;
  phone: string;
  email?: string;
  password: string;
};

export type AuthResponse = {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export type SignupStartResponse = { otpId: string; expiresInSeconds?: number; phone?: string };
export type OtpRequestResponse = { otpId: string; expiresInSeconds?: number; channel?: string; requestId?: string };
export type SignupSessionStartResponse = {
  signupSessionToken: string;
  signupSessionId: string;
  expiresInSeconds?: number;
  next?: { requiresTelegramLink?: boolean; telegramOnly?: boolean };
};
export type SignupLinkTokenResponse = { linkToken: string; telegramLinkToken: string; deeplink: string; expiresInSeconds?: number };
export type SignupLinkStatusResponse = { linked: boolean; telegramChatIdMasked?: string };
export type SignupOtpResponse = { channel?: string; expiresInSeconds?: number; requestId?: string };
export type SignupVerifyResponse = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresInSeconds?: number;
  user?: UserProfile | null;
};

function ensureSuccess<T extends Record<string, any>>(payload: T): T {
  if (payload && typeof payload === "object" && (payload as any).success === false) {
    const message = (payload as any).message || (payload as any).error || "Request failed";
    const err: any = new Error(message);
    err.code = (payload as any).error;
    throw err;
  }
  return payload;
}

export async function authLogin(body: LoginBody): Promise<AuthResponse> {
  const identifier = (body.identifier || body.phoneOrEmail || "").trim();
  if (!identifier) {
    throw new Error("identifier is required");
  }

  const { data } = await api.post(
    "/auth/login",
    {
      identifier,
      password: body.password,
      otp: body.otp || undefined,
    },
    { skipAuth: true }
  );
  return normalizeAuthResponse(data);
}

export async function logout(payload?: { deviceToken?: string; refreshToken?: string }) {
  const refreshToken = payload?.refreshToken;
  await api.post(
    "/auth/logout",
    payload?.deviceToken ? { deviceToken: payload.deviceToken } : {},
    {
      headers: refreshToken
        ? {
            Authorization: `Bearer ${refreshToken}`,
            "x-refresh-token": refreshToken,
          }
        : undefined,
    }
  );
}

export async function authSignupStart(body: RegisterBody): Promise<SignupStartResponse> {
  const trimmedEmail = body.email?.trim();
  const { data } = await api.post(
    "/auth/signup/start",
    {
      name: body.name,
      phone: body.phone,
      email: trimmedEmail || undefined,
      password: body.password,
    },
    { skipAuth: true }
  );
  return {
    otpId: (data as any)?.otpId ?? (data as any)?.otp_id ?? "",
    expiresInSeconds: (data as any)?.expiresInSeconds,
    phone: body.phone,
  };
}

export async function authSignupStartSession(body: {
  fullName: string;
  phone: string;
  country: string;
}): Promise<SignupSessionStartResponse> {
  const { data } = await api.post(
    "/auth/signup/start-session",
    {
      phone: body.phone,
      country: body.country,
      fullName: body.fullName,
    },
    { skipAuth: true }
  );
  ensureSuccess(data as any);
  return {
    signupSessionToken: (data as any)?.signupSessionToken ?? (data as any)?.signup_session_token ?? "",
    signupSessionId:
      (data as any)?.signupSessionId ?? (data as any)?.signup_session_id ?? (data as any)?.signupSessionID ?? "",
    expiresInSeconds: (data as any)?.expiresInSeconds,
    next: (data as any)?.next,
  };
}

export async function signupTelegramLinkToken(payload: {
  signupSessionId: string;
  signupSessionToken?: string;
}): Promise<SignupLinkTokenResponse> {
  const { data } = await api.post(
    "/auth/signup/telegram/link-token",
    { signupSessionId: payload.signupSessionId, signupSessionToken: payload.signupSessionToken },
    { skipAuth: true }
  );
  ensureSuccess(data as any);
  return {
    linkToken: (data as any)?.linkToken ?? (data as any)?.telegramLinkToken ?? "",
    telegramLinkToken: (data as any)?.telegramLinkToken ?? (data as any)?.linkToken ?? "",
    deeplink: (data as any)?.deeplink ?? "",
    expiresInSeconds: (data as any)?.expiresInSeconds,
  };
}

export async function signupTelegramLinkStatus(ref: {
  signupSessionId: string;
  signupSessionToken?: string;
}): Promise<SignupLinkStatusResponse> {
  const { data } = await api.get("/auth/signup/telegram/link-status", {
    params: { signupSessionId: ref.signupSessionId, signupSessionToken: ref.signupSessionToken },
    skipAuth: true,
  });
  ensureSuccess(data as any);
  return {
    linked: Boolean((data as any)?.linked),
    telegramChatIdMasked: (data as any)?.telegramChatIdMasked ?? (data as any)?.telegram_chat_id_masked,
  };
}

export async function signupRequestOtp(payload: { signupSessionId: string; signupSessionToken?: string }): Promise<SignupOtpResponse> {
  const { data } = await api.post(
    "/auth/signup/request-otp",
    { signupSessionId: payload.signupSessionId, signupSessionToken: payload.signupSessionToken },
    { skipAuth: true }
  );
  ensureSuccess(data as any);
  return {
    channel: (data as any)?.channel ?? "telegram",
    expiresInSeconds: (data as any)?.expiresInSeconds,
    requestId: (data as any)?.requestId,
  };
}

export async function authSignupVerifySession(payload: {
  signupSessionToken?: string;
  signupSessionId: string;
  otp: string;
}): Promise<SignupVerifyResponse> {
  const { data } = await api.post(
    "/auth/signup/verify-session",
    { signupSessionId: payload.signupSessionId, signupSessionToken: payload.signupSessionToken, otp: payload.otp },
    { skipAuth: true }
  );
  ensureSuccess(data as any);
  return {
    accessToken: (data as any)?.accessToken ?? (data as any)?.access_token ?? null,
    refreshToken: (data as any)?.refreshToken ?? (data as any)?.refresh_token ?? null,
    expiresInSeconds: (data as any)?.expiresInSeconds,
    user: (data as any)?.user ?? null,
  };
}

export async function authSignupVerify(payload: { otpId: string; otp: string }): Promise<AuthResponse> {
  const { data } = await api.post(
    "/auth/signup/verify",
    { otpId: payload.otpId, otp: payload.otp },
    { skipAuth: true }
  );
  return normalizeAuthResponse(data);
}

export async function resendPhoneVerification(phone: string): Promise<OtpRequestResponse> {
  const normalized = phone.trim();
  if (!normalized) throw new Error("phone is required");
  return requestOtp({ phone: normalized, purpose: "LOGIN" });
}

export async function verifyPhone(payload: { phone: string; otpId?: string; otp: string }) {
  const normalized = payload.phone.trim();
  const { data } = await api.post(
    "/auth/verify-otp",
    { phone: normalized, otpId: payload.otpId, otp: payload.otp, purpose: "LOGIN" },
    { skipAuth: true }
  );
  return normalizeAuthResponse(data);
}

export async function passwordResetRequest(identifier: string) {
  const normalized = identifier.trim();
  if (!normalized) throw new Error("identifier is required");
  const { data } = await api.post("/auth/password-reset/request", { identifier: normalized }, { skipAuth: true });
  return { otpId: (data as any)?.otpId ?? (data as any)?.otp_id ?? "" };
}

export async function passwordResetConfirm(body: { otpId: string; otp: string; newPassword: string }) {
  const { data } = await api.post(
    "/auth/password-reset/confirm",
    { otpId: body.otpId, otp: body.otp, newPassword: body.newPassword },
    { skipAuth: true }
  );
  return normalizeAuthResponse(data);
}

export async function authRefresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { data } = await api.post(
    "/auth/refresh",
    { refreshToken },
    {
      headers: { Authorization: `Bearer ${refreshToken}`, "x-refresh-token": refreshToken },
      skipAuth: true,
    }
  );
  const normalized = normalizeAuthResponse(data);
  return {
    accessToken: normalized.accessToken || (data?.accessToken as string) || (data?.access_token as string),
    refreshToken: normalized.refreshToken || (data?.refreshToken as string) || (data?.refresh_token as string) || refreshToken,
  };
}

function normalizeAuthResponse(payload: any): AuthResponse {
  if (!payload || typeof payload !== "object") {
    return { user: null, accessToken: null, refreshToken: null };
  }

  const layers = [payload?.data, payload];
  let user: UserProfile | null = null;
  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    if (!user && layer.user) {
      user = layer.user as UserProfile;
    }
    if (!accessToken) {
      accessToken =
        layer.accessToken ??
        layer.access_token ??
        layer.token ??
        layer?.tokens?.accessToken ??
        layer?.tokens?.access_token ??
        null;
    }
    if (!refreshToken) {
      refreshToken =
        layer.refreshToken ??
        layer.refresh_token ??
        layer?.tokens?.refreshToken ??
        layer?.tokens?.refresh_token ??
        null;
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
  };
}

export async function requestOtp(body: { phone: string; purpose?: "LOGIN" | "PASSWORD_RESET" | "SIGNUP" }): Promise<OtpRequestResponse> {
  const normalized = body.phone.trim();
  if (!normalized) throw new Error("phone is required");
  const { data } = await api.post(
    "/auth/request-otp",
    { phone: normalized, purpose: body.purpose ?? "LOGIN" },
    { skipAuth: true }
  );
  return {
    otpId: (data as any)?.otpId ?? "",
    expiresInSeconds: (data as any)?.expiresInSeconds,
    channel: (data as any)?.channel,
    requestId: (data as any)?.requestId,
  } as OtpRequestResponse;
}
