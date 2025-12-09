// واحد فقط: عميل axios + hooks للتوكن + helper
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

// const API_BASE: string =
//   (window as any).__API_BASE__ ||
//   import.meta.env.VITE_API_BASE ||
//   "http://localhost:4000/api/v1";
  const API_BASE: string =
  (window as any).__API_BASE__ ||
  import.meta.env.VITE_API_BASE ||
  "https://api.fasket.cloud/api/v1";

export type TokenPair = { accessToken: string | null; refreshToken: string | null };
type TokenProvider = () => TokenPair;
type TokenUpdater = (t: TokenPair) => void;
type LogoutFn = () => void;

let getTokens: TokenProvider = () => ({ accessToken: null, refreshToken: null });
let setTokens: TokenUpdater = () => {};
let logout: LogoutFn = () => {};

export function registerAuthHooks(provider: TokenProvider, updater: TokenUpdater, onLogout: LogoutFn) {
  getTokens = provider;
  setTokens = updater;
  logout = onLogout;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

function isAuthPath(url?: string) {
  if (!url) return false;
  return url.startsWith("/auth/login") || url.startsWith("/auth/register") || url.startsWith("/auth/refresh");
}

// يضيف Authorization لكل شيء ما عدا auth
api.interceptors.request.use((config) => {
  if (!isAuthPath(config.url)) {
    const { accessToken } = getTokens();
    if (accessToken) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${accessToken}`;
    }
  }
  // دايمًا JSON
  config.headers = { "Content-Type": "application/json", ...(config.headers || {}) };
  return config;
});

// (اختياري) refresh تلقائي لو 401 على مسارات خاصّة
let refreshing = false;
let queued: ((t: string | null) => void)[] = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original: AxiosRequestConfig & { _retry?: boolean } = err.config || {};
    const status = err?.response?.status;

    if (status === 401 && !original._retry && !isAuthPath(original.url)) {
      original._retry = true;
      if (!refreshing) {
        refreshing = true;
        try {
          const { refreshToken } = getTokens();
          if (!refreshToken) throw new Error("No refresh token");
          const rr = await api.post("/auth/refresh", null, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });
          const { accessToken: newAT, refreshToken: newRT } = rr.data || {};
          setTokens({ accessToken: newAT || null, refreshToken: newRT || null });
          queued.forEach((fn) => fn(newAT || null));
        } catch (e) {
          setTokens({ accessToken: null, refreshToken: null });
          queued.forEach((fn) => fn(null));
          logout();
          throw err;
        } finally {
          queued = [];
          refreshing = false;
        }
      }
      // انتظر نتيجة الـ refresh ثم أعد المحاولة
      return new Promise((resolve, reject) => {
        queued.push((token) => {
          if (!token) return reject(err);
          original.headers = original.headers ?? {};
          (original.headers as any).Authorization = `Bearer ${token}`;
          resolve(api.request(original));
        });
      });
    }
    throw err;
  }
);

// helper اختياري
export async function request<T = any>(cfg: AxiosRequestConfig) {
  const res = await api.request<T>(cfg);
  return res.data as T;
}
