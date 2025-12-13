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

export async function authSignupVerify(payload: { otpId: string; otp: string }): Promise<AuthResponse> {
  const { data } = await api.post(
    "/auth/signup/verify",
    { otpId: payload.otpId, otp: payload.otp },
    { skipAuth: true }
  );
  return normalizeAuthResponse(data);
}

export async function resendPhoneVerification(phone: string) {
  const normalized = phone.trim();
  if (!normalized) throw new Error("phone is required");
  await api.post("/auth/phone-verification/resend", { phone: normalized }, { skipAuth: true });
}

export async function verifyPhone(payload: { phone: string; otpId?: string; otp: string }) {
  const normalized = payload.phone.trim();
  const { data } = await api.post(
    "/auth/phone-verification/verify",
    { phone: normalized, otpId: payload.otpId, otp: payload.otp },
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
