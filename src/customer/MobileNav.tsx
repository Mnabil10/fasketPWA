import React from "react";
import { useTranslation } from "react-i18next";
import { Home, Grid3x3, ShoppingCart, Package, User } from "lucide-react";
import { AppState, type UpdateAppState } from "./CustomerApp";
import { goToCart, goToHome, goToOrders } from "./navigation/navigation";

interface MobileNavProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

const NAVIGATION_SAFE_AREA = 92; // keeps content visible behind the fixed bar

export function MobileNav({ appState, updateAppState }: MobileNavProps) {
  const { t } = useTranslation();
  const navItems = [
    { id: "home", icon: Home, label: t("nav.home"), screen: "home" as const },
    { id: "categories", icon: Grid3x3, label: t("nav.categories"), screen: "categories" as const },
    { id: "cart", icon: ShoppingCart, label: t("nav.cart"), screen: "cart" as const },
    { id: "orders", icon: Package, label: t("nav.orders"), screen: "orders" as const },
    { id: "profile", icon: User, label: t("nav.profile"), screen: "profile" as const },
  ];

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
        <div className="grid grid-cols-5 gap-2">
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
