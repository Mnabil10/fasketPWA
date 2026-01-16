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
export type OtpRequestResponse = {
  otpId: string;
  expiresInSeconds?: number;
  channel?: string;
  requestId?: string;
  resendAfterSeconds?: number;
};

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

export async function authRegister(body: RegisterBody): Promise<AuthResponse> {
  const trimmedEmail = body.email?.trim();
  const { data } = await api.post(
    "/auth/register",
    {
      name: body.name,
      phone: body.phone,
      email: trimmedEmail || undefined,
      password: body.password,
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
    "/auth/otp/verify",
    { phone: normalized, otpId: payload.otpId, otp: payload.otp, purpose: "LOGIN" },
    { skipAuth: true }
  );
  return normalizeAuthResponse(data);
}

export async function passwordResetRequest(phone: string) {
  const normalized = phone.trim();
  if (!normalized) throw new Error("phone is required");
  const { data } = await api.post("/auth/password/forgot", { phone: normalized }, { skipAuth: true });
  const payload = (data as any)?.data ?? data;
  return {
    otpId: (payload as any)?.otpId ?? (payload as any)?.otp_id ?? "",
    expiresInSeconds: (payload as any)?.expiresInSeconds ?? (payload as any)?.expires_in_seconds,
    resendAfterSeconds: (payload as any)?.resendAfterSeconds ?? (payload as any)?.resend_after_seconds,
  };
}

export async function passwordResetConfirmOtp(body: { phone: string; otpId?: string; otp: string }) {
  const normalized = body.phone.trim();
  if (!normalized) throw new Error("phone is required");
  const { data } = await api.post(
    "/auth/password/confirm-otp",
    { phone: normalized, otpId: body.otpId, otp: body.otp },
    { skipAuth: true }
  );
  const payload = (data as any)?.data ?? data;
  return {
    resetToken: (payload as any)?.resetToken ?? (payload as any)?.reset_token ?? "",
    expiresInSeconds: (payload as any)?.expiresInSeconds ?? (payload as any)?.expires_in_seconds,
  };
}

export async function passwordResetFinalize(body: { resetToken: string; newPassword: string }) {
  const { data } = await api.post(
    "/auth/password/reset",
    { resetToken: body.resetToken, newPassword: body.newPassword },
    { skipAuth: true }
  );
  return data?.data ?? data;
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
    "/auth/otp/request",
    { phone: normalized, purpose: body.purpose ?? "LOGIN" },
    { skipAuth: true }
  );
  const payload = (data as any)?.data ?? data;
  return {
    otpId: (payload as any)?.otpId ?? "",
    expiresInSeconds: (payload as any)?.expiresInSeconds,
    channel: (payload as any)?.channel,
    requestId: (payload as any)?.requestId,
    resendAfterSeconds: (payload as any)?.resendAfterSeconds,
  } as OtpRequestResponse;
}
