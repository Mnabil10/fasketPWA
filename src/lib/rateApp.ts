import { Capacitor } from "@capacitor/core";
import { InAppReview } from "@capacitor-community/in-app-review";
import { openExternalUrl } from "./fasketLinks";

export type StoreUrls = {
  playStoreUrl: string;
  appStoreUrl: string;
};

function getStoreUrl(
  platform: string,
  urls: StoreUrls
): string {
  if (platform === "ios") return urls.appStoreUrl?.trim() || "";
  if (platform === "android") return urls.playStoreUrl?.trim() || "";
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad/i.test(navigator.userAgent ?? "");
  return isIOS ? urls.appStoreUrl?.trim() || "" : urls.playStoreUrl?.trim() || "";
}

export function getRateAppStoreUrl(urls: StoreUrls): string {
  const platform = Capacitor.getPlatform?.() ?? "web";
  return getStoreUrl(platform, urls);
}

export function isRateAppAvailable(urls: StoreUrls): boolean {
  const platform = Capacitor.getPlatform?.() ?? "web";
  const url = getStoreUrl(platform, urls);
  return Boolean(url);
}

export async function rateApp(urls: StoreUrls): Promise<void> {
  const platform = Capacitor.getPlatform?.() ?? "web";
  const storeUrl = getStoreUrl(platform, urls);

  if (platform === "ios" || platform === "android") {
    try {
      await InAppReview.requestReview();
    } catch {
      if (storeUrl) await openExternalUrl(storeUrl);
    }
  } else if (storeUrl) {
    await openExternalUrl(storeUrl);
  }
}
