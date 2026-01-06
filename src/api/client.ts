import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { clearSessionTokens, ensureSessionHydrated, getAccessToken, getLanguage, refreshTokens } from "../store/session";

declare module "axios" {
  export interface AxiosRequestConfig<D = any> {
    /** Skip attaching auth token + refresh flow for public endpoints */
    skipAuth?: boolean;
  }
  export interface InternalAxiosRequestConfig<D = any> {
    skipAuth?: boolean;
    _retry?: boolean;
    _retryCount?: number;
  }
}

const API_BASE: string = import.meta.env.VITE_API_BASE;
if (!API_BASE) {
  throw new Error("VITE_API_BASE is required");
}

export type ApiErrorPayload = {
  success?: boolean;
  code?: string;
  message?: string;
  correlationId?: string;
  details?: Record<string, unknown>;
  error?: { code?: string; message?: string; details?: any; correlationId?: string };
};

type WithRetryConfig = InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number; skipAuth?: boolean };

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  timeout: 15000,
});

const MAX_REQUEST_RETRY = 2;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function isAuthPath(url?: string) {
  if (!url) return false;
  return (
    url.startsWith("/auth/login") ||
    url.startsWith("/auth/register") ||
    url.startsWith("/auth/refresh") ||
    url.startsWith("/auth/logout") ||
    url.startsWith("/auth/forgot-password") ||
    url.startsWith("/auth/reset-password") ||
    url.startsWith("/auth/otp") ||
    url.startsWith("auth/login") ||
    url.startsWith("auth/register") ||
    url.startsWith("auth/refresh") ||
    url.startsWith("auth/logout") ||
    url.startsWith("auth/forgot-password") ||
    url.startsWith("auth/reset-password") ||
    url.startsWith("auth/otp")
  );
}

function normalizeErrorPayload(payload: unknown): ApiErrorPayload {
  const node = (payload as any) || {};
  const errorNode = typeof node.error === "object" ? node.error : {};
  const code = errorNode.code || node.code;
  const message = errorNode.message || node.message;
  const correlationId = errorNode.correlationId || node.correlationId;
  const details = errorNode.details || node.details || (node.errors ? { errors: node.errors } : undefined);

  return {
    success: false,
    code: typeof code === "string" ? code : undefined,
    message: typeof message === "string" ? message : undefined,
    correlationId: typeof correlationId === "string" ? correlationId : undefined,
    details: typeof details === "object" ? (details as Record<string, unknown>) : undefined,
  };
}

function attachErrorMetadata(error: AxiosError<ApiErrorPayload>): AxiosError<ApiErrorPayload> {
  if (error.response) {
    const normalized = normalizeErrorPayload(error.response.data);
    (error.response as any).data = normalized;
    (error as any).status = error.response.status;
    if (normalized.code) {
      (error as any).code = normalized.code;
    }
  }
  return error;
}

api.interceptors.request.use(async (config: WithRetryConfig) => {
  const headers = AxiosHeaders.from(config.headers ?? {});
  await ensureSessionHydrated();

  const lang = getLanguage();
  headers.set("Accept-Language", lang);
  headers.set("Content-Type", "application/json");

  const method = (config.method ?? "get").toString().toLowerCase();
  const url = typeof config.url === "string" ? config.url : "";
  const params = config.params as Record<string, unknown> | undefined;
  const hasLangInParams = Boolean(params && "lang" in params);
  const hasLangInUrl = /[?&]lang=/.test(url);
  if (lang && method === "get" && !hasLangInParams && !hasLangInUrl) {
    config.params = { ...(params || {}), lang };
  }

  if (!config.skipAuth && !isAuthPath(config.url)) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  config.headers = headers;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<ApiErrorPayload>) => {
    const original = (err.config || {}) as WithRetryConfig;
    const status = err?.response?.status;

    if (status === 401 && !original._retry && !original.skipAuth && !isAuthPath(original.url)) {
      original._retry = true;
      const newToken = await refreshTokens();
      if (newToken) {
        const headers = AxiosHeaders.from(original.headers ?? {});
        headers.set("Authorization", `Bearer ${newToken}`);
        original.headers = headers;
        return api.request(original);
      }
      await clearSessionTokens("expired");
    }

    const shouldRetry =
      (!status || RETRYABLE_STATUS.has(status)) && (original._retryCount || 0) < MAX_REQUEST_RETRY;
    if (shouldRetry) {
      original._retryCount = (original._retryCount || 0) + 1;
      const backoff = 300 * original._retryCount;
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return api.request(original);
    }

    throw attachErrorMetadata(err);
  }
);

export async function request<T = any>(cfg: AxiosRequestConfig) {
  const res = await api.request<T>(cfg);
  return res.data as T;
}
