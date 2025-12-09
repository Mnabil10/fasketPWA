import { api, request } from "../api/client";
import type { AuthPayload } from "../types/api";

export type LoginBody = { phone: string; password: string };
export type RegisterBody = { name: string; phone: string; email?: string; password: string };

export type AuthResponse = {
  user: { id: string; name: string; phone: string; email?: string; role: string };
  accessToken: string;
  refreshToken: string;
};

export async function authLogin(body: LoginBody): Promise<AuthResponse> {
  const { data } = await api.post("/auth/login", body);
  return data;
}

export async function authRegister(body: RegisterBody): Promise<AuthResponse> {
  const { data } = await api.post("/auth/register", body);
  return data;
}

export async function authRefresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { data } = await api.post("/auth/refresh", null, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
  return data;
}