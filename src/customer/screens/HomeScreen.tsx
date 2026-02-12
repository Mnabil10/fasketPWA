import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import {
  Search,
  ShoppingCart,
  Bell,
  History,
  Sparkles,
  ChevronRight,
  Clock,
  Star,
  Truck,
  Store,
  Grid,
  UtensilsCrossed,
  ShoppingBag,
  Pill,
  MoreHorizontal,
} from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { useToast } from "../providers/ToastProvider";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import {
  useCart,
  useCartGuard,
  useCategories,
  useNetworkStatus,
  useProducts,
  useProviders,
  useSearchHistory,
  useApiErrorToast,
  useLastOrders,
  useFrequentlyBought,
  useFirstOrderWizard,
  useReorderFlow,
} from "../hooks";
import {
  EmptyState,
  NetworkBanner,
  ProductCard,
  ProductCardSkeleton,
  RetryBlock,
} from "../components";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { hashFromUrl, parseHash } from "../navigation/deepLinking";
import { goToCart, goToCategory, goToHome, goToOrders, goToProduct } from "../navigation/navigation";
import type { FirstOrderWizardResponse, Product, ProviderSummary } from "../../types/api";
import { trackAddToCart, trackPromoClick, trackSmartCtaClick, trackWizardCompleted, trackWizardShown } from "../../lib/analytics";
import { openExternalUrl } from "../../lib/fasketLinks";
import { extractApiError, mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { FASKET_GRADIENTS } from "../../styles/designSystem";
import type { CachedResult } from "../../lib/offlineCache";
import { getLocalizedString, isFeatureEnabled } from "../utils/mobileAppConfig";
import { resolveQuickAddProduct } from "../utils/productOptions";
import { buildQuickAddMap } from "../utils/quickAdd";
import { resolveSmartCta } from "../utils/growthPack";
import { dismissFirstOrderWizard } from "../../services/growth";
import { fmtEGP, fromCents } from "../../lib/money";

interface HomeScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

type PromoTile = {
  id: number | string;
  title: string;
  subtitle: string;
  image: string;
  action?: string | null;
  link?: string | null;
};

export function HomeScreen({ appState, updateAppState }: HomeScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const mobileConfig = appState.settings?.mobileApp ?? null;
  const growthPack = mobileConfig?.growthPack ?? null;
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const cartHook = useCart({ userId: appState.user?.id });
  const cartGuard = useCartGuard(cartHook);
  const { isOffline } = useNetworkStatus();
  const apiErrorToast = useApiErrorToast("products.error");
  const cartErrorToast = useApiErrorToast("cart.updateError");
  const providersQuery = useProviders();
  const selectedProvider = appState.selectedProvider ?? null;
  const providerId = selectedProvider?.id ?? appState.selectedProviderId ?? null;
  const providerSelected = Boolean(providerId);
  const providerLabel = selectedProvider
    ? lang === "ar"
      ? selectedProvider.nameAr || selectedProvider.name
      : selectedProvider.name || selectedProvider.nameAr
    : null;

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 250);
  const [searchScope, setSearchScope] = useState<"provider" | "all">(providerSelected ? "provider" : "all");
  const showingSearch = debouncedQ.trim().length > 0 && (searchScope === "all" || providerSelected);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const providerSectionRef = useRef<HTMLDivElement | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { history, addQuery, clearHistory } = useSearchHistory("home");
  const [ctaClock, setCtaClock] = useState(() => Date.now());
  const smartHomeConfig = growthPack?.smartHome ?? {};
  const showReorder = smartHomeConfig.showReorder ?? true;
  const showFrequentlyBought = smartHomeConfig.showFrequentlyBought ?? true;
  const reorderLimit = smartHomeConfig.reorderOrdersCount ?? 2;
  const frequentLimit = smartHomeConfig.frequentlyBoughtCount ?? 8;
  const lastOrdersQuery = useLastOrders(reorderLimit, { enabled: showReorder && Boolean(appState.user?.id) });
  const frequentlyBoughtQuery = useFrequentlyBought(frequentLimit, { enabled: showFrequentlyBought && Boolean(appState.user?.id) });
  const reorderConfig = growthPack?.reorder ?? {};
  const { reorder, reorderLoadingId, dialogs: reorderDialogs } = useReorderFlow({
    userId: appState.user?.id,
    allowAutoReplace: reorderConfig.allowAutoReplace ?? false,
    showChangesSummary: reorderConfig.showChangesSummary ?? true,
    onNavigateToCart: () => updateAppState({ currentScreen: "cart" }),
  });
  const smartCta = useMemo(() => resolveSmartCta(growthPack, lang, new Date(ctaClock)), [growthPack, lang, ctaClock]);
  const wizardQuery = useFirstOrderWizard({ enabled: Boolean(appState.user?.id) });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStepIndex, setWizardStepIndex] = useState(0);
  const [wizardPendingAction, setWizardPendingAction] = useState<any | null>(null);
  const wizardShownRef = useRef(false);
  const wizardDismissedRef = useRef(false);

  const sectionConfigs = mobileConfig?.home?.sections ?? [];
  const sectionByType = useMemo(() => {
    const map = new Map<string, (typeof sectionConfigs)[number]>();
    sectionConfigs.forEach((section) => {
      if (section?.type) {
        map.set(section.type, section);
      }
    });
    return map;
  }, [sectionConfigs]);
  const bestLimit = sectionByType.get("bestSelling")?.limit ?? 8;
  const hotLimit = sectionByType.get("hotOffers")?.limit ?? 8;
  const categoriesLimit = sectionByType.get("categories")?.limit ?? 12;

  const categoriesQuery = useCategories({ providerId }, { enabled: providerSelected });
  const bestQuery = useProducts(
    { type: "best-selling", limit: bestLimit, providerId },
    { enabled: providerSelected }
  );
  const hotQuery = useProducts(
    { type: "hot-offers", limit: hotLimit, providerId },
    { enabled: providerSelected }
  );
  const searchProviderId = searchScope === "provider" ? providerId : undefined;
  const searchQuery = useProducts(
    { search: debouncedQ || undefined, providerId: searchProviderId },
    { enabled: showingSearch && Boolean(debouncedQ) }
  );
  const staleData =
    (providersQuery.data?.stale ?? false) ||
    (providerSelected && (categoriesQuery.data?.stale ?? false)) ||
    (providerSelected && (bestQuery.data?.stale ?? false)) ||
    (providerSelected && (hotQuery.data?.stale ?? false)) ||
    (showingSearch && (searchQuery.data?.stale ?? false));

  const promoImages = [
    "https://images.unsplash.com/photo-1705727209465-b292e4129a37?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1665521032636-e8d2f6927053?auto=format&fit=crop&w=1080&q=80",
  ];
  type ProviderTypeKey = "restaurants" | "supermarket" | "pharmacy" | "other";
  const providers = providersQuery.data?.data ?? [];
  const quickAddMap = useMemo(() => buildQuickAddMap(cartHook.items), [cartHook.items]);
  const providerMap = useMemo(() => new Map(providers.map((p) => [p.id, p])), [providers]);
  const resolveProviderName = (providerId?: string | null) => {
    if (!providerId) return null;
    const provider = providerMap.get(providerId);
    if (!provider) return null;
    return lang === "ar" ? provider.nameAr || provider.name : provider.name || provider.nameAr;
  };

  const resolveProviderBadges = (provider: ProviderSummary | null) => {
    if (!provider) return [];
    const badges: Array<{ key: string; label: string; variant: "secondary" | "outline" }> = [];
    if (provider.supportsInstant) {
      badges.push({
        key: "instant",
        label: t("providers.badges.instant", "Fast delivery today"),
        variant: "secondary",
      });
    }
    if (provider.supportsPreorder) {
      badges.push({
        key: "preorder",
        label: t("providers.badges.preorder", "Delivery tomorrow morning"),
        variant: "outline",
      });
    }
    return badges;
  };

  const resolveProviderType = (provider?: ProviderSummary | null): ProviderTypeKey => {
    const raw = String(provider?.type ?? "").toLowerCase();
    if (/restaurant|restaurants|food|meal|kitchen|dine/.test(raw)) return "restaurants";
    if (/supermarket|grocery|market|mart/.test(raw)) return "supermarket";
    if (/pharmacy|pharm|drug|medicine/.test(raw)) return "pharmacy";
    return "other";
  };

  const providerTypeOptions = useMemo(
    () => [
      { key: "restaurants" as const, label: t("home.providerTypes.restaurants", "Restaurants"), icon: UtensilsCrossed },
      { key: "supermarket" as const, label: t("home.providerTypes.supermarket", "Supermarket"), icon: ShoppingBag },
      { key: "pharmacy" as const, label: t("home.providerTypes.pharmacy", "Pharmacy"), icon: Pill },
      { key: "other" as const, label: t("home.providerTypes.other", "Other"), icon: MoreHorizontal },
    ],
    [t]
  );

  const providerTypeCounts = useMemo(() => {
    const counts: Record<ProviderTypeKey, number> = {
      restaurants: 0,
      supermarket: 0,
      pharmacy: 0,
      other: 0,
    };
    providers.forEach((provider) => {
      const key = resolveProviderType(provider);
      counts[key] += 1;
    });
    return counts;
  }, [providers]);

  const [providerType, setProviderType] = useState<ProviderTypeKey | null>(null);

  useEffect(() => {
    if (providerType !== null) return;
    const ordered: ProviderTypeKey[] = ["restaurants", "supermarket", "pharmacy", "other"];
    const firstWithProviders = ordered.find((key) => providerTypeCounts[key] > 0) ?? "supermarket";
    setProviderType(firstWithProviders);
  }, [providerType, providerTypeCounts]);

  useEffect(() => {
    if (!providerType || !selectedProvider) return;
    if (resolveProviderType(selectedProvider) !== providerType) {
      updateAppState({
        selectedProvider: null,
        selectedProviderId: null,
        selectedCategory: null,
        selectedCategoryId: null,
      });
    }
  }, [providerType, selectedProvider, updateAppState]);

  useEffect(() => {
    if (!wizardQuery.data?.show) return;
    if (wizardShownRef.current) return;
    wizardShownRef.current = true;
    wizardDismissedRef.current = false;
    setWizardStepIndex(0);
    setWizardPendingAction(null);
    setWizardOpen(true);
    trackWizardShown("home");
  }, [wizardQuery.data?.show]);

  useEffect(() => {
    const interval = window.setInterval(() => setCtaClock(Date.now()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredProviders = useMemo(() => {
    if (!providerType) return providers;
    return providers.filter((provider) => resolveProviderType(provider) === providerType);
  }, [providers, providerType]);

  const promos: PromoTile[] = useMemo(() => {
    const promoConfig = mobileConfig?.home?.promos ?? [];
    if (promoConfig.length > 0) {
      return promoConfig.map((promo, index) => ({
        id: index + 1,
        title: getLocalizedString(promo.title, lang, ""),
        subtitle: getLocalizedString(promo.subtitle, lang, ""),
        image: promo.imageUrl,
        action: promo.action ?? null,
        link: promo.link ?? null,
      }));
    }
    const content = t("home.promotions", { returnObjects: true }) as Array<{ title: string; subtitle: string }>;
    return promoImages.map((image, index) => ({
      id: index + 1,
      title: content[index]?.title ?? "",
      subtitle: content[index]?.subtitle ?? "",
      image,
      action: null,
      link: null,
    }));
  }, [t, lang, mobileConfig?.home?.promos]);

  const handleAddToCart = async (product: Product) => {
    try {
      const resolved = await resolveQuickAddProduct(product, lang, !cartHook.isOffline);
      if (resolved.requiresOptions) {
        goToProduct(resolved.product.slug || resolved.product.id, updateAppState, { product: resolved.product });
        return;
      }
      const added = await cartGuard.requestAdd(resolved.product, 1, undefined, () => {
        trackAddToCart(resolved.product.id, 1);
        showToast({ type: "success", message: t("products.buttons.added") });
      }, { nextProviderLabel: providerLabel });
      if (!added) return;
    } catch (error: any) {
      const { code } = extractApiError(error);
      const productName = lang === "ar"
        ? product.nameAr || product.name || t("product.title", "Product")
        : product.name || product.nameAr || t("product.title", "Product");
      if (code === "CART_PRODUCT_OUT_OF_STOCK") {
        showToast({
          type: "error",
          message: t("errors.cartProductOutOfStockNamed", {
            product: productName,
            defaultValue: `${productName} is out of stock right now.`,
          }),
        });
        return;
      }
      if (code === "CART_PRODUCT_UNAVAILABLE") {
        showToast({
          type: "error",
          message: t("errors.cartProductUnavailableNamed", {
            product: productName,
            defaultValue: `${productName} is currently unavailable.`,
          }),
        });
        return;
      }
      apiErrorToast(error, "products.error");
    }
  };

  const handleQuickIncrease = async (product: Product) => {
    const quick = quickAddMap.get(product.id);
    if (!quick) {
      await handleAddToCart(product);
      return;
    }
    try {
      await cartHook.updateQuantity({ itemId: quick.itemId, productId: product.id, qty: quick.qty + 1 });
    } catch (error) {
      cartErrorToast(error, "cart.updateError");
    }
  };

  const handleQuickDecrease = async (product: Product) => {
    const quick = quickAddMap.get(product.id);
    if (!quick) return;
    try {
      if (quick.qty <= 1) {
        await cartHook.removeItem({ itemId: quick.itemId, productId: product.id });
        return;
      }
      await cartHook.updateQuantity({ itemId: quick.itemId, productId: product.id, qty: quick.qty - 1 });
    } catch (error) {
      cartErrorToast(error, "cart.updateError");
    }
  };

  const handleProviderSelect = (provider: ProviderSummary) => {
    updateAppState({
      selectedProvider: provider,
      selectedProviderId: provider.id,
      selectedCategory: null,
      selectedCategoryId: null,
      currentScreen: "categories",
    });
  };

  const navigateToHash = (hash: string) => {
    const target = parseHash(hash);
    if (!target) return false;
    if (target.screen === "products" && target.categorySlug) {
      goToCategory(target.categorySlug, updateAppState);
      return true;
    }
    if (target.screen === "product-detail" && target.productSlug) {
      goToProduct(target.productSlug, updateAppState);
      return true;
    }
    if (target.screen === "home") {
      goToHome(updateAppState);
      return true;
    }
    if (target.screen === "cart") {
      goToCart(updateAppState);
      return true;
    }
    if (target.screen === "orders") {
      goToOrders(updateAppState);
      return true;
    }
    updateAppState({ currentScreen: target.screen });
    return true;
  };

  const handlePromoAction = async (promo: PromoTile) => {
    const rawAction = `${promo.action ?? promo.link ?? ""}`.trim();
    trackPromoClick(String(promo.id), promo.action ?? null, promo.link ?? null);
    if (!rawAction) {
      updateAppState({ currentScreen: "categories" });
      return;
    }

    if (/^(https?:\/\/|mailto:|tel:)/i.test(rawAction)) {
      await openExternalUrl(rawAction);
      return;
    }

    if (rawAction.startsWith("category:")) {
      const slug = rawAction.slice("category:".length).trim();
      if (slug) goToCategory(slug, updateAppState);
      return;
    }

    if (rawAction.startsWith("product:")) {
      const slug = rawAction.slice("product:".length).trim();
      if (slug) goToProduct(slug, updateAppState);
      return;
    }

    if (rawAction.startsWith("screen:")) {
      const screen = rawAction.slice("screen:".length).trim();
      if (screen) {
        const hash = hashFromUrl(`/${screen}`);
        if (hash && navigateToHash(hash)) return;
      }
      updateAppState({ currentScreen: "categories" });
      return;
    }

    const normalized = rawAction.startsWith("#") || rawAction.startsWith("/") ? rawAction : `/${rawAction}`;
    const hash = hashFromUrl(normalized);
    if (hash && navigateToHash(hash)) return;

    updateAppState({ currentScreen: "categories" });
  };

  const applyGrowthAction = (action?: { type?: string; vendorId?: string; mode?: "INSTANT" | "PREORDER" }) => {
    if (!action) {
      updateAppState({ currentScreen: "categories" });
      return;
    }
    const preferredMode =
      action.mode === "PREORDER" ? "SCHEDULED" : action.mode === "INSTANT" ? "ASAP" : null;
    const preferredPatch: { preferredDeliveryMode?: "ASAP" | "SCHEDULED" } =
      preferredMode ? { preferredDeliveryMode: preferredMode } : {};
    if (action.type === "OPEN_VENDOR") {
      const providerId = action.vendorId;
      if (providerId) {
        const provider = providerMap.get(providerId);
        if (provider) {
          updateAppState({
            selectedProvider: provider,
            selectedProviderId: provider.id,
            currentScreen: "categories",
            ...preferredPatch,
          });
          return;
        }
      }
    }
    if (action.type === "OPEN_HOME_SECTIONS") {
      if (preferredMode) {
        updateAppState({ ...preferredPatch });
      }
      providerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    updateAppState({
      currentScreen: providerSelected ? "categories" : "home",
      ...preferredPatch,
    });
  };

  const handleSmartCtaClick = () => {
    if (!smartCta) return;
    trackSmartCtaClick(smartCta.id, smartCta.action?.type, smartCta.action?.vendorId ?? null);
    applyGrowthAction(smartCta.action);
  };

  const handleWizardOption = async (option?: { id?: string; action?: any }) => {
    if (!option) return;
    const totalSteps = wizardSteps.length;
    const isLastStep = totalSteps === 0 || wizardStepIndex >= totalSteps - 1;
    const nextAction = option.action ?? wizardPendingAction;

    if (!isLastStep) {
      if (option.action) {
        setWizardPendingAction(option.action);
      }
      setWizardStepIndex((prev) => Math.min(prev + 1, Math.max(totalSteps - 1, 0)));
      return;
    }

    const vendorId = (option.action?.vendorId ?? wizardPendingAction?.vendorId) ?? null;
    trackWizardCompleted(option.id, vendorId);
    setWizardOpen(false);
    setWizardStepIndex(0);
    setWizardPendingAction(null);
    if (!wizardDismissedRef.current) {
      wizardDismissedRef.current = true;
      await dismissFirstOrderWizard().catch(() => undefined);
    }
    applyGrowthAction(nextAction);
  };

  const handleWizardSkip = async () => {
    setWizardOpen(false);
    setWizardStepIndex(0);
    setWizardPendingAction(null);
    if (!wizardDismissedRef.current) {
      wizardDismissedRef.current = true;
      await dismissFirstOrderWizard().catch(() => undefined);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchScope === "provider" && !providerSelected) {
      showToast({
        type: "info",
        message: t("home.selectProviderPrompt", "Select a provider to browse products."),
      });
      return;
    }
    addQuery(q);
    if (!showingSearch) return;
    searchQuery.refetch();
  };

  const greeting = appState.user
    ? t("home.greeting", { name: appState.user?.name?.split(" ")[0] || "" })
    : t("home.greetingGuest");
  const searchPlaceholder =
    searchScope === "all"
      ? t("home.searchPlaceholderGlobal", "Search across providers")
      : providerSelected
        ? t("home.searchPlaceholder")
        : t("home.searchProviderPlaceholder", "Select a provider to start searching");

  useEffect(() => {
    if (!providerSelected && searchScope === "provider") {
      setSearchScope("all");
    }
  }, [providerSelected, searchScope]);

  const heroConfig = mobileConfig?.home?.hero ?? {};
  const isArabic = lang === "ar" || (typeof document !== "undefined" && document.documentElement.getAttribute("dir") === "rtl");
  const tAr = isArabic ? i18n.getFixedT("ar") : t;
  const rawPrompt = typeof heroConfig.prompt === "string"
    ? heroConfig.prompt
    : getLocalizedString(heroConfig.prompt, lang, t("home.prompt"));
  const heroPrompt = (isArabic && rawPrompt === "Start shopping today") ? tAr("home.prompt") : rawPrompt;
  const heroTitle = getLocalizedString(heroConfig.title, lang, greeting);
  const rawSubtitle = typeof heroConfig.subtitle === "string"
    ? heroConfig.subtitle
    : getLocalizedString(heroConfig.subtitle, lang, t("home.heroSubtitle"));
  const heroSubtitle = (isArabic && rawSubtitle === "Fresh groceries and essentials delivered fast.") ? tAr("home.heroSubtitle") : rawSubtitle;
  const heroGradient = mobileConfig?.theme?.heroGradient || `var(--hero-gradient, ${FASKET_GRADIENTS.hero})`;
  const wizardData: FirstOrderWizardResponse | null = wizardQuery.data ?? null;
  const wizardSteps = wizardData?.steps ?? [];
  const wizardStep = wizardSteps[wizardStepIndex] ?? null;
  const isDeliveryModeStep = Boolean(
    wizardStep?.options?.some((o) => o.action?.mode === "INSTANT" || o.action?.mode === "PREORDER")
  );
  const wizardTitleFallback = isDeliveryModeStep ? t("home.wizard.deliveryMode.title") : t("home.wizard.title", "Start your first order");
  const wizardSubtitleFallback = isDeliveryModeStep ? t("home.wizard.deliveryMode.subtitle") : "";
  const rawWizardTitle = wizardStep
    ? getLocalizedString(wizardStep.title, lang, wizardTitleFallback)
    : t("home.wizard.title", "Start your first order");
  const rawWizardSubtitle = wizardStep
    ? getLocalizedString(wizardStep.subtitle, lang, wizardSubtitleFallback)
    : "";
  const wizardTitle = (isArabic && rawWizardTitle === "How do you want your delivery?") ? tAr("home.wizard.deliveryMode.title") : rawWizardTitle;
  const wizardSubtitle = (isArabic && rawWizardSubtitle === "Pick a mode to start shopping fast.") ? tAr("home.wizard.deliveryMode.subtitle") : rawWizardSubtitle;

  const resolvePillIcon = (name?: string) => {
    const key = (name || "").toLowerCase();
    if (key === "clock" || key === "time") return Clock;
    if (key === "truck" || key === "delivery") return Truck;
    if (key === "star" || key === "quality") return Star;
    return Sparkles;
  };

  const pillLabelFromConfig = (raw: string) => {
    const key = raw.trim().toLowerCase();
    const tr = isArabic ? i18n.getFixedT("ar") : t;
    if (key === "30-45 min delivery") return tr("home.deliveryEtaLabel");
    if (key === "citywide coverage") return tr("home.coverageLabel");
    if (key === "quality picks") return tr("home.qualityLabel");
    return raw;
  };
  const highlightPills =
    heroConfig.pills && heroConfig.pills.length > 0
      ? heroConfig.pills.map((pill) => {
        const resolved = getLocalizedString(pill.label, lang, "");
        return { icon: resolvePillIcon(pill.icon), label: pillLabelFromConfig(resolved) || resolved };
      })
      : [
        { icon: Clock, label: tAr("home.deliveryEtaLabel") },
        { icon: Truck, label: tAr("home.coverageLabel") },
        { icon: Star, label: tAr("home.qualityLabel") },
      ];
  const loyaltyWidgetEnabled = Boolean(appState.user && isFeatureEnabled(mobileConfig, "loyalty", true));
  const topCategories = (categoriesQuery.data?.data ?? []).slice(0, categoriesLimit);

  const renderProductsSection = (
    title: string,
    query: UseQueryResult<CachedResult<Product[]>, Error>,
    emptyAction?: () => void,
    options?: { showProviderMeta?: boolean }
  ) => {
    const products = query.data?.data ?? [];
    const showProviderMeta = options?.showProviderMeta ?? false;
    const sortedProducts = products;
    if (query.isError) {
      return (
        <RetryBlock
          message={mapApiErrorToMessage(query.error, "products.error")}
          onRetry={() => query.refetch()}
        />
      );
    }
    return (
      <div className="section-card space-y-4 motion-fade">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">{t("home.sections.curated", "Curated for you")}</p>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          {emptyAction && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary px-2"
              onClick={emptyAction}
            >
              {t("home.promotionsCta")}
            </Button>
          )}
        </div>
        {query.isLoading ? (
          <div className="premium-grid">
            {Array.from({ length: 4 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} imageVariant="compact" />
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className="premium-grid">
            {sortedProducts.map((p) => {
              const quick = quickAddMap.get(p.id) ?? null;
              const providerName = showProviderMeta ? resolveProviderName(p.providerId) : null;
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  imageVariant="compact"
                  adding={cartHook.addingProductId === p.id}
                  disabled={isOffline}
                  onAddToCart={handleAddToCart}
                  quantity={quick?.qty ?? 0}
                  onIncrease={() => handleQuickIncrease(p)}
                  onDecrease={() => handleQuickDecrease(p)}
                  metaLabel={providerName || undefined}
                  onPress={(product) => {
                    if (showProviderMeta && product.providerId) {
                      const provider = providerMap.get(product.providerId);
                      updateAppState({
                        selectedProvider: provider ?? null,
                        selectedProviderId: product.providerId,
                      });
                    }
                    goToProduct(product.slug || product.id, updateAppState, { product });
                  }}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={t("home.emptySearchTitle")}
            subtitle={t("home.emptySearchSubtitle")}
            actionLabel={emptyAction ? t("home.promotionsCta") : undefined}
            onAction={emptyAction}
          />
        )}
      </div>
    );
  };

  const renderProvidersSection = () => {
    if (providersQuery.isError) {
      return (
        <div className="section-card">
          <RetryBlock
            message={mapApiErrorToMessage(providersQuery.error, "providers.error")}
            onRetry={() => providersQuery.refetch()}
          />
        </div>
      );
    }

    return (
      <div ref={providerSectionRef} className="section-card cupertino-inset space-y-4 motion-fade">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">
              {t("home.providersSubtitle", "Pick a provider to start shopping")}
            </p>
            <h2 className="text-xl font-semibold text-gray-900">
              {providerType
                ? providerTypeOptions.find((opt) => opt.key === providerType)?.label ?? t("home.providersTitle", "Providers")
                : t("home.providersTitle", "Providers")}
            </h2>
          </div>
          {selectedProvider && (
            <div className="text-[11px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {t("home.providersSelected", "Selected")}: {selectedProvider.name}
            </div>
          )}
        </div>
        {providersQuery.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-24 rounded-2xl bg-white border border-border shadow-card skeleton-soft" />
            ))}
          </div>
        ) : filteredProviders.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProviders.map((provider) => {
              const isSelected = providerId === provider.id;
              const ratingLabel =
                provider.ratingCount && provider.ratingCount > 0
                  ? `${Number(provider.ratingAvg ?? 0).toFixed(1)} (${provider.ratingCount})`
                  : t("home.providersNew", "New");
              return (
                <button
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider)}
                  className={`rounded-2xl border p-3 shadow-card transition-transform duration-200 hover:-translate-y-0.5 ${isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"} ${
                    i18n.dir() === "rtl" ? "text-right" : "text-left"
                  }`}
                >
                  <div className={`flex items-start gap-3 ${i18n.dir() === "rtl" ? "flex-row-reverse" : ""}`}>
                    <div className="w-12 h-12 rounded-xl bg-white shadow-inner flex items-center justify-center overflow-hidden p-1">
                      {provider.logoUrl ? (
                          <ImageWithFallback
                            src={provider.logoUrl}
                            alt={provider.name}
                            className="w-full h-full object-contain"
                          />
                      ) : (
                        <Store className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{provider.name}</p>
                      <div className={`flex items-center gap-1 text-xs text-gray-500 ${i18n.dir() === "rtl" ? "justify-end" : ""}`}>
                        <Star className="w-3 h-3 text-amber-500" />
                        <span className="line-clamp-1">{ratingLabel}</span>
                      </div>
                      {(() => {
                        const badges = resolveProviderBadges(provider);
                        if (!badges.length) return null;
                          return (
                            <div className={`mt-2 flex flex-wrap gap-1 ${i18n.dir() === "rtl" ? "justify-end" : ""}`}>
                              {badges.map((badge) => (
                                <Badge
                                  key={badge.key}
                                  variant={badge.variant}
                                  className="text-[10px] rounded-full px-2 py-1 leading-tight whitespace-normal break-words max-w-full overflow-visible"
                                >
                                  {badge.label}
                                </Badge>
                              ))}
                            </div>
                          );
                        })()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={t("home.providerTypes.emptyTitle", "No providers here yet")}
            subtitle={t("home.providerTypes.emptySubtitle", "Try another category to keep shopping.")}
          />
        )}
      </div>
    );
  };

  const renderReorderSection = () => {
    if (!showReorder || !appState.user) return null;
    const orders = lastOrdersQuery.data ?? [];
    if (!lastOrdersQuery.isLoading && orders.length === 0) return null;
    return (
      <div className="section-card space-y-4 motion-fade">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">{t("home.reorder.subtitle", "Quick repeat")}</p>
            <h2 className="text-xl font-semibold text-gray-900">{t("home.reorder.title", "Reorder")}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary px-2"
            onClick={() => updateAppState({ currentScreen: "orders" })}
          >
            {t("home.reorder.viewAll", "View all")}
          </Button>
        </div>
        {lastOrdersQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: Math.min(reorderLimit, 2) }).map((_, idx) => (
              <div key={idx} className="h-16 rounded-xl bg-gray-100 skeleton-soft" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const providerName =
                lang === "ar"
                  ? order.providerNameAr || order.providerName || t("providers.providerFallback", "Provider")
                  : order.providerName || order.providerNameAr || t("providers.providerFallback", "Provider");
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-border bg-white p-3 shadow-card flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{providerName}</p>
                    <p className="text-xs text-gray-500">
                      {t("home.reorder.itemsCount", {
                        count: order.itemsCount ?? 0,
                        defaultValue: `${order.itemsCount ?? 0} items`,
                      })}
                    </p>
                    <p className="text-xs text-gray-400">#{order.code ?? order.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary price-text">
                        {fmtEGP(fromCents(order.totalCents))}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reorder(order.id, order.providerId ?? null)}
                      disabled={reorderLoadingId === order.id}
                    >
                      {reorderLoadingId === order.id
                        ? t("orders.reorderLoading", "Reordering...")
                        : t("orders.reorder", "Reorder")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderFrequentlyBoughtSection = () => {
    if (!showFrequentlyBought || !appState.user) return null;
    const products = frequentlyBoughtQuery.data ?? [];
    if (!frequentlyBoughtQuery.isLoading && products.length === 0) return null;
    return (
      <div className="section-card space-y-4 motion-fade">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">{t("home.frequently.subtitle", "Picked for you")}</p>
            <h2 className="text-xl font-semibold text-gray-900">{t("home.frequently.title", "Frequently bought")}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary px-2"
            onClick={() => updateAppState({ currentScreen: "categories" })}
          >
            {t("home.frequently.cta", "Shop more")}
          </Button>
        </div>
        {frequentlyBoughtQuery.isLoading ? (
          <div className="premium-grid">
            {Array.from({ length: 4 }).map((_, idx) => (
              <ProductCardSkeleton key={idx} imageVariant="compact" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="premium-grid">
            {products.map((product) => {
              const quick = quickAddMap.get(product.id) ?? null;
              const providerName = resolveProviderName(product.providerId) || undefined;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  imageVariant="compact"
                  adding={cartHook.addingProductId === product.id}
                  disabled={isOffline}
                  onAddToCart={handleAddToCart}
                  quantity={quick?.qty ?? 0}
                  onIncrease={() => handleQuickIncrease(product)}
                  onDecrease={() => handleQuickDecrease(product)}
                  metaLabel={providerName}
                  onPress={(p) => {
                    if (p.providerId) {
                      const provider = providerMap.get(p.providerId);
                      updateAppState({
                        selectedProvider: provider ?? null,
                        selectedProviderId: p.providerId,
                      });
                    }
                    goToProduct(p.slug || p.id, updateAppState, { product: p });
                  }}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  const renderSmartCta = () => {
    if (!smartCta || !smartCta.title) return null;
    return (
      <div className="section-card space-y-3 bg-gradient-to-r from-primary/10 via-white to-primary/5 border border-primary/10 motion-fade">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">{t("home.smartCta.kicker", "Just for you")}</p>
            <h2 className="text-xl font-semibold text-gray-900">{smartCta.title}</h2>
            {smartCta.subtitle ? (
              <p className="text-sm text-gray-600">{smartCta.subtitle}</p>
            ) : null}
          </div>
          <Button className="rounded-xl" onClick={handleSmartCtaClick}>
            {t("home.smartCta.cta", "Start order")}
          </Button>
        </div>
      </div>
    );
  };

  const heroSectionEnabled = sectionByType.get("hero")?.enabled !== false;
  const defaultSections = [
    { id: "promos", type: "promos" },
    { id: "categories", type: "categories" },
    { id: "best-selling", type: "bestSelling" },
    { id: "hot-offers", type: "hotOffers" },
  ];
  const configuredSections = sectionConfigs
    .filter((section) => section?.type && section.type !== "hero")
    .filter((section) => section.enabled !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const sectionsToRender = providerSelected
    ? configuredSections.length > 0
      ? configuredSections
      : defaultSections
    : [];

  const resolveSectionTitle = (section: any, fallbackKey: string, fallbackDefault?: string) => {
    const fallbackText = fallbackDefault ? t(fallbackKey, fallbackDefault) : t(fallbackKey);
    return getLocalizedString(section?.title, lang, fallbackText);
  };
  const resolveSectionSubtitle = (section: any, fallbackKey: string, fallbackDefault?: string) => {
    const fallbackText = fallbackDefault ? t(fallbackKey, fallbackDefault) : t(fallbackKey);
    return getLocalizedString(section?.subtitle, lang, fallbackText);
  };

  const renderSection = (section: any) => {
    switch (section.type) {
      case "promos":
        if (!promos.length) return null;
        return (
          <div key={section.id || "promos"} className="section-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">
                  {resolveSectionSubtitle(section, "home.sections.hotOffers")}
                </p>
                <h2 className="text-xl font-semibold text-gray-900">
                  {resolveSectionTitle(section, "home.sections.bestSelling")}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => updateAppState({ currentScreen: "categories" })}
              >
                {t("home.promotionsCta")}
                <ChevronRight className={`w-4 h-4 shrink-0 ${i18n.dir() === "rtl" ? "rotate-180" : ""}`} />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {promos.map((promo) => (
                <div
                  key={promo.id}
                  className="relative rounded-2xl overflow-hidden shadow-card bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center gap-4 motion-fade"
                >
                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-semibold">{promo.title}</h3>
                    <p className="text-sm text-white/90">{promo.subtitle}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() => handlePromoAction(promo)}
                    >
                      {t("home.promotionsCta")}
                    </Button>
                  </div>
                  <div className="w-28 h-28 rounded-xl overflow-hidden border border-white/20 flex-shrink-0">
                    <ImageWithFallback src={promo.image} alt={promo.title} className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "categories":
        return (
          <div key={section.id || "categories"} className="section-card space-y-4 motion-fade">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{resolveSectionSubtitle(section, "home.sections.categories")}</p>
                <h2 className="text-xl font-semibold text-gray-900">
                  {resolveSectionTitle(section, "home.categoryHeadline", "Shop by category")}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => updateAppState({ currentScreen: "categories" })}
              >
                {t("home.promotionsCta")}
              </Button>
            </div>
            {categoriesQuery.isError && (
              <RetryBlock
                message={mapApiErrorToMessage(categoriesQuery.error, "categories.errorLoading")}
                onRetry={() => categoriesQuery.refetch()}
              />
            )}
            {categoriesQuery.isLoading ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="w-28 h-28 rounded-2xl bg-gray-100 skeleton-soft" />
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                {topCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onCategorySelect(c.slug, c.id, c)}
                    className="min-w-[120px] max-w-[140px] bg-white rounded-2xl border border-border shadow-card p-3 text-left hover:-translate-y-0.5 transition-transform duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-2 overflow-hidden">
                      {c.imageUrl ? (
                        <ImageWithFallback src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{c.name}</p>
                    <p className="text-xs text-gray-500">{t("home.categoryCta", "View items")}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      case "bestSelling":
        return renderProductsSection(resolveSectionTitle(section, "home.sections.bestSelling"), bestQuery);
      case "hotOffers":
        return renderProductsSection(resolveSectionTitle(section, "home.sections.hotOffers"), hotQuery);
      default:
        return null;
    }
  };

  return (
    <div className="page-shell">
      <NetworkBanner stale={staleData} />
      {heroSectionEnabled && (
        <div className="section-card cupertino-hero space-y-4 glass-surface" style={{ background: heroGradient }}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-gray-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {heroPrompt}
              </p>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{heroTitle}</h1>
              <p className="text-sm text-gray-700">{heroSubtitle}</p>
              {highlightPills.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {highlightPills.map((pill) => (
                    <div
                      key={pill.label}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 border border-white/50 shadow-sm text-xs text-gray-700"
                    >
                      <pill.icon className="w-4 h-4 text-primary" />
                      <span>{pill.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* TODO: Show notification icon when ready */}
              {/* <Button variant="ghost" size="sm" className="p-2 rounded-full">
                <Bell className="w-5 h-5" />
              </Button> */}
              <Button
                variant="ghost"
                size="sm"
                className="p-2 relative rounded-full"
                onClick={() => goToCart(updateAppState)}
              >
                <ShoppingCart className="w-5 h-5" />
                {cartHook.items.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartHook.items.length}
                  </div>
                )}
              </Button>
            </div>
          </div>

          <form className="relative" onSubmit={handleSearchSubmit}>
            <Search
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 ${i18n.dir() === "rtl" ? "right-4" : "left-4"
                }`}
            />
            <Input
              placeholder={searchPlaceholder}
              disabled={searchScope === "provider" && !providerSelected}
              className={`h-12 cupertino-search-input rounded-2xl bg-white/80 border-none shadow-inner ${i18n.dir() === "rtl" ? "pr-12 text-right" : "pl-12"}`}
              value={q}
              ref={searchInputRef}
              onFocus={() => setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 100)}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" className="hidden" />
            {showHistory && history.length > 0 && (
              <div className="absolute z-10 mt-2 left-0 right-0 bg-white rounded-2xl shadow-card border max-h-48 overflow-auto">
                <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3" /> {t("products.recentSearches", "Recent searches")}
                  </span>
                  <button className="text-primary" type="button" onClick={() => clearHistory()}>
                    {t("products.clearHistory", "Clear")}
                  </button>
                </div>
                {history.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQ(item);
                      addQuery(item);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-600">{t("home.searchScopeLabel", "Search scope")}</span>
            <div className="cupertino-segmented inline-flex">
              <button
                type="button"
                data-active={searchScope === "provider"}
                disabled={!providerSelected}
                onClick={() => setSearchScope("provider")}
              >
                {providerSelected
                  ? t("home.searchScope.provider", { provider: providerLabel ?? t("home.providersTitle", "Provider") })
                  : t("home.searchScope.providerFallback", "Within provider")}
              </button>
              <button
                type="button"
                data-active={searchScope === "all"}
                onClick={() => setSearchScope("all")}
              >
                {t("home.searchScope.all", "All providers")}
              </button>
            </div>
          </div>

          {loyaltyWidgetEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
              <div className="bg-white/80 rounded-2xl border border-border shadow-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t("home.loyaltyWidget.title")}</p>
                  <p className="text-2xl font-semibold text-primary">
                    {appState.user?.loyaltyPoints ?? appState.user?.points ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">{t("home.loyaltyWidget.subtitle")}</p>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl"
                  variant="outline"
                  onClick={() => updateAppState({ currentScreen: "checkout" })}
                >
                  {t("home.loyaltyWidget.cta")}
                </Button>
              </div>
              <div className="rounded-2xl bg-primary text-white p-4 shadow-card space-y-1">
                <p className="text-xs text-white/80">{t("home.deliveryEtaLabel")}</p>
                <p className="text-lg font-semibold">{t("home.coverageLabel")}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => updateAppState({ currentScreen: "categories" })}
                >
                  {t("home.promotionsCta")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-5">
        {renderSmartCta()}
        {renderReorderSection()}
        {renderFrequentlyBoughtSection()}
        <div className="section-card cupertino-inset">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              {
                key: "search",
                title: t("home.quickPaths.searchTitle", "Quick search"),
                subtitle: t("home.quickPaths.searchSubtitle", "Find items in seconds"),
                icon: Search,
                action: () => {
                  searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  searchInputRef.current?.focus();
                },
              },
              {
                key: "providers",
                title: t("home.quickPaths.providersTitle", "Shop by provider"),
                subtitle: t("home.quickPaths.providersSubtitle", "Pick a trusted store"),
                icon: Store,
                action: () => providerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              {
                key: "categories",
                title: t("home.quickPaths.categoriesTitle", "Shop by category"),
                subtitle: t("home.quickPaths.categoriesSubtitle", "Browse essentials fast"),
                icon: Grid,
                action: () => {
                  if (!providerSelected) {
                    showToast({
                      type: "info",
                      message: t("home.selectProviderPrompt", "Select a provider to browse products."),
                    });
                    providerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    return;
                  }
                  updateAppState({ currentScreen: "categories" });
                },
              },
            ].map((card) => (
              <button
                key={card.key}
                onClick={card.action}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-3 sm:p-4 text-center shadow-sm hover:shadow-md hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <card.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 w-full space-y-0.5">
                  <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{card.title}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2 leading-tight hidden sm:block">{card.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="section-card cupertino-inset space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{t("home.providerTypes.subtitle", "Choose a market type")}</p>
              <h2 className="text-xl font-semibold text-gray-900">
                {t("home.providerTypes.title", "Shop by type")}
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {providerTypeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = providerType === option.key;
              const count = providerTypeCounts[option.key];
              return (
                <button
                  key={option.key}
                  onClick={() => {
                    setProviderType(option.key);
                    providerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`rounded-2xl border p-4 text-left shadow-card transition-transform duration-200 hover:-translate-y-0.5 ${
                    isActive ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-gray-500">{count}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{option.label}</p>
                </button>
              );
            })}
          </div>
        </div>
        {renderProvidersSection()}
        {showingSearch ? (
          renderProductsSection(
            t("home.sections.searchResults"),
            searchQuery,
            () => updateAppState({ currentScreen: "categories" }),
            { showProviderMeta: searchScope === "all" }
          )
        ) : !providerSelected ? (
          <EmptyState
            title={t("home.providersPromptTitle", "Choose a provider to continue")}
            subtitle={t("home.providersPromptSubtitle", "Providers have their own categories and products.")}
          />
        ) : (
          sectionsToRender.map((section, index) => (
            <React.Fragment key={section.id || section.type || `section-${index}`}>
              {renderSection(section)}
            </React.Fragment>
          ))
        )}
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
      {cartGuard.dialog}
      {reorderDialogs}
      <Dialog
        open={wizardOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleWizardSkip();
          } else {
            setWizardOpen(true);
          }
        }}
      >
        <DialogContent
          className="max-h-[80vh] overflow-y-auto space-y-4"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>{wizardTitle}</DialogTitle>
          </DialogHeader>
          {wizardSubtitle ? <p className="text-sm text-gray-600">{wizardSubtitle}</p> : null}
          {wizardStep?.options && wizardStep.options.length > 0 ? (
            <div className="space-y-2">
              {wizardStep.options.map((option) => {
                const optionFallback =
                  option.action?.mode === "INSTANT"
                    ? tAr("home.wizard.deliveryMode.instant")
                    : option.action?.mode === "PREORDER"
                      ? tAr("home.wizard.deliveryMode.schedule")
                      : "";
                let label = getLocalizedString(option.label, lang, optionFallback);
                if (isArabic) {
                  if (label === "Fast delivery today") label = tAr("home.wizard.deliveryMode.instant");
                  else if (label === "Schedule for tomorrow") label = tAr("home.wizard.deliveryMode.schedule");
                }
                const isRtl = i18n.dir() === "rtl";
                return (
                  <Button
                    key={option.id}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => handleWizardOption(option)}
                  >
                    <span>{label}</span>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
                  </Button>
                );
              })}
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleWizardSkip}>
              {tAr("home.wizard.skip", "Skip")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function onCategorySelect(slug?: string | null, id?: string | null, category?: any) {
    goToCategory(slug ?? null, updateAppState, { category, categoryId: id ?? null });
  }
}
