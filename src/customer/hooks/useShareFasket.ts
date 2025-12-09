import { useTranslation } from "react-i18next";
import { useToast } from "../providers/ToastProvider";
import { FASKET_CONFIG } from "../../config/fasketConfig";

export function useShareFasket() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  return async () => {
    const title = t("share.title", "Fasket - Grocery Delivery in Badr");
    const text = t("share.text", "Download Fasket and order your groceries in Badr City:");
    const url = FASKET_CONFIG.webAppUrl;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // ignore and fall through
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showToast({ type: "success", message: t("share.copied", "Link copied to clipboard") });
        return;
      }
    } catch {
      // ignore and fallback
    }

    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
}
