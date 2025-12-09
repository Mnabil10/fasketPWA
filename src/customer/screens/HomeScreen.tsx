import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Search, ShoppingCart, Bell, History, Sparkles, ChevronRight, Clock, Star, Truck } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { useToast } from "../providers/ToastProvider";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import {
  useCart,
  useCategories,
  useNetworkStatus,
  useProducts,
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
import { goToCart, goToCategory, goToProduct } from "../navigation/navigation";
import type { Product } from "../../types/api";
import { trackAddToCart } from "../../lib/analytics";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { FASKET_GRADIENTS } from "../../styles/designSystem";
import type { CachedResult } from "../../lib/offlineCache";

interface HomeScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

export function HomeScreen({ appState, updateAppState }: HomeScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const cartHook = useCart({ userId: appState.user?.id });
  const { isOffline } = useNetworkStatus();
  const apiErrorToast = useApiErrorToast("products.error");

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 250);
  const showingSearch = debouncedQ.trim().length > 0;
  const [showHistory, setShowHistory] = useState(false);
  const { history, addQuery, clearHistory } = useSearchHistory("home");

  const categoriesQuery = useCategories();
  const bestQuery = useProducts({ type: "best-selling", limit: 8 });
  const hotQuery = useProducts({ type: "hot-offers", limit: 8 });
  const searchQuery = useProducts(
    { search: debouncedQ || undefined },
    { enabled: showingSearch && Boolean(debouncedQ) }
  );
  const staleData =
    (categoriesQuery.data?.stale ?? false) ||
    (bestQuery.data?.stale ?? false) ||
    (hotQuery.data?.stale ?? false) ||
    (searchQuery.data?.stale ?? false);

  const promoImages = [
    "https://images.unsplash.com/photo-1705727209465-b292e4129a37?auto=format&fit=crop&w=1080&q=80",
    "https://images.unsplash.com/photo-1665521032636-e8d2f6927053?auto=format&fit=crop&w=1080&q=80",
  ];

  const promos = useMemo(() => {
    const content = t("home.promotions", { returnObjects: true }) as Array<{ title: string; subtitle: string }>;
    return promoImages.map((image, index) => ({
      id: index + 1,
      title: content[index]?.title ?? "",
      subtitle: content[index]?.subtitle ?? "",
      image,
    }));
  }, [t, i18n.language]);

  const handleAddToCart = async (product: Product) => {
    try {
      await cartHook.addProduct(product);
      trackAddToCart(product.id, 1);
      showToast({ type: "success", message: t("products.buttons.added") });
    } catch (error: any) {
      apiErrorToast(error, "products.error");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addQuery(q);
    if (!showingSearch) return;
    searchQuery.refetch();
  };

  const greeting = appState.user
    ? t("home.greeting", { name: appState.user?.name?.split(" ")[0] || "" })
    : t("home.greetingGuest");

  const highlightPills = [
    { icon: Clock, label: t("home.deliveryEta", "30-45 min delivery") },
    { icon: Truck, label: t("home.coveragePromise", "We cover all of Badr City") },
    { icon: Star, label: t("home.qualityPromise", "Handpicked quality products") },
  ];
  const topCategories = (categoriesQuery.data?.data ?? []).slice(0, 12);

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

  return (
    <div className="page-shell">
      <NetworkBanner stale={staleData} />
      <div
        className="section-card space-y-4 glass-surface"
        style={{ background: FASKET_GRADIENTS.hero }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t("home.prompt")}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{greeting}</h1>
            <p className="text-sm text-gray-700">
              {t("home.subtitlePremium", "Your premium online supermarket in Badr City.")}
            </p>
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
            placeholder={t("home.searchPlaceholder")}
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

        {appState.user && (
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
            <div className="bg-white/80 rounded-2xl border border-border shadow-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t("home.loyaltyWidget.title")}</p>
                <p className="text-2xl font-semibold text-primary">
                  {appState.user.loyaltyPoints ?? appState.user.points ?? 0}
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

      <div className="flex-1 overflow-y-auto space-y-5">
        {!showingSearch && (
          <div className="section-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{t("home.sections.hotOffers")}</p>
                <h2 className="text-xl font-semibold text-gray-900">{t("home.sections.bestSelling")}</h2>
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
                      onClick={() => updateAppState({ currentScreen: "categories" })}
                    >
                      {t("home.promotionsCta")}
                    </Button>
                  </div>
                  <div className="w-28 h-28 rounded-xl overflow-hidden border border-white/20 flex-shrink-0">
                    <ImageWithFallback
                      src={promo.image}
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!showingSearch && (
          <div className="section-card space-y-4 motion-fade">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{t("home.sections.categories")}</p>
                <h2 className="text-xl font-semibold text-gray-900">{t("home.categoryHeadline", "Shop by category")}</h2>
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
                        <ImageWithFallback
                          src={c.imageUrl}
                          alt={c.name}
                          className="w-full h-full object-cover"
                        />
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
        )}

        {showingSearch &&
          renderProductsSection(t("home.sections.searchResults"), searchQuery, () =>
            updateAppState({ currentScreen: "categories" })
          )}

        {!showingSearch && renderProductsSection(t("home.sections.bestSelling"), bestQuery)}

        {!showingSearch && renderProductsSection(t("home.sections.hotOffers"), hotQuery)}
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );

  function onCategorySelect(slug?: string | null, id?: string | null, category?: any) {
    goToCategory(slug ?? null, updateAppState, { category, categoryId: id ?? null });
  }
}
