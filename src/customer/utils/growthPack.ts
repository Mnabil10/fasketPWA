import type { GrowthPackConfig } from "../../types/api";
import { getLocalizedString } from "./mobileAppConfig";

type SmartCtaRule = NonNullable<NonNullable<GrowthPackConfig["smartCta"]>["rules"]>[number];

type SmartCtaResolved = {
  id?: string;
  title: string;
  subtitle?: string;
  action?: SmartCtaRule["action"];
};

const DAY_MAP: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

function parseTimeToMinutes(value?: string | null) {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  const parts = cleaned.split(":");
  if (parts.length < 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function normalizeDay(value: string) {
  const key = value.trim().toLowerCase();
  if (key === "all" || key === "everyday" || key === "daily") return null;
  return DAY_MAP[key] ?? null;
}

function matchesDay(ruleDays: string[] | undefined, dayIndex: number) {
  if (!ruleDays || ruleDays.length === 0) return true;
  const normalized = ruleDays.map(normalizeDay).filter((d) => d !== null) as number[];
  if (normalized.length === 0) return true;
  return normalized.includes(dayIndex);
}

function matchesTime(rule: SmartCtaRule, nowMinutes: number) {
  const from = parseTimeToMinutes(rule.timeRange?.from);
  const to = parseTimeToMinutes(rule.timeRange?.to);
  if (from === null || to === null) return true;
  if (from <= to) {
    return nowMinutes >= from && nowMinutes <= to;
  }
  return nowMinutes >= from || nowMinutes <= to;
}

export function resolveSmartCta(
  growthPack: GrowthPackConfig | null | undefined,
  lang: "en" | "ar",
  now: Date = new Date()
): SmartCtaResolved | null {
  const config = growthPack?.smartCta;
  if (!config?.enabled) return null;
  const rules = Array.isArray(config.rules) ? config.rules : [];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dayIndex = now.getDay();
  const matched = rules.find((rule) => matchesDay(rule.days, dayIndex) && matchesTime(rule, nowMinutes));
  const fallback = config.fallback;
  const chosen = matched ?? fallback;
  if (!chosen) return null;
  return {
    id: matched?.id ?? (fallback ? "fallback" : undefined),
    title: getLocalizedString(chosen.title, lang, ""),
    subtitle: getLocalizedString(chosen.subtitle, lang, ""),
    action: chosen.action,
  };
}
