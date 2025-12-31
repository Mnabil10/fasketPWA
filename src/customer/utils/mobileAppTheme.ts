import type { MobileAppConfig } from "../../types/api";

const THEME_VARIABLES: Array<[keyof NonNullable<MobileAppConfig["theme"]>, string]> = [
  ["primary", "--primary"],
  ["primaryStrong", "--primary-strong"],
  ["accent", "--accent"],
  ["background", "--surface-page"],
  ["surface", "--surface-card"],
  ["surfaceMuted", "--surface-muted"],
  ["text", "--ink-900"],
  ["textStrong", "--ink-700"],
  ["textMuted", "--ink-500"],
  ["mutedForeground", "--muted-foreground"],
  ["borderStrong", "--border-strong"],
  ["borderSoft", "--border-soft"],
  ["fontBase", "--font-base"],
  ["fontArabic", "--font-ar"],
];

const EXTRA_VARIABLES: Array<[keyof NonNullable<MobileAppConfig["theme"]>, string]> = [
  ["heroGradient", "--hero-gradient"],
  ["splashGradient", "--splash-gradient"],
];

export function applyMobileAppTheme(config?: MobileAppConfig | null) {
  if (typeof document === "undefined") return;
  const theme = config?.theme;
  if (!theme || typeof theme !== "object") return;
  const root = document.documentElement;

  THEME_VARIABLES.forEach(([key, cssVar]) => {
    const value = theme[key];
    if (typeof value === "string" && value.trim()) {
      root.style.setProperty(cssVar, value.trim());
    }
  });

  EXTRA_VARIABLES.forEach(([key, cssVar]) => {
    const value = theme[key];
    if (typeof value === "string" && value.trim()) {
      root.style.setProperty(cssVar, value.trim());
    }
  });
}
