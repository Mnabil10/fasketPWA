import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  Globe,
  MapPin,
  MessageCircle,
  Phone,
  Mail,
  Sparkles,
  Share2,
  Star,
} from "lucide-react";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { openExternalUrl, openWhatsapp, buildSupportMailto } from "../../lib/fasketLinks";
import { useShareFasket } from "../hooks/useShareFasket";
import { NetworkBanner } from "../components";
import { FASKET_GRADIENTS } from "../../styles/designSystem";
import { resolveSupportConfig } from "../utils/mobileAppConfig";

interface AboutFasketScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

export function AboutFasketScreen({ appState, updateAppState }: AboutFasketScreenProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const supportConfig = resolveSupportConfig(appState.settings?.mobileApp ?? null, lang);
  const share = useShareFasket(supportConfig.webAppUrl);
  const isRTL = i18n.dir() === "rtl";

  const features = (t("about.features", { returnObjects: true }) as string[]) || [];
  const whatsappMessage = t("about.whatsappMessage", "Hi, I'd like to ask about an order from Fasket.");

  return (
    <div className="page-shell">
      <NetworkBanner />
      <div
        className="section-card space-y-4 glass-surface"
        style={{ background: FASKET_GRADIENTS.hero }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateAppState({ currentScreen: "profile" })}
              className="p-2 mr-2 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 700 }}>
                {t("about.title")}
              </h1>
              <p className="text-xs text-gray-600">{t("about.subtitle")}</p>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span className="text-xs">{t("about.tagline")}</span>
          </Badge>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{t("about.description")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/80 rounded-xl p-3 border border-border shadow-card flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-gray-500">{t("about.serviceAreaLabel")}</p>
              <p className="font-semibold text-gray-900">{supportConfig.serviceArea}</p>
            </div>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-border shadow-card flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-gray-500">{t("about.workingHoursLabel", "Working hours")}</p>
              <p className="font-semibold text-gray-900">{supportConfig.workingHours}</p>
            </div>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-border shadow-card flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-gray-500">{t("about.coverageLabel", "City coverage")}</p>
              <p className="font-semibold text-gray-900">{supportConfig.cityCoverage}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-xl"
            onClick={() => openExternalUrl(supportConfig.websiteUrl)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {t("about.visitWebsite")}
          </Button>
          <Button
            variant="secondary"
            className="rounded-xl"
            onClick={share}
          >
            <Share2 className="w-4 h-4 mr-2" />
            {t("about.shareButton")}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => openWhatsapp(whatsappMessage, supportConfig.whatsappNumber)}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {t("about.contactWhatsapp")}
          </Button>
        </div>
      </div>

      <div className="section-card space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {t("about.whoWeAre", "Who we are")}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((feature, idx) => (
            <div
              key={`${feature}-${idx}`}
              className="inline-card flex items-start gap-2 shadow-card bg-white"
            >
              <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-800">{feature}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          {t("about.contact")}
        </h3>
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${isRTL ? "text-right" : ""}`}>
          <div className="inline-card flex items-center gap-2 border border-border">
            <Phone className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-gray-500">{t("about.phone")}</p>
              <p className="font-semibold text-gray-900">{supportConfig.supportPhone}</p>
            </div>
          </div>
          <div className="inline-card flex items-center gap-2 border border-border">
            <Mail className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-gray-500">{t("about.email")}</p>
              <p className="font-semibold text-gray-900">{supportConfig.supportEmail}</p>
            </div>
          </div>
          <div className="inline-card flex items-center gap-2 border border-border">
            <Globe className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-gray-500">{t("about.website")}</p>
              <p className="font-semibold text-gray-900">{supportConfig.websiteUrl}</p>
            </div>
          </div>
          <div className="inline-card flex items-center gap-2 border border-border">
            <MessageCircle className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-gray-500">{t("about.whatsapp")}</p>
              <p className="font-semibold text-gray-900">{supportConfig.whatsappNumber}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="rounded-xl w-full"
            onClick={() => openExternalUrl(supportConfig.webAppUrl)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {t("about.openWebApp")}
          </Button>
          <Button
            className="rounded-xl w-full"
            onClick={() => openExternalUrl(buildSupportMailto(t("about.emailSubject"), supportConfig.supportEmail))}
          >
            <Mail className="w-4 h-4 mr-2" />
            {t("about.contactEmail")}
          </Button>
        </div>
      </div>

      <div className="section-card space-y-2">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          {t("about.shareTitle")}
        </h3>
        <p className="text-sm text-gray-600">{t("about.shareSubtitle")}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button className="rounded-xl w-full sm:w-auto" onClick={share}>
            <Share2 className="w-4 h-4 mr-2" />
            {t("about.shareButton")}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl w-full sm:w-auto"
            onClick={() => openExternalUrl(supportConfig.playStoreUrl)}
            disabled={!supportConfig.playStoreUrl}
          >
            <Star className="w-4 h-4 mr-2" />
            {t("about.rateApp")}
          </Button>
          <Button
            variant="ghost"
            className="rounded-xl w-full sm:w-auto"
            onClick={() => openExternalUrl(supportConfig.websiteUrl)}
          >
            <Globe className="w-4 h-4 mr-2" />
            {t("about.landingCta", "Open landing page")}
          </Button>
        </div>
      </div>
    </div>
  );
}
