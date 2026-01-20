import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Search, ShoppingCart, Bell, History, Sparkles, ChevronRight, Clock, Star, Truck, Store } from "lucide-react";
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
import type { Product, ProviderSummary } from "../../types/api";
import { trackAddToCart, trackPromoClick } from "../../lib/analytics";
import { openExternalUrl } from "../../lib/fasketLinks";
import { extractApiError, mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { FASKET_GRADIENTS } from "../../styles/designSystem";
import type { CachedResult } from "../../lib/offlineCache";
import { getLocalizedString, isFeatureEnabled } from "../utils/mobileAppConfig";
import { resolveQuickAddProduct } from "../utils/productOptions";

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
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const cartHook = useCart({ userId: appState.user?.id });
  const cartGuard = useCartGuard(cartHook);
  const { isOffline } = useNetworkStatus();
  const apiErrorToast = useApiErrorToast("products.error");
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
  const showingSearch = providerSelected && debouncedQ.trim().length > 0;
  const [showHistory, setShowHistory] = useState(false);
  const { history, addQuery, clearHistory } = useSearchHistory("home");

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
  const searchQuery = useProducts(
    { search: debouncedQ || undefined, providerId },
    { enabled: showingSearch && Boolean(debouncedQ) && providerSelected }
  );
  const staleData =
    (providersQuery.data?.stale ?? false) ||
    (providerSelected && (categoriesQuery.data?.stale ?? false)) ||
    (providerSelected && (bestQuery.data?.stale ?? false)) ||
    (providerSelected && (hotQuery.data?.stale ?? false)) ||
    (providerSelected && (searchQuery.data?.stale ?? false));

  const promoImages = [
    "https://images.unsplash.com/photo-1705727209465-b292e4129a37?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1665521032636-e8d2f6927053?auto=format&fit=crop&w=1080&q=80",
  ];
  const providers = providersQuery.data?.data ?? [];

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerSelected) {
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
  const searchPlaceholder = providerSelected
    ? t("home.searchPlaceholder")
    : t("home.searchProviderPlaceholder", "Select a provider to start searching");

  const heroConfig = mobileConfig?.home?.hero ?? {};
  const heroPrompt = getLocalizedString(heroConfig.prompt, lang, t("home.prompt"));
  const heroTitle = getLocalizedString(heroConfig.title, lang, greeting);
  const heroSubtitle = getLocalizedString(
    heroConfig.subtitle,
    lang,
    t("home.subtitlePremium", "Your premium online supermarket in Badr City.")
  );
  const heroGradient = mobileConfig?.theme?.heroGradient || `var(--hero-gradient, ${FASKET_GRADIENTS.hero})`;

  const resolvePillIcon = (name?: string) => {
    const key = (name || "").toLowerCase();
    if (key === "clock" || key === "time") return Clock;
    if (key === "truck" || key === "delivery") return Truck;
    if (key === "star" || key === "quality") return Star;
    return Sparkles;
  };

  const highlightPills =
    heroConfig.pills && heroConfig.pills.length > 0
      ? heroConfig.pills.map((pill) => ({
          icon: resolvePillIcon(pill.icon),
          label: getLocalizedString(pill.label, lang, ""),
        }))
      : [
          { icon: Clock, label: t("home.deliveryEta", "30-45 min delivery") },
          { icon: Truck, label: t("home.coveragePromise", "We cover all of Badr City") },
          { icon: Star, label: t("home.qualityPromise", "Handpicked quality products") },
        ];
  const loyaltyWidgetEnabled = Boolean(appState.user && isFeatureEnabled(mobileConfig, "loyalty", true));
  const topCategories = (categoriesQuery.data?.data ?? []).slice(0, categoriesLimit);

  const renderProductsSection = (
    title: string,
    query: UseQueryResult<CachedResult<Product[]>, Error>,
    emptyAction?: () => void
  ) => {
    const products = query.data?.data ?? [];
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
              <ProductCardSkeleton key={idx} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="premium-grid">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                adding={cartHook.addingProductId === p.id}
                disabled={isOffline}
                onAddToCart={handleAddToCart}
                onPress={(product) => goToProduct(product.slug || product.id, updateAppState, { product })}
              />
            ))}
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
      <div className="section-card space-y-4 motion-fade">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-gray-500">
              {t("home.providersSubtitle", "Pick a provider to start shopping")}
            </p>
            <h2 className="text-xl font-semibold text-gray-900">
              {t("home.providersTitle", "Providers")}
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
        ) : providers.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {providers.map((provider) => {
              const isSelected = providerId === provider.id;
              const ratingLabel =
                provider.ratingCount && provider.ratingCount > 0
                  ? `${Number(provider.ratingAvg ?? 0).toFixed(1)} (${provider.ratingCount})`
                  : t("home.providersNew", "New");
              return (
                <button
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider)}
                  className={`rounded-2xl border p-3 text-left shadow-card transition-transform duration-200 hover:-translate-y-0.5 ${
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-inner flex items-center justify-center overflow-hidden">
                      {provider.logoUrl ? (
                        <ImageWithFallback
                          src={provider.logoUrl}
                          alt={provider.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Store className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2">{provider.name}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Star className="w-3 h-3 text-amber-500" />
                        <span>{ratingLabel}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={t("home.providersEmptyTitle", "No providers available")}
            subtitle={t("home.providersEmptySubtitle", "Please check back soon.")}
          />
        )}
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
                <ChevronRight className="w-4 h-4" />
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
        <div className="section-card space-y-4 glass-surface" style={{ background: heroGradient }}>
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
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/70 border border-border shadow-sm text-xs text-gray-700"
                    >
                      <pill.icon className="w-4 h-4 text-primary" />
                      <span>{pill.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="p-2 rounded-full">
                <Bell className="w-5 h-5" />
              </Button>
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
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 ${
                i18n.dir() === "rtl" ? "right-4" : "left-4"
              }`}
            />
            <Input
              placeholder={searchPlaceholder}
              disabled={!providerSelected}
              className={`h-12 rounded-2xl bg-white/80 border-none shadow-inner ${i18n.dir() === "rtl" ? "pr-12 text-right" : "pl-12"}`}
              value={q}
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
                <p className="text-xs text-white/80">{t("home.deliveryEta", "30-45 min delivery")}</p>
                <p className="text-lg font-semibold">{t("home.coveragePromise", "We cover all of Badr City")}</p>
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
        {renderProvidersSection()}
        {!providerSelected ? (
          <EmptyState
            title={t("home.providersPromptTitle", "Choose a provider to continue")}
            subtitle={t("home.providersPromptSubtitle", "Providers have their own categories and products.")}
          />
        ) : showingSearch ? (
          renderProductsSection(t("home.sections.searchResults"), searchQuery, () =>
            updateAppState({ currentScreen: "categories" })
          )
        ) : (
          sectionsToRender.map((section) => renderSection(section))
        )}
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
      {cartGuard.dialog}
    </div>
  );

  function onCategorySelect(slug?: string | null, id?: string | null, category?: any) {
    goToCategory(slug ?? null, updateAppState, { category, categoryId: id ?? null });
  }
}
