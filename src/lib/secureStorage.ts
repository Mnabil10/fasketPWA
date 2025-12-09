import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const KEYS = {
  accessToken: "fasket.accessToken",
  refreshToken: "fasket.refreshToken",
  language: "fasket.language",
};

const isBrowser = () => typeof window !== "undefined";
const isNativePlatform = () => {
  const platform = Capacitor.getPlatform?.() ?? "web";
  return platform === "ios" || platform === "android";
};

async function read(key: string): Promise<string | null> {
  if (!isNativePlatform()) {
    if (!isBrowser()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  try {
    const { value } = await SecureStoragePlugin.get({ key });
    return value ?? null;
  } catch {
    return null;
  }
}

async function write(key: string, value: string | null): Promise<void> {
  if (!isNativePlatform()) {
    if (!isBrowser()) return;
    try {
      if (value == null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Safe to ignore quota errors (private browsing, etc).
    }
    return;
  }

  try {
    if (value == null) {
      await SecureStoragePlugin.remove({ key });
    } else {
      await SecureStoragePlugin.set({ key, value });
    }
  } catch {
    // Ignore secure storage failures to avoid crashing the app.
  }
}

export const secureStorage = {
  get: read,
  set: write,
  remove: (key: string) => write(key, null),
  getAccessToken: () => read(KEYS.accessToken),
  setAccessToken: (token: string | null) => write(KEYS.accessToken, token),
  getRefreshToken: () => read(KEYS.refreshToken),
  setRefreshToken: (token: string | null) => write(KEYS.refreshToken, token),
  getLanguage: () => read(KEYS.language),
  setLanguage: (lang: string | null) => write(KEYS.language, lang),
  clearTokens: () => Promise.all([write(KEYS.accessToken, null), write(KEYS.refreshToken, null)]).then(() => undefined),
};

