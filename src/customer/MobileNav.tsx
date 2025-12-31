import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Home, Grid3x3, ShoppingCart, Package, User, LifeBuoy, type LucideIcon } from "lucide-react";
import { AppState, type UpdateAppState } from "./CustomerApp";
import { goToCart, goToHome, goToOrders } from "./navigation/navigation";
import { getLocalizedString } from "./utils/mobileAppConfig";
import type { MobileAppConfig } from "../types/api";

interface MobileNavProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

const NAVIGATION_SAFE_AREA = 92; // keeps content visible behind the fixed bar
const VALID_SCREENS = new Set<AppState["currentScreen"]>([
  "splash",
  "onboarding",
  "auth",
  "register",
  "home",
  "categories",
  "products",
  "product-detail",
  "cart",
  "checkout",
  "order-success",
  "orders",
  "order-detail",
  "help",
  "profile",
  "addresses",
  "loyalty-history",
  "about",
]);

type ConfigTab = NonNullable<NonNullable<MobileAppConfig["navigation"]>["tabs"]>[number];
type NavItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  screen: AppState["currentScreen"];
  requiresAuth: boolean;
  enabled: boolean;
  order: number;
};

export function MobileNav({ appState, updateAppState }: MobileNavProps) {
  const { t, i18n } = useTranslation();
  const mobileConfig = appState.settings?.mobileApp ?? null;
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";

  const defaultTabs = useMemo(
    () => [
      { id: "home", icon: Home, label: t("nav.home"), screen: "home" as const },
      { id: "categories", icon: Grid3x3, label: t("nav.categories"), screen: "categories" as const },
      { id: "cart", icon: ShoppingCart, label: t("nav.cart"), screen: "cart" as const },
      { id: "help", icon: LifeBuoy, label: t("nav.help"), screen: "help" as const },
      { id: "orders", icon: Package, label: t("nav.orders"), screen: "orders" as const, requiresAuth: true },
      { id: "profile", icon: User, label: t("nav.profile"), screen: "profile" as const, requiresAuth: true },
    ],
    [t]
  );

  const navItems = useMemo<NavItem[]>(() => {
    const configTabs = mobileConfig?.navigation?.tabs;
    const mapped = configTabs?.length
      ? configTabs.map((tab: ConfigTab, index) => {
          const screen = normalizeScreen(tab.screen || tab.id);
          const id = tab.id || screen || `tab-${index}`;
          const label =
            typeof tab.label !== "undefined"
              ? getLocalizedString(tab.label, lang, String(id))
              : defaultTabs.find((item) => item.id === id)?.label ?? String(id);
          const icon = resolveIcon(tab.icon, screen, id);
          const requiresAuth =
            typeof tab.requiresAuth === "boolean"
              ? tab.requiresAuth
              : defaultTabs.find((item) => item.id === id)?.requiresAuth ?? false;
          const enabled = tab.enabled ?? true;
          const order = tab.order ?? index;
          return { id, icon, label, screen, requiresAuth, enabled, order };
        })
      : defaultTabs.map((tab, index) => ({
          id: tab.id,
          icon: tab.icon,
          label: tab.label,
          screen: tab.screen,
          requiresAuth: tab.requiresAuth ?? false,
          enabled: true,
          order: index,
        }));

    const filtered = mapped.filter((item) => item.enabled);
    const visible = filtered.filter((item) => (item.requiresAuth ? Boolean(appState.user) : true));
    return visible.sort((a, b) => a.order - b.order);
  }, [mobileConfig, lang, defaultTabs, appState.user]);

  function resolveIcon(iconName?: string, screen?: string, id?: string): LucideIcon {
    const key = (iconName || screen || id || "").toString().toLowerCase();
    switch (key) {
      case "home":
        return Home;
      case "categories":
      case "category":
        return Grid3x3;
      case "cart":
      case "basket":
        return ShoppingCart;
      case "orders":
      case "order":
        return Package;
      case "profile":
      case "account":
        return User;
      case "help":
      case "support":
        return LifeBuoy;
      default:
        return Home;
    }
  }

  function normalizeScreen(value?: string): AppState["currentScreen"] {
    if (!value) return "home";
    const candidate = value as AppState["currentScreen"];
    return VALID_SCREENS.has(candidate) ? candidate : "home";
  }

  const navigate = (screen: AppState["currentScreen"]) => {
    switch (screen) {
      case "home":
        goToHome(updateAppState);
        return;
      case "cart":
        goToCart(updateAppState);
        return;
      case "orders":
        goToOrders(updateAppState);
        return;
      default:
        updateAppState({ currentScreen: screen });
    }
  };

  return (
    <>
      <div aria-hidden="true" className="w-full" style={{ height: NAVIGATION_SAFE_AREA }} />
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 border-t border-gray-200 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,12px)+10px)] shadow-nav-soft backdrop-blur-md">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(navItems.length, 1)}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = appState.currentScreen === item.screen;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.screen)}
                className={`relative flex flex-col items-center gap-1 rounded-xl py-2 transition-colors ${
                  isActive ? "text-primary bg-primary/8 shadow-card" : "text-gray-600 hover:text-primary"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold leading-none">{item.label}</span>
                {item.id === "cart" && appState.cart.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-primary text-white text-[11px] rounded-full w-5 h-5 flex items-center justify-center shadow-card">
                    {appState.cart.length}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
