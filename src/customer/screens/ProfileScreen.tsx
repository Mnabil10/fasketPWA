import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Switch } from "../../ui/switch";
import {
  ArrowLeft,
  User,
  MapPin,
  Package,
  Bell,
  Globe,
  LogOut,
  ChevronRight,
  Star,
  Gift,
  CreditCard,
  Lock,
  MessageCircle,
  ExternalLink,
  Mail,
  Share2,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { clearSessionTokens } from "../../store/session";
import { supportedLanguages } from "../../i18n";
import { fmtEGP, fromCents } from "../../lib/money";
import { useToast } from "../providers/ToastProvider";
import { useNetworkStatus, useProfile, useApiErrorToast } from "../hooks";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { NetworkBanner } from "../components";
import { goToOrders } from "../navigation/navigation";
import { useNotificationPreferences } from "../stores/notificationPreferences";
import { APP_VERSION } from "../../version";
import { FASKET_CONFIG } from "../../config/fasketConfig";
import { openExternalUrl, openWhatsapp, buildSupportMailto } from "../../lib/fasketLinks";
import { useShareFasket } from "../hooks/useShareFasket";

interface ProfileScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

export function ProfileScreen({ appState, updateAppState }: ProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { isOffline } = useNetworkStatus();
  const apiErrorToast = useApiErrorToast();
  const profileQuery = useProfile({ enabled: Boolean(appState.user) });
  const profile = profileQuery.profile || appState.user;
  const notificationPreferences = useNotificationPreferences((state) => state.preferences);
  const updatePreference = useNotificationPreferences((state) => state.updatePreference);
  const [name, setName] = useState(profile?.name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const share = useShareFasket();
  const whatsappMessage = t(
    "profile.support.whatsappMessage",
    "Hi, I'd like to ask about an order from Fasket."
  );

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
    }
  }, [profile?.name, profile?.email, profile?.phone]);

  const normalizedLanguage = i18n.language?.startsWith("ar") ? "ar" : "en";
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
    },
    {
      icon: Package,
      label: t("profile.menu.orders"),
      action: () => goToOrders(updateAppState),
      badge: profile?.ordersCount
        ? { label: String(profile.ordersCount), variant: "secondary" as const }
        : null,
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
  };

  type SettingsActionItem = {
    key: string;
    icon: LucideIcon;
    label: string;
    toggle?: false;
    action?: () => void;
    subtitle?: string;
    disabled?: boolean;
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
    },
    {
      key: "loyalty-updates",
      icon: Gift,
      label: t("profile.settings.loyaltyUpdates"),
      toggle: true,
      value: notificationPreferences.loyalty,
      onChange: (checked) => updatePreference("loyalty", checked),
      subtitle: t("profile.settings.loyaltyUpdatesHint"),
    },
    {
      key: "marketing",
      icon: Bell,
      label: t("profile.settings.marketing"),
      toggle: true,
      value: notificationPreferences.marketing,
      onChange: (checked) => updatePreference("marketing", checked),
      subtitle: t("profile.settings.marketingHint"),
    },
  ];

  const supportActions: SettingsActionItem[] = [
    {
      key: "about",
      icon: ExternalLink,
      label: t("profile.support.about"),
      toggle: false,
      action: () => updateAppState({ currentScreen: "about" }),
    },
    {
      key: "website",
      icon: Globe,
      label: t("profile.support.website"),
      toggle: false,
      action: () => openExternalUrl(FASKET_CONFIG.websiteUrl),
    },
    {
      key: "rate",
      icon: Star,
      label: t("profile.support.rate"),
      toggle: false,
      action: () => openExternalUrl(FASKET_CONFIG.playStoreUrl),
      subtitle: FASKET_CONFIG.playStoreUrl ? undefined : t("profile.support.rateSoon"),
      disabled: !FASKET_CONFIG.playStoreUrl,
    },
    {
      key: "whatsapp",
      icon: MessageCircle,
      label: t("profile.support.whatsapp"),
      toggle: false,
      action: () => openWhatsapp(whatsappMessage),
    },
    {
      key: "email",
      icon: Mail,
      label: t("profile.support.email"),
      toggle: false,
      action: () => openExternalUrl(buildSupportMailto(t("profile.support.emailSubject"))),
    },
    {
      key: "share",
      icon: Share2,
      label: t("profile.support.share"),
      toggle: false,
      action: share,
    },
    {
      key: "call",
      icon: Phone,
      label: t("profile.support.phone"),
      toggle: false,
      action: () => openExternalUrl(`tel:${FASKET_CONFIG.supportPhone}`),
    },
  ];

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value);
  };

  const validateProfile = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t("profile.validation.name");
    if (!phone.trim()) next.phone = t("profile.validation.phone");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;
    try {
      const updated = await profileQuery.updateProfile({ name, email, phone });
      updateAppState({ user: updated });
      showToast({ type: "success", message: t("profile.saved") });
    } catch (error: any) {
      apiErrorToast(error, "profile.errorSave");
    }
  };

  const handleChangePassword = async () => {
    const next: Record<string, string> = {};
    if (!currentPassword) next.currentPassword = t("profile.validation.currentPassword");
    if (!newPassword) next.newPassword = t("profile.validation.newPassword");
    if (newPassword !== confirmPassword) next.confirmPassword = t("profile.validation.confirmPassword");
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      await profileQuery.changePassword({ currentPassword, newPassword });
      showToast({ type: "success", message: t("profile.passwordChanged") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      apiErrorToast(error, "profile.errorPassword");
    }
  };

  const handleLogout = () => {
    clearSessionTokens("logout");
    updateAppState({
      user: null,
      cart: [],
      selectedOrderId: null,
      selectedOrderSummary: null,
      selectedOrder: null,
      lastOrder: null,
      lastOrderId: null,
      currentScreen: "auth",
    });
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
          <p className="text-xs text-gray-500">{profile?.loyaltyTier || t("profile.tier")}</p>
        </div>

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
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
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
        </div>

        <div className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
            {t("profile.editProfile")}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label>{t("auth.fullName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={isOffline} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label>{t("auth.email")}</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={isOffline} />
            </div>
            <div>
              <Label>{t("auth.phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isOffline} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={profileQuery.updating || isOffline} className="rounded-xl">
            {profileQuery.updating ? t("common.loading") : t("profile.saveProfile")}
          </Button>
        </div>

        <div className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-poppins text-lg text-gray-900 flex items-center gap-2" style={{ fontWeight: 600 }}>
            <Lock className="w-4 h-4" />
            {t("profile.changePassword")}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label>{t("profile.currentPassword")}</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isOffline} />
              {errors.currentPassword && <p className="text-xs text-red-500 mt-1">{errors.currentPassword}</p>}
            </div>
            <div>
              <Label>{t("profile.newPassword")}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isOffline} />
              {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>}
            </div>
            <div>
              <Label>{t("profile.confirmPassword")}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isOffline} />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={profileQuery.changingPassword || isOffline} className="rounded-xl">
            {profileQuery.changingPassword ? t("common.loading") : t("profile.savePassword")}
          </Button>
        </div>

        <div className="mx-4 mt-6">
          <h3 className="font-poppins text-lg text-gray-900 mb-3 px-1" style={{ fontWeight: 600 }}>
            {t("profile.sectionAccount")}
          </h3>
          <div className="space-y-2">
            {mainMenuItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                onClick={item.action}
                className="w-full justify-between bg-white rounded-xl p-4 h-auto shadow-sm hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <item.icon className="w-5 h-5 mr-3 text-gray-600" />
                  <span className="text-left">{item.label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {item.badge && (
                    <Badge 
                      variant={item.badge.variant} 
                      className="text-xs"
                    >
                      {item.badge.label}
                    </Badge>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Button>
            ))}

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center">
                  <Globe className="w-5 h-5 mr-3 text-gray-600" />
                  <div>
                    <span className="text-left">{t("profile.settings.language")}</span>
                    <p className="text-sm text-gray-500">{activeLanguage.native}</p>
                  </div>
                </div>
                <select
                  value={normalizedLanguage}
                  onChange={handleLanguageChange}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                  aria-label={t("profile.settings.language")}
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.native}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-6">
          <h3 className="font-poppins text-lg text-gray-900 mb-3 px-1" style={{ fontWeight: 600 }}>
            {t("profile.sectionSettings")}
          </h3>
          <div className="space-y-2">
            {settingsMenuItems.map((item) => (
              <div
                key={item.key}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3 text-gray-600" />
                    <div>
                      <span className="text-left">{item.label}</span>
                      {item.subtitle && (
                        <p className="text-sm text-gray-500">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  {item.toggle ? (
                    <Switch
                      checked={item.value}
                      onCheckedChange={item.onChange}
                      disabled={isOffline}
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={item.action ?? undefined}
                      className="p-1"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="mx-4 mt-6">
        <h3 className="font-poppins text-lg text-gray-900 mb-3 px-1" style={{ fontWeight: 600 }}>
          {t("profile.support.title")}
        </h3>
        <div className="space-y-2">
          {supportActions.map((item) => (
            <Button
              key={item.key}
              variant="ghost"
              onClick={item.action}
              disabled={item.disabled}
              className="w-full justify-between bg-white rounded-xl p-4 h-auto shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              <div className="flex items-center text-left">
                <item.icon className="w-5 h-5 mr-3 text-gray-600" />
                <div className="text-left">
                  <span className="block">{item.label}</span>
                  {item.subtitle && <p className="text-xs text-gray-500">{item.subtitle}</p>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Button>
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

        <div className="mx-4 mt-4 mb-6">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full justify-center bg-white rounded-xl p-4 h-auto shadow-sm border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>{t("profile.logout")}</span>
          </Button>
        </div>
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}
