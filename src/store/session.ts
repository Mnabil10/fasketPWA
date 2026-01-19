import type { AxiosError } from "axios";
import { secureStorage } from "../lib/secureStorage";
import { authRefresh } from "../services/auth";
import type { UserProfile } from "../types/api";

export type TokenPair = { accessToken: string | null; refreshToken: string | null };
export type RefreshStatus = "ok" | "missing" | "invalid" | "error";
export type RefreshResult = { token: string | null; status: RefreshStatus };
export type SessionEndReason = "unknown" | "expired" | "logout";
type Listener = (reason: SessionEndReason) => void;

const logoutListeners = new Set<Listener>();

type SessionState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  language: "en" | "ar";
  hydrated: boolean;
};

let state: SessionState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  language: "ar",
  hydrated: false,
};

let hydrationPromise: Promise<void> | null = null;
let refreshPromise: Promise<RefreshResult> | null = null;

async function hydrateFromStorage() {
  try {
    const [accessToken, refreshToken, storedLang, localLang, storedUser] = await Promise.all([
      secureStorage.getAccessToken(),
      secureStorage.getRefreshToken(),
      secureStorage.getLanguage(),
      getCachedLanguage(),
      secureStorage.getUserProfile(),
    ]);
    const parsedUser = parseStoredUser(storedUser);
    state = {
      ...state,
      accessToken,
      refreshToken,
      user: parsedUser ?? state.user,
      language: (storedLang as SessionState["language"]) || (localLang as SessionState["language"]) || "ar",
      hydrated: true,
    };
  } catch {
    state = { ...state, accessToken: null, refreshToken: null, user: null, hydrated: true };
  }
}

async function getCachedLanguage(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("lang");
  } catch {
    return null;
  }
}

export async function ensureSessionHydrated() {
  if (state.hydrated) return state;
  if (!hydrationPromise) {
    hydrationPromise = hydrateFromStorage().finally(() => {
      hydrationPromise = null;
      state.hydrated = true;
    });
  }
  await hydrationPromise;
  return state;
}

if (typeof window !== "undefined") {
  void ensureSessionHydrated();
}

export function getSessionTokens(): TokenPair {
  return { accessToken: state.accessToken, refreshToken: state.refreshToken };
}

export function getSessionUser(): UserProfile | null {
  return state.user;
}

export function getAccessToken(): string | null {
  return state.accessToken;
}

export function getLanguage(): SessionState["language"] {
  return state.language;
}

export async function setLanguage(language: SessionState["language"]) {
  state = { ...state, language };
  await secureStorage.setLanguage(language);
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lang", language);
    }
  } catch {
    // ignore storage errors
  }
}

async function saveTokens(tokens: TokenPair) {
  state = { ...state, ...tokens };
  await Promise.all([
    secureStorage.setAccessToken(tokens.accessToken),
    secureStorage.setRefreshToken(tokens.refreshToken),
  ]);
}

export function persistSessionTokens(accessToken: string | null, refreshToken: string | null) {
  void saveTokens({ accessToken, refreshToken });
}

export async function refreshTokens(): Promise<RefreshResult> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    await ensureSessionHydrated();
    const refreshToken = state.refreshToken;
    if (!refreshToken) return { token: null, status: "missing" };
    try {
      const res = await authRefresh(refreshToken);
      if (!res?.accessToken) {
        throw new Error("refresh_missing_access_token");
      }
      await saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken || refreshToken });
      return { token: res.accessToken || null, status: "ok" };
    } catch (error) {
      const axiosError = error as AxiosError<{ code?: string }>;
      const status = (error as any)?.status ?? axiosError?.response?.status;
      const code = (error as any)?.code ?? axiosError?.response?.data?.code;
      const invalid =
        status === 401 ||
        status === 403 ||
        code === "AUTH_SESSION_EXPIRED" ||
        code === "AUTH_INVALID_CREDENTIALS";
      return { token: null, status: invalid ? "invalid" : "error" };
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function clearSessionTokens(reason: SessionEndReason = "unknown") {
  state = { ...state, accessToken: null, refreshToken: null, user: null };
  await Promise.all([secureStorage.clearTokens(), secureStorage.setUserProfile(null)]);
  logoutListeners.forEach((listener) => listener(reason));
}

export function updateUser(user: UserProfile | null) {
  state = { ...state, user };
  void secureStorage.setUserProfile(user ? JSON.stringify(user) : null);
}

export function onSessionInvalid(listener: Listener) {
  logoutListeners.add(listener);
  return () => logoutListeners.delete(listener);
}

function parseStoredUser(value: string | null): UserProfile | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return parsed as UserProfile;
    }
  } catch {
    return null;
  }
  return null;
}
