import i18n from "../i18n";

export const withLang = (params: Record<string, any> = {}, lang?: "ar"|"en") => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.append(k, String(v));
  });
  if (lang) p.set("lang", lang);
  return p.toString() ? `?${p.toString()}` : "";
};

export function getActiveLang(fallback: "ar" | "en" = "en"): "ar" | "en" {
  const current = i18n?.language;
  if (typeof current === "string") {
    return current.toLowerCase().startsWith("ar") ? "ar" : "en";
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en";
  }
  return fallback;
}
