import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Switch } from "../../ui/switch";
import { cn } from "../../ui/utils";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
} from "../../ui/bottom-sheet";
import {
  ArrowLeft,
  User,
  MapPin,
  Package,
  Bell,
  Globe,
  LogOut,
  LogIn,
  ChevronRight,
  Star,
  Gift,
  CreditCard,
  Lock,
  FileText,
  Scale,
  MessageCircle,
  LifeBuoy,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { clearSessionTokens, getSessionTokens } from "../../store/session";
import { supportedLanguages } from "../../i18n";
import { fmtEGP, fromCents } from "../../lib/money";
import { useToast } from "../providers/ToastProvider";
import { useNetworkStatus, useProfile, useApiErrorToast } from "../hooks";
import { NetworkBanner } from "../components";
import { goToOrders } from "../navigation/navigation";
import { useNotificationPreferences } from "../stores/notificationPreferences";
import { APP_VERSION } from "../../version";
import { openExternalUrl, openWhatsapp, buildSupportMailto } from "../../lib/fasketLinks";
import { rateApp, isRateAppAvailable } from "../../lib/rateApp";
import { useShareFasket } from "../hooks/useShareFasket";
import { resolveSupportConfig } from "../utils/mobileAppConfig";
import { logout as logoutApi } from "../../services/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalCartStore } from "../stores/localCart";
import { isAppStoreDeadlinePassed } from "../../config/fasketConfig";

interface ProfileScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

export function ProfileScreen({ appState, updateAppState }: ProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { isOffline } = useNetworkStatus();
  const apiErrorToast = useApiErrorToast();
  const queryClient = useQueryClient();
  const clearLocalCart = useLocalCartStore((state) => state.clear);
  const profileQuery = useProfile({ enabled: Boolean(appState.user) });
  const profile = profileQuery.profile || appState.user;
  const notificationPreferences = useNotificationPreferences((state) => state.preferences);
  const updatePreference = useNotificationPreferences((state) => state.updatePreference);
  const resetPreferences = useNotificationPreferences((state) => state.resetPreferences);
  const normalizedLanguage = i18n.language?.startsWith("ar") ? "ar" : "en";
  const supportConfig = resolveSupportConfig(appState.settings?.mobileApp ?? null, normalizedLanguage);
  const share = useShareFasket(supportConfig.webAppUrl);
  const whatsappMessage = t(
    "profile.support.whatsappMessage",
    "Hi, I'd like to ask about an order from Fasket."
  );


  const isGuest = !appState.user;
  const activeLanguage = supportedLanguages.find((lang) => lang.code === normalizedLanguage) ?? supportedLanguages[0];
  const displayName = profile?.name?.trim() || t("profile.guest");
  const displayPhone = profile?.phone?.trim() || t("profile.noPhone");
  const displayEmail = profile?.email?.trim() || (profileQuery.isLoading ? t("common.loading") : t("profile.noEmail"));

  const loyaltyPoints = profile?.loyaltyPoints ?? profile?.points ?? 0;

  const quickStats = [
    { label: t("profile.stats.orders"), value: profile?.ordersCount ?? 0, icon: Package },
    { label: t("profile.stats.points"), value: loyaltyPoints, icon: Gift },
    {
      label: t("profile.stats.totalSpent", { defaultValue: "Total spent" }),
      value: fmtEGP(fromCents(profile?.totalSpentCents ?? 0)),
      icon: CreditCard,
    },
  ];

  const mainMenuItems = [
    {
      icon: MapPin,
      label: t("profile.menu.addresses"),
      action: () => updateAppState({ currentScreen: "addresses" }),
      badge: profile?.addressesCount
        ? { label: String(profile.addressesCount), variant: "secondary" as const }
        : null,
      iconBg: "bg-blue-500",
    },
    {
      icon: Package,
      label: t("profile.menu.orders"),
      action: () => goToOrders(updateAppState),
      badge: profile?.ordersCount
        ? { label: String(profile.ordersCount), variant: "secondary" as const }
        : null,
      iconBg: "bg-indigo-500",
    },
    // {
    //   icon: CreditCard,
    //   label: t("profile.menu.payments", "Payment Methods"),
    //   action: () => updateAppState({ currentScreen: "payment-methods" }),
    //   badge: null,
    //   iconBg: "bg-green-600",
    // },
    {
      icon: User,
      label: t("profile.editProfile"),
      action: () => updateAppState({ currentScreen: "edit-profile" }),
      badge: null,
      iconBg: "bg-orange-500",
    },
    {
      icon: Lock,
      label: t("profile.changePassword"),
      action: () => updateAppState({ currentScreen: "change-password" }),
      badge: null,
      iconBg: "bg-purple-600",
    },
  ];

  type SettingsToggleItem = {
    key: string;
    icon: LucideIcon;
    label: string;
    toggle: true;
    value: boolean;
    onChange: (checked: boolean) => void;
    subtitle?: string;
    disabled?: boolean;
    iconBg?: string;
  };

  type SettingsActionItem = {
    key: string;
    icon: LucideIcon;
    label: string;
    toggle?: false;
    action?: () => void;
    subtitle?: string;
    disabled?: boolean;
    iconBg?: string;
  };

  type SettingsMenuItem = SettingsToggleItem | SettingsActionItem;

  const settingsMenuItems: SettingsMenuItem[] = [
    {
      key: "order-updates",
      icon: Bell,
      label: t("profile.settings.orderUpdates"),
      toggle: true,
      value: notificationPreferences.orderUpdates,
      onChange: (checked) => updatePreference("orderUpdates", checked),
      subtitle: t("profile.settings.orderUpdatesHint"),
      iconBg: "bg-red-500",
    },
    {
      key: "whatsapp-order-updates",
      icon: MessageCircle,
      label: t("profile.settings.whatsappOrderUpdates", "WhatsApp order updates"),
      toggle: true,
      value: notificationPreferences.whatsappOrderUpdates ?? true,
      onChange: (checked) => updatePreference("whatsappOrderUpdates", checked),
      subtitle: t(
        "profile.settings.whatsappOrderUpdatesHint",
        "Get order status updates on WhatsApp."
      ),
      iconBg: "bg-green-500",
    },
    {
      key: "loyalty-updates",
      icon: Gift,
      label: t("profile.settings.loyaltyUpdates"),
      toggle: true,
      value: notificationPreferences.loyalty,
      onChange: (checked) => updatePreference("loyalty", checked),
      subtitle: t("profile.settings.loyaltyUpdatesHint"),
      iconBg: "bg-orange-500",
    },
    {
      key: "marketing",
      icon: Bell,
      label: t("profile.settings.marketing"),
      toggle: true,
      value: notificationPreferences.marketing,
      onChange: (checked) => updatePreference("marketing", checked),
      subtitle: t("profile.settings.marketingHint"),
      iconBg: "bg-blue-500",
    },
  ];

  const supportActions: SettingsActionItem[] = [
    {
      key: "help",
      icon: LifeBuoy,
      label: t("profile.settings.help", "Help & Support"),
      toggle: false,
      action: () => updateAppState({ currentScreen: "help" }),
      iconBg: "bg-sky-500",
    },
    {
      key: "about",
      icon: ExternalLink,
      label: t("profile.support.about"),
      toggle: false,
      action: () => updateAppState({ currentScreen: "about" }),
      iconBg: "bg-gray-500",
    },
    // {
    //   key: "website",
    //   icon: Globe,
    //   label: t("profile.support.website"),
    //   toggle: false,
    //   action: () => openExternalUrl(supportConfig.websiteUrl),
    // },
    {
      key: "rate",
      icon: Star,
      label: t("profile.support.rate"),
      toggle: false,
      action: () => rateApp({ playStoreUrl: supportConfig.playStoreUrl, appStoreUrl: supportConfig.appStoreUrl }),
      subtitle: isRateAppAvailable(supportConfig) ? undefined : t("profile.support.rateSoon"),
      disabled: !isRateAppAvailable(supportConfig),
      iconBg: "bg-yellow-500",
    },
    {
      key: "whatsapp",
      icon: MessageCircle,
      label: t("profile.support.whatsapp"),
      toggle: false,
      action: () => openWhatsapp(whatsappMessage, supportConfig.whatsappNumber),
      iconBg: "bg-green-500",
      disabled: !supportConfig.whatsappNumber,
    },
    // {
    //   key: "call",
    //   icon: Phone,
    //   label: t("profile.support.phone"),
    //   toggle: false,
    //   action: () => openExternalUrl(`tel:${supportConfig.supportPhone}`),
    //   iconBg: "bg-blue-600",
    //   disabled: !supportConfig.supportPhone,
    // },
    {
      key: "privacy",
      icon: FileText,
      label: normalizedLanguage === "ar" ? "سياسة الخصوصية" : t("profile.support.privacy", "Privacy Policy"),
      toggle: false,
      action: () => updateAppState({ currentScreen: "privacy" }),
      iconBg: "bg-gray-400",
    },
    {
      key: "terms",
      icon: Scale,
      label: normalizedLanguage === "ar" ? "شروط الاستخدام" : t("profile.support.terms", "Terms of Use"),
      toggle: false,
      action: () => updateAppState({ currentScreen: "terms" }),
      iconBg: "bg-gray-400",
    },
    // {
    //   key: "email",
    //   icon: Mail,
    //   label: t("profile.support.email"),
    //   toggle: false,
    //   action: () => openExternalUrl(buildSupportMailto(t("profile.support.emailSubject"), supportConfig.supportEmail)),
    // },
    {
      key: "share",
      icon: Share2,
      label: t("profile.support.share"),
      toggle: false,
      action: share,
      iconBg: "bg-indigo-500",
    },
  ];

  const isMobile = useMemo(() => (Capacitor.getPlatform?.() ?? "web") !== "web", []);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [deleteAccountSheetOpen, setDeleteAccountSheetOpen] = useState(false);

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value);
  };

  const handleLanguageSelect = (code: string) => {
    i18n.changeLanguage(code);
    setLanguageSheetOpen(false);
  };

  const handleCopyWhatsapp = async () => {
    const number = (supportConfig.whatsappNumber || "").trim();
    if (!number || typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(number);
      showToast({ type: "success", message: t("profile.support.copied", "Number copied") });
    } catch {
      showToast({ type: "error", message: t("profile.support.copyFailed", "Couldn't copy number") });
    }
  };


  const handleLogout = async () => {
    try {
      const { refreshToken } = getSessionTokens();
      if (refreshToken) {
        await logoutApi({ refreshToken });
      }
    } catch {
      // ignore logout failures
    } finally {
      await clearSessionTokens("logout");
      resetPreferences();
      clearLocalCart();
      queryClient.clear();
      updateAppState({
        user: null,
        cart: [],
        selectedOrderId: null,
        selectedOrderSummary: null,
        selectedOrder: null,
        lastOrder: null,
        lastOrderId: null,
        guestSession: null,
        guestTracking: null,
        currentScreen: "auth",
      });
    }
  };

  const handleDeleteAccountConfirm = () => {
    setDeleteAccountSheetOpen(false);
    showToast({
      type: "info",
      message: t("profile.deleteAccountSuccess"),
    });
    void handleLogout();
  };

  return (
    <div className="page-shell">
      <NetworkBanner />
      <div className="bg-white px-4 py-4 shadow-sm flex items-center">
        <Button variant="ghost" size="sm" onClick={() => updateAppState({ currentScreen: "home" })} className="p-2 mr-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            {t("profile.title")}
          </h1>
          <p className="text-xs text-gray-500">{isGuest ? t("profile.guest") : (profile?.loyaltyTier || t("profile.tier"))}</p>
        </div>

        {!isGuest && (
          <div className="mx-4 mt-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">{t("profile.loyalty.balanceLabel")}</p>
                <p className="text-2xl font-semibold text-primary">{loyaltyPoints}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => updateAppState({ currentScreen: "loyalty-history" })}
              >
                {t("profile.loyalty.viewHistory")}
              </Button>
            </div>
            {appState.settings?.loyalty?.enabled && (
              <p className="text-xs text-gray-600 mt-2">
                {t("profile.loyalty.rate", {
                  earn: appState.settings.loyalty.earnRate ?? 0,
                  redeem: appState.settings.loyalty.redeemRate ?? 0,
                })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          {isGuest ? (
            <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <User className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">{t("profile.guest")}</h2>
                  <p className="text-sm text-gray-600 mb-4">{t("profile.signInCta", "Sign in to access addresses, order history, loyalty points, and more.")}</p>
                  <Button
                    onClick={() => updateAppState({ currentScreen: "auth" })}
                    className="w-full sm:w-auto"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {t("profile.login")}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
                  <p className="text-sm text-gray-600">{displayPhone}</p>
                  <p className="text-sm text-gray-600">{displayEmail}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="bg-gray-50 rounded-xl p-3">
                    <stat.icon className="w-4 h-4 text-primary mb-1" />
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="font-semibold text-gray-900">{stat.value}</p>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => updateAppState({ currentScreen: "addresses" })}
                className="mt-4 w-full rounded-xl"
              >
                {t("profile.addAddress", "Add new address")}
              </Button>
            </>
          )}
        </div>

        {!isGuest && (
          <div className="mx-4 mt-6">
            <h3 className="font-poppins text-lg font-semibold text-gray-900 mb-3 px-1">
              {t("profile.sectionAccount")}
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {mainMenuItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={cn(
                    "w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors",
                    index !== mainMenuItems.length - 1 && "border-b border-gray-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                      (item as any).iconBg || "bg-gray-400"
                    )}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <Badge variant={item.badge.variant} className="text-[10px] h-5 px-1.5">
                        {item.badge.label}
                      </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 rtl:rotate-180" />
                  </div>
                </button>
              ))}

              <div className="p-4 flex items-center justify-between border-t border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-teal-500">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900 block">{t("profile.settings.language")}</span>
                  <p className="text-xs text-gray-500">{activeLanguage.native}</p>
                </div>
              </div>
              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setLanguageSheetOpen(true)}
                  className="flex items-center gap-1 text-sm text-primary font-medium"
                  aria-label={t("profile.settings.language")}
                >
                  {activeLanguage.native}
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              ) : (
                <select
                  value={normalizedLanguage}
                  onChange={handleLanguageChange}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-1 focus:ring-primary h-auto min-h-0"
                  aria-label={t("profile.settings.language")}
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.native}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
        )}

        {isGuest && (
          <div className="mx-4 mt-6">
            <h3 className="font-poppins text-lg font-semibold text-gray-900 mb-3 px-1">
              {t("profile.settings.language")}
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-teal-500">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">{t("profile.settings.language")}</span>
                    <p className="text-xs text-gray-500">{activeLanguage.native}</p>
                  </div>
                </div>
                {isMobile ? (
                  <button
                    type="button"
                    onClick={() => setLanguageSheetOpen(true)}
                    className="flex items-center gap-1 text-sm text-primary font-medium"
                    aria-label={t("profile.settings.language")}
                  >
                    {activeLanguage.native}
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                ) : (
                  <select
                    value={normalizedLanguage}
                    onChange={handleLanguageChange}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:ring-1 focus:ring-primary h-auto min-h-0"
                    aria-label={t("profile.settings.language")}
                  >
                    {supportedLanguages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.native}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        {!isGuest && (
          <div className="mx-4 mt-6">
            <h3 className="font-poppins text-lg font-semibold text-gray-900 mb-3 px-1">
              {t("profile.sectionSettings")}
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {settingsMenuItems.map((item, index) => (
              <div
                key={item.key}
                className={cn(
                  "p-4 flex items-center justify-between",
                  index !== settingsMenuItems.length - 1 && "border-b border-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                    (item as any).iconBg || "bg-gray-400"
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 block">{item.label}</span>
                    {item.subtitle && (
                      <p className="text-xs text-gray-500 leading-tight mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                </div>
                {item.toggle && (
                  <Switch
                    checked={item.value}
                    onCheckedChange={item.onChange}
                    disabled={isOffline}
                  />
                )}
              </div>
            ))}
            </div>
          </div>
        )}

        <div className="mx-4 mt-6">
          <h3 className="font-poppins text-lg font-semibold text-gray-900 mb-3 px-1">
            {t("profile.support.title")}
          </h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-gray-50">
              <div>
                <p className="text-xs text-gray-500">{t("profile.support.whatsappNumber", "WhatsApp number")}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {supportConfig.whatsappNumber || t("profile.support.whatsappMissing", "Unavailable")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={handleCopyWhatsapp}
                disabled={!supportConfig.whatsappNumber}
              >
                <Copy className="w-4 h-4 mr-1" />
                {t("profile.support.copy", "Copy")}
              </Button>
            </div>
            {supportActions.map((item, index) => (
              <button
                key={item.key}
                onClick={item.action}
                disabled={item.disabled}
                className={cn(
                  "w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors disabled:opacity-60",
                  index !== supportActions.length - 1 && "border-b border-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                    (item as any).iconBg || "bg-gray-400"
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="text-start">
                    <span className="text-sm font-medium text-gray-900 block">{item.label}</span>
                    {item.subtitle && <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 rtl:rotate-180" />
              </button>
            ))}
          </div>
        </div>

        <div className="mx-4 mt-6 bg-white rounded-xl p-4 shadow-sm">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">
              {t("common.appName")} {t("profile.appVersion")}
            </p>
            <p className="text-sm font-medium text-gray-900">v{APP_VERSION}</p>
          </div>
        </div>

        <div className="mx-4 mt-4 mb-6 flex flex-col gap-3">
          {isGuest ? (
            <Button
              onClick={() => updateAppState({ currentScreen: "auth" })}
              className="w-full justify-center rounded-xl p-4 h-auto shadow-sm"
            >
              <LogIn className="w-5 h-5 mr-3" />
              <span>{t("profile.login")}</span>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full justify-center bg-white rounded-xl p-4 h-auto shadow-sm border-red-200 text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span>{t("profile.logout")}</span>
              </Button>
              {isAppStoreDeadlinePassed && (
                <Button
                  variant="outline"
                  onClick={() => setDeleteAccountSheetOpen(true)}
                  className="w-full justify-center bg-white rounded-xl p-4 h-auto shadow-sm border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <Trash2 className="w-5 h-5 mr-3" />
                  <span>{t("profile.deleteAccount")}</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <BottomSheet open={languageSheetOpen} onOpenChange={setLanguageSheetOpen}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>{t("profile.settings.language")}</BottomSheetTitle>
          </BottomSheetHeader>
          <div className="mt-2 flex flex-col gap-0">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageSelect(lang.code)}
                className={cn(
                  "flex items-center justify-between py-4 px-3 rounded-xl text-left transition-colors",
                  normalizedLanguage === lang.code ? "bg-primary/10 text-primary" : "hover:bg-gray-50"
                )}
              >
                <span className="font-medium">{lang.native}</span>
                {normalizedLanguage === lang.code && <Check className="w-5 h-5 shrink-0" />}
              </button>
            ))}
          </div>
        </BottomSheetContent>
      </BottomSheet>

      <BottomSheet open={deleteAccountSheetOpen} onOpenChange={setDeleteAccountSheetOpen}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>{t("profile.deleteAccountConfirmTitle")}</BottomSheetTitle>
            <BottomSheetDescription className="text-gray-600 mt-2">
              {t("profile.deleteAccountConfirmDescription")}
            </BottomSheetDescription>
          </BottomSheetHeader>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="destructive"
              className="w-full rounded-xl bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/30"
              onClick={handleDeleteAccountConfirm}
            >
              {t("profile.deleteAccount")}
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => setDeleteAccountSheetOpen(false)}
            >
              {t("profile.deleteAccountCancel")}
            </Button>
          </div>
        </BottomSheetContent>
      </BottomSheet>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}
