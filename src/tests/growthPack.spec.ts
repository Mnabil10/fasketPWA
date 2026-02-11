import { describe, it, expect } from "vitest";
import { resolveSmartCta } from "../customer/utils/growthPack";
import type { GrowthPackConfig } from "../types/api";

describe("resolveSmartCta", () => {
  it("matches overnight ranges across midnight", () => {
    const config: GrowthPackConfig = {
      smartCta: {
        enabled: true,
        rules: [
          {
            id: "overnight",
            days: ["daily"],
            timeRange: { from: "22:00", to: "02:00" },
            title: "Night CTA",
            action: { type: "OPEN_HOME_SECTIONS" },
          },
        ],
        fallback: { title: "Fallback", action: { type: "OPEN_HOME_SECTIONS" } },
      },
    };

    const late = new Date(2025, 0, 1, 23, 0);
    const early = new Date(2025, 0, 2, 1, 0);
    const lateResult = resolveSmartCta(config, "en", late);
    const earlyResult = resolveSmartCta(config, "en", early);
    expect(lateResult?.id).toBe("overnight");
    expect(earlyResult?.id).toBe("overnight");
  });

  it("falls back when no rule matches", () => {
    const config: GrowthPackConfig = {
      smartCta: {
        enabled: true,
        rules: [
          {
            id: "morning",
            days: ["daily"],
            timeRange: { from: "06:00", to: "07:00" },
            title: "Morning CTA",
            action: { type: "OPEN_HOME_SECTIONS" },
          },
        ],
        fallback: { title: "Fallback CTA", action: { type: "OPEN_HOME_SECTIONS" } },
      },
    };

    const noon = new Date(2025, 0, 1, 12, 0);
    const result = resolveSmartCta(config, "en", noon);
    expect(result?.id).toBe("fallback");
    expect(result?.title).toBe("Fallback CTA");
  });

  it("uses first matching rule for precedence", () => {
    const config: GrowthPackConfig = {
      smartCta: {
        enabled: true,
        rules: [
          {
            id: "rule-1",
            days: ["daily"],
            timeRange: { from: "00:00", to: "23:59" },
            title: "First CTA",
            action: { type: "OPEN_HOME_SECTIONS" },
          },
          {
            id: "rule-2",
            days: ["daily"],
            timeRange: { from: "00:00", to: "23:59" },
            title: "Second CTA",
            action: { type: "OPEN_HOME_SECTIONS" },
          },
        ],
        fallback: { title: "Fallback CTA", action: { type: "OPEN_HOME_SECTIONS" } },
      },
    };

    const now = new Date(2025, 0, 1, 10, 0);
    const result = resolveSmartCta(config, "en", now);
    expect(result?.id).toBe("rule-1");
    expect(result?.title).toBe("First CTA");
  });
});
