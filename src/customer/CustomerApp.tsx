import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SplashScreen } from "./screens/SplashScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { CategoriesScreen } from "./screens/CategoriesScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { ProductDetailScreen } from "./screens/ProductDetailScreen";
import { CartScreen } from "./screens/CartScreen";
import { CheckoutScreen } from "./screens/CheckoutScreen";
import { OrderSuccessScreen } from "./screens/OrderSuccessScreen";
import { OrdersScreen } from "./screens/OrdersScreen";
import { OrderDetailScreen } from "./screens/OrderDetailScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { AddressesScreen } from "./screens/AddressesScreen";
import { LoyaltyHistoryScreen } from "./screens/LoyaltyHistoryScreen";
import { AboutFasketScreen } from "./screens/AboutFasketScreen";
import type { AppSettings, Category, OrderDetail, OrderSummary, Product, UserProfile } from "../types/api";
import { getMyProfile } from "../services/users.service";
import { clearSessionTokens, ensureSessionHydrated, getSessionTokens, onSessionInvalid } from "../store/session";
import { useLocalCartStore } from "./stores/localCart";
import { getLocalCartSnapshot, mergeLocalCartIntoServer } from "./utils/cartSync";
import { parseHash, buildHashFromState } from "./navigation/deepLinking";
import { listCategories } from "../services/catalog";
import i18n from "../i18n";
import type { CartPreviewItem } from "./types";
import { useCart } from "./hooks";
import { trackAppOpen } from "../lib/analytics";
import { getAppSettings } from "../services/settings";
import { initPush, registerDeviceToken, subscribeToNotifications } from "../lib/notifications";
import { useNotificationPreferences } from "./stores/notificationPreferences";
import { useToast } from "./providers/ToastProvider";
import { App as CapacitorApp } from "@capacitor/app";
import { goToCart, goToCategory, goToHome, goToOrders, goToProduct } from "./navigation/navigation";

export type Screen =
  | "splash"
  | "onboarding"
  | "auth"
  | "register"
  | "home"
  | "categories"
  | "products"
  | "product-detail"
  | "cart"
  | "checkout"
  | "order-success"
  | "orders"
  | "order-detail"
  | "profile"
  | "addresses"
  | "loyalty-history"
  | "about";

const authRequiredScreens = new Set<Screen>(["checkout", "orders", "order-detail", "profile", "addresses", "loyalty-history"]);

export interface AppState {
  bootstrapping: boolean;
  splashComplete: boolean;
  postOnboardingScreen: "auth" | "home";
  currentScreen: Screen;
  user: UserProfile | null;
  cart: CartPreviewItem[];
  selectedCategory: Category | null;
  selectedCategoryId: string | null;
  selectedProduct: Partial<Product> | null;
  selectedOrderId: string | null;
  selectedOrderSummary: OrderSummary | null;
  selectedOrder: OrderDetail | null;
  lastOrderId: string | null;
  lastOrder: OrderDetail | null;
  settings: AppSettings | null;
  settingsLoaded: boolean;
}

export type UpdateAppState = (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;

const initialState: AppState = {
  bootstrapping: true,
  splashComplete: false,
  postOnboardingScreen: "auth",
  currentScreen: "splash",
  user: null,
  cart: [],
  selectedCategory: null,
  selectedCategoryId: null,
  selectedProduct: null,
  selectedOrderId: null,
  selectedOrderSummary: null,
  selectedOrder: null,
  lastOrderId: null,
  lastOrder: null,
  settings: null,
  settingsLoaded: false,
};

function areCartPreviewsEqual(prev: CartPreviewItem[], next: CartPreviewItem[]) {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (!b) return false;
    if (a.id !== b.id || a.quantity !== b.quantity || a.price !== b.price) {
      return false;
    }
  }
  return true;
}

