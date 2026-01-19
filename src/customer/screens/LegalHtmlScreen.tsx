import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../ui/button";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { NetworkBanner } from "../components";
import privacyHtml from "../../assets/legal/privacy_policy_ar.html?raw";
import termsHtml from "../../assets/legal/terms_ar.html?raw";

type LegalKind = "privacy" | "terms";

const LEGAL_CONTENT: Record<LegalKind, { title: { ar: string; en: string }; html: string }> = {
  privacy: {
    title: { ar: "سياسة الخصوصية", en: "Privacy Policy" },
    html: privacyHtml,
  },
  terms: {
    title: { ar: "شروط الاستخدام", en: "Terms of Use" },
    html: termsHtml,
  },
};

export function LegalHtmlScreen({
  appState,
  updateAppState,
}: {
  appState: AppState;
  updateAppState: UpdateAppState;
}) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith("ar");
  const kind: LegalKind = appState.currentScreen === "terms" ? "terms" : "privacy";
  const content = LEGAL_CONTENT[kind];
  const title = isArabic ? content.title.ar : content.title.en;

  return (
    <div className="page-shell">
      <NetworkBanner />
      <div className="section-card space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAppState({ currentScreen: "profile" })}
            className="p-2"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-poppins text-lg font-semibold text-gray-900">{title}</h1>
        </div>
        <div
          className="legal-content"
          dir="rtl"
          lang="ar"
          dangerouslySetInnerHTML={{ __html: content.html }}
        />
      </div>
    </div>
  );
}
