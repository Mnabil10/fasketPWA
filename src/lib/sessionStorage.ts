import { Capacitor } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const ACCESS_TOKEN_KEY = "fasket.accessToken";
const REFRESH_TOKEN_KEY = "fasket.refreshToken";

function isBrowser() {
  return typeof window !== "undefined";
}

function isNativePlatform() {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
}

async function readSecure(key: string): Promise<string | null> {
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

async function writeSecure(key: string, value: string | null): Promise<void> {
  if (!isNativePlatform()) {
    if (!isBrowser()) return;
    try {
      if (value == null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore quota errors (private browsing, etc.)
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
    // Ignore read/remove failures on native secure storage.
  }
}

export async function getAccessToken(): Promise<string | null> {
  return readSecure(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string | null): Promise<void> {
  await writeSecure(ACCESS_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return readSecure(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string | null): Promise<void> {
  await writeSecure(REFRESH_TOKEN_KEY, token);
}

export async function clearSession(): Promise<void> {
  await Promise.all([writeSecure(ACCESS_TOKEN_KEY, null), writeSecure(REFRESH_TOKEN_KEY, null)]);
}