export function CustomerApp() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const notificationPrefs = useNotificationPreferences((state) => state.preferences);
  const [appState, setAppState] = useState<AppState>(initialState);
  const prevUserId = useRef<string | null>(null);

  const updateAppState: UpdateAppState = useCallback((updates) => {
    setAppState((prev) => ({
      ...prev,
      ...(typeof updates === "function" ? updates(prev) : updates),
    }));
  }, []);

  const handleDeepLinkPath = useCallback(
    (rawPath?: string | null) => {
      if (rawPath === undefined || rawPath === null) return;
      const cleanedPath = rawPath.replace(/^\//, "");
      const [first, second] = cleanedPath.split("/").filter(Boolean);

      if (!first || first === "home" || first === "app") {
        goToHome(updateAppState);
        return;
      }
      if (first === "cart") {
        goToCart(updateAppState);
        return;
      }
      if (first === "orders") {
        if (second) {
          updateAppState((prev) => ({
            ...prev,
            selectedOrderId: second,
            selectedOrderSummary: prev.selectedOrderSummary?.id === second ? prev.selectedOrderSummary : null,
            currentScreen: "order-detail",
          }));
        } else {
          goToOrders(updateAppState);
        }
        return;
      }
      if (first === "product" && second) {
        goToProduct(second, updateAppState, { product: { slug: second } });
        return;
      }
      if (first === "category" && second) {
        goToCategory(second, updateAppState, { categoryId: second });
        return;
      }
      if (first === "about" || first === "about-fasket") {
        updateAppState({ currentScreen: "about" });
        return;
      }
      if (first === "profile") {
        updateAppState({ currentScreen: "profile" });
        return;
      }
      goToHome(updateAppState);
    },
    [updateAppState]
  );

  const handleAppUrlOpen = useCallback(
    (incomingUrl?: string | null) => {
      if (!incomingUrl) return;
      try {
        const url = new URL(incomingUrl);
        const appIndex = url.pathname.indexOf("/app");
        const afterApp = appIndex >= 0 ? url.pathname.slice(appIndex + 4) : url.pathname;
        handleDeepLinkPath(afterApp || "/");
      } catch {
        // ignore malformed URL
      }
    },
    [handleDeepLinkPath]
  );

  const { items: syncedCart } = useCart({ userId: appState.user?.id });

  const handleAuthSuccess = useCallback(async () => {
    try {
      const profile = await getMyProfile();
      updateAppState({
        user: profile,
        currentScreen: "home",
        bootstrapping: false,
        postOnboardingScreen: "home",
      });
    } catch (error) {
      clearSessionTokens();
      updateAppState({
        user: null,
        currentScreen: "auth",
        bootstrapping: false,
        postOnboardingScreen: "auth",
      });
      throw error instanceof Error ? error : new Error("Failed to load profile");
    }
  }, [updateAppState]);

  const toggleAuthMode = useCallback(() => {
    updateAppState((prev) => ({
      currentScreen: prev.currentScreen === "register" ? "auth" : "register",
    }));
  }, [updateAppState]);

  useEffect(() => {
    trackAppOpen();
  }, []);

  useEffect(() => {
    if (!CapacitorApp?.addListener) return;
    let listener: { remove: () => void } | undefined;
    const sub = CapacitorApp.addListener("appUrlOpen", (data) => {
      handleAppUrlOpen(data?.url);
    });
    if ("then" in sub && typeof sub.then === "function") {
      sub.then((ls) => {
        listener = ls;
      });
    } else {
      listener = sub as unknown as { remove: () => void };
    }
    CapacitorApp.getLaunchUrl().then((res) => {
      if (res?.url) {
        handleAppUrlOpen(res.url);
      }
    });
    return () => {
      listener?.remove?.();
    };
  }, [handleAppUrlOpen]);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((payload) => {
      if (payload.type === "order_status" && payload.orderId) {
        showToast({
          type: "info",
          message: payload.body ?? t("notifications.orderUpdated"),
          actionLabel: t("notifications.viewOrder"),
          onAction: () =>
            updateAppState((prev) => ({
              ...prev,
              selectedOrderId: payload.orderId!,
              currentScreen: "order-detail",
            })),
        });
        return;
      }
      if (payload.type === "loyalty_event") {
        showToast({
          type: "success",
          message:
            payload.body ??
            (payload.points
              ? t("notifications.loyaltyEarned", { points: payload.points })
              : t("notifications.loyaltyUpdated")),
          actionLabel: t("notifications.viewHistory"),
          onAction: () => updateAppState((prev) => ({ ...prev, currentScreen: "loyalty-history" })),
        });
        return;
      }
      if (payload.type === "promotion") {
        showToast({
          type: "info",
          message: payload.body ?? t("notifications.marketing"),
          actionLabel: t("notifications.viewOffers"),
          onAction: () => updateAppState((prev) => ({ ...prev, currentScreen: "home" })),
        });
      }
    });
    return unsubscribe;
  }, [showToast, t, updateAppState]);

  useEffect(() => {
    setAppState((prev) => {
      if (areCartPreviewsEqual(prev.cart, syncedCart)) {
        return prev;
      }
      return { ...prev, cart: syncedCart };
    });
  }, [syncedCart]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await ensureSessionHydrated();
      let resolvedSettings: AppSettings | null = null;
      try {
        const settingsResult = await getAppSettings();
        resolvedSettings = settingsResult.data ?? null;
      } catch {
        resolvedSettings = null;
      }
      const { accessToken } = getSessionTokens();
      if (!accessToken) {
        if (!cancelled) {
          setAppState((prev) => ({
            ...prev,
            user: null,
            cart: [],
            selectedOrder: null,
            selectedOrderId: null,
            selectedOrderSummary: null,
            lastOrder: null,
            lastOrderId: null,
            bootstrapping: false,
            postOnboardingScreen: "auth",
            settings: resolvedSettings ?? prev.settings,
            settingsLoaded: true,
          }));
        }
        return;
      }

      try {
        const profile = await getMyProfile();
        if (!cancelled) {
          setAppState((prev) => ({
            ...prev,
            user: profile,
            bootstrapping: false,
            postOnboardingScreen: "home",
            settings: resolvedSettings ?? prev.settings,
            settingsLoaded: true,
          }));
        }
      } catch {
        clearSessionTokens("expired");
        if (!cancelled) {
          setAppState((prev) => ({
            ...prev,
            user: null,
            cart: [],
            lastOrder: null,
            lastOrderId: null,
            selectedOrder: null,
            selectedOrderId: null,
            selectedOrderSummary: null,
            bootstrapping: false,
            postOnboardingScreen: "auth",
            settings: resolvedSettings ?? prev.settings,
            settingsLoaded: true,
          }));
        }
      }
    }

    bootstrap();
    const unsubscribe = onSessionInvalid((reason) => {
      if (reason === "expired") {
        showToast({
          type: "error",
          message: t("auth.sessionExpired", "Session expired, please log in again."),
        });
      }
      setAppState((prev) => ({
        ...prev,
        user: null,
        cart: [],
        lastOrder: null,
        lastOrderId: null,
        selectedOrder: null,
        selectedOrderId: null,
        selectedOrderSummary: null,
        currentScreen: "auth",
        bootstrapping: false,
        postOnboardingScreen: "auth",
      }));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [showToast, t]);

  useEffect(() => {
    const unsubscribe = useLocalCartStore.subscribe(() => {
      setAppState((prev) => {
        if (prev.user) return prev;
        return { ...prev, cart: getLocalCartSnapshot() };
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const currentUserId = appState.user?.id ?? null;
    if (currentUserId && prevUserId.current !== currentUserId) {
      const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
      mergeLocalCartIntoServer(lang)
        .then((preview) => {
          setAppState((prev) => ({ ...prev, cart: preview }));
        })
        .catch(() => {
          setAppState((prev) => ({ ...prev, cart: [] }));
        });
    }
    if (!currentUserId) {
      setAppState((prev) => ({ ...prev, cart: getLocalCartSnapshot() }));
    }
    prevUserId.current = currentUserId;
  }, [appState.user?.id, i18n.language]);

  useEffect(() => {
    if (!appState.user?.id) return;
    initPush()
      .then(() => registerDeviceToken(appState.user!.id, notificationPrefs))
      .catch(() => undefined);
  }, [
    appState.user?.id,
    notificationPrefs.orderUpdates,
    notificationPrefs.loyalty,
    notificationPrefs.marketing,
  ]);

  useEffect(() => {
    if (appState.currentScreen !== "splash") return;
    if (appState.bootstrapping || !appState.splashComplete || !appState.settingsLoaded) return;
    updateAppState({ currentScreen: "onboarding" });
  }, [appState.bootstrapping, appState.splashComplete, appState.settingsLoaded, appState.currentScreen, updateAppState]);

  useEffect(() => {
    if (typeof window === "undefined" || appState.bootstrapping) return;
    let cancelled = false;
    let categoriesCache: Category[] | null = null;
    const lang = i18n.language?.startsWith("ar") ? "ar" : "en";

    const ensureCategories = async () => {
      if (categoriesCache) return categoriesCache;
      const result = await listCategories(lang);
      categoriesCache = result.data ?? [];
      return categoriesCache;
    };

    const applyHash = async (hash: string) => {
      const target = parseHash(hash);
      if (!target || cancelled) return;
      if (target.productSlug) {
        setAppState((prev) => ({
          ...prev,
          currentScreen: target.screen,
          selectedProduct: target.productSlug ? { slug: target.productSlug } : null,
        }));
        return;
      }
      if (target.categorySlug) {
        try {
          const categories = await ensureCategories();
          if (cancelled) return;
          const match = categories.find((c) => c.slug === target.categorySlug);
          if (match) {
            setAppState((prev) => ({
              ...prev,
              currentScreen: "products",
              selectedCategory: match,
              selectedCategoryId: match.id,
            }));
          }
        } catch {
          // ignore
        }
        return;
      }
      setAppState((prev) => ({ ...prev, currentScreen: target.screen }));
    };

    const handler = () => applyHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    applyHash(window.location.hash);

    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", handler);
    };
  }, [appState.bootstrapping]);

  useEffect(() => {
    if (typeof window === "undefined" || appState.bootstrapping) return;
    const hash = buildHashFromState({
      screen: appState.currentScreen,
      categorySlug: appState.selectedCategory?.slug ?? appState.selectedCategoryId ?? null,
      productSlug: appState.selectedProduct?.slug ?? null,
    });
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [
    appState.bootstrapping,
    appState.currentScreen,
    appState.selectedCategory?.slug,
    appState.selectedProduct?.slug,
  ]);

  const renderScreen = () => {
    const isAuthMode = appState.currentScreen === "auth" || appState.currentScreen === "register";
    const needsAuth = authRequiredScreens.has(appState.currentScreen);
    if (isAuthMode || (needsAuth && !appState.user)) {
      const mode: "auth" | "register" = appState.currentScreen === "register" ? "register" : "auth";
      return <AuthScreen mode={mode} onAuthSuccess={handleAuthSuccess} onToggleMode={toggleAuthMode} />;
    }

    switch (appState.currentScreen) {
      case "splash":
        return (
          <SplashScreen
            onComplete={() =>
              updateAppState((prev) => {
                if (prev.splashComplete) return {};
                const next: Partial<AppState> = { splashComplete: true };
                if (!prev.bootstrapping) {
                  next.currentScreen = "onboarding";
                }
                return next;
              })
            }
          />
        );
      case "onboarding":
        return (
          <OnboardingScreen
            onComplete={() =>
              updateAppState((prev) => ({
                currentScreen: prev.postOnboardingScreen,
              }))
            }
          />
        );
      case "home":
        return <HomeScreen appState={appState} updateAppState={updateAppState} />;
      case "categories":
        return <CategoriesScreen appState={appState} updateAppState={updateAppState} />;
      case "products":
        return <ProductsScreen appState={appState} updateAppState={updateAppState} />;
      case "product-detail":
        return <ProductDetailScreen appState={appState} updateAppState={updateAppState} />;
      case "cart":
        return <CartScreen appState={appState} updateAppState={updateAppState} />;
      case "checkout":
        return <CheckoutScreen appState={appState} updateAppState={updateAppState} />;
      case "order-success":
        return <OrderSuccessScreen appState={appState} updateAppState={updateAppState} />;
      case "orders":
        return <OrdersScreen appState={appState} updateAppState={updateAppState} />;
      case "order-detail":
        return <OrderDetailScreen appState={appState} updateAppState={updateAppState} />;
      case "profile":
        return <ProfileScreen appState={appState} updateAppState={updateAppState} />;
      case "addresses":
        return <AddressesScreen appState={appState} updateAppState={updateAppState} />;
      case "loyalty-history":
        return <LoyaltyHistoryScreen appState={appState} updateAppState={updateAppState} />;
      case "about":
        return <AboutFasketScreen appState={appState} updateAppState={updateAppState} />;
      default:
        return <HomeScreen appState={appState} updateAppState={updateAppState} />;
    }
  };

  return <div className="relative w-full min-h-screen overflow-x-hidden">{renderScreen()}</div>;
}
