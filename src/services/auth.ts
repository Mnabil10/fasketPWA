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

export async function authOtpSend(phone: string) {
  const normalized = phone.trim();
  if (!normalized) throw new Error("phone is required");
  await api.post("/auth/otp/send", { phone: normalized }, { skipAuth: true });
}

export async function authOtpVerify(payload: { phone: string; otp: string }): Promise<AuthResponse> {
  if (!payload.phone?.trim() || !payload.otp?.trim()) {
    throw new Error("phone and otp are required");
  }
  const { data } = await api.post(
    "/auth/otp/verify",
    { phone: payload.phone.trim(), otp: payload.otp.trim() },
    { skipAuth: true }
  );
  return normalizeAuthResponse(data);
}

export async function forgotPassword(identifier: string) {
  const normalized = identifier.trim();
  if (!normalized) throw new Error("identifier is required");
  await api.post("/auth/forgot-password", { identifier: normalized }, { skipAuth: true });
}

export async function resetPassword(body: { identifier: string; otp: string; newPassword: string }) {
  const identifier = body.identifier?.trim();
  const otp = body.otp?.trim();
  if (!identifier || !otp || !body.newPassword) {
    throw new Error("identifier, otp and newPassword are required");
  }
  await api.post(
    "/auth/reset-password",
    { identifier, otp, newPassword: body.newPassword },
    { skipAuth: true }
  );
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
