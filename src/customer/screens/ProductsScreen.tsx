import React, { useMemo, useState } from "react";
import { IonRefresher, IonRefresherContent } from "@ionic/react";
import type { RefresherEventDetail } from "@ionic/react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { ArrowLeft, Search, Filter, SlidersHorizontal, Grid, List, History } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { useToast } from "../providers/ToastProvider";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useCart, useProducts, useSearchHistory, useNetworkStatus, useApiErrorToast } from "../hooks";
import { ProductCard, ProductCardSkeleton, NetworkBanner, RetryBlock, EmptyState } from "../components";
import { goToCategory, goToProduct } from "../navigation/navigation";
import type { Product } from "../../types/api";
import { trackAddToCart } from "../../lib/analytics";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";

interface ProductsScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

export function ProductsScreen({ appState, updateAppState }: ProductsScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const cart = useCart({ userId: appState.user?.id });
  const { isOffline } = useNetworkStatus();
  const apiErrorToast = useApiErrorToast("products.error");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, 250);
  const [sortBy, setSortBy] = useState<"popularity" | "price-low" | "price-high" | "rating" | "name">("popularity");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { history, addQuery, clearHistory } = useSearchHistory("products");

  const isRTL = i18n.dir() === "rtl";

  const productsQuery = useProducts({
    search: debouncedQuery || undefined,
    categoryId: appState.selectedCategory?.id,
  });

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await Promise.all([productsQuery.refetch(), cart.refetch()]);
    event.detail.complete();
  };

  const items = productsQuery.data?.data ?? [];
  const dataStale = productsQuery.data?.stale ?? false;

  const sorted = useMemo(() => {
    const arr = [...items];
    switch (sortBy) {
      case "price-low":
        return arr.sort((a, b) => effectivePriceCents(a) - effectivePriceCents(b));
      case "price-high":
        return arr.sort((a, b) => effectivePriceCents(b) - effectivePriceCents(a));
      case "rating":
        return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "name":
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "popularity":
      default:
        return arr;
    }
  }, [items, sortBy]);

  const handleAddToCart = async (product: Product) => {
    try {
      await cart.addProduct(product, 1);
      trackAddToCart(product.id, 1);
      showToast({ type: "success", message: t("products.buttons.added") });
    } catch (err: any) {
      apiErrorToast(err, "products.error");
    }
  };

  const renderProducts = () => {
    if (productsQuery.isError) {
      return (
        <RetryBlock message={mapApiErrorToMessage(productsQuery.error, "products.error")} onRetry={() => productsQuery.refetch()} />
      );
    }

    const gridClasses = viewMode === "grid" ? "premium-grid" : "space-y-3";

    if (productsQuery.isLoading) {
      return (
        <div className="px-3 py-2">
          <div className={gridClasses}>
            {Array.from({ length: viewMode === "grid" ? 6 : 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} layout={viewMode} />
            ))}
          </div>
        </div>
      );
    }

    if (!sorted.length) {
      return (
        <EmptyState
          title={t("products.emptyTitle")}
          subtitle={t("products.emptySubtitle")}
          actionLabel={t("products.backToCategories")}
          onAction={() => {
            goToCategory(appState.selectedCategory?.slug ?? null, updateAppState, {
              category: appState.selectedCategory ?? null,
              categoryId: appState.selectedCategory?.id ?? null,
            });
          }}
        />
      );
    }

    return (
      <div className="flex-1 overflow-y-auto px-3 pb-24">
        <div className={gridClasses}>
          {sorted.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              layout={viewMode}
              adding={cart.addingProductId === product.id}
              disabled={isOffline}
              onAddToCart={handleAddToCart}
              onPress={(p) => goToProduct(p.slug || p.id, updateAppState, { product: p })}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page-shell">
      <NetworkBanner stale={dataStale} />
      <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
        <IonRefresherContent
          pullingText={t("products.pullToRefresh", "Pull to refresh products")}
          refreshingSpinner="crescent"
        />
      </IonRefresher>
      <div className="section-card">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAppState({ currentScreen: "categories" })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            {appState.selectedCategory?.name || t("products.title")}
          </h1>
        </div>
        <div className="relative mb-2">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 ${
              isRTL ? "right-3" : "left-3"
            }`}
          />
          <Input
            placeholder={t("products.searchPlaceholder")}
            value={searchQuery}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 100)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${isRTL ? "pr-10 text-right" : "pl-10"} h-12 rounded-xl`}
          />
          {showHistory && history.length > 0 && (
            <div className="absolute z-10 mt-1 left-0 right-0 bg-white rounded-xl shadow-lg border max-h-48 overflow-auto">
              <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <History className="w-3 h-3" /> {t("products.recentSearches", "Recent searches")}
                </span>
                <button
                  className="text-primary"
                  type="button"
                  onClick={() => clearHistory()}
                >
                  {t("products.clearHistory", "Clear")}
                </button>
              </div>
              {history.map((item) => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearchQuery(item);
                    addQuery(item);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((prev) => !prev)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {t("products.filterButton")}
            </Button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            >
              <option value="popularity">{t("products.sort.popularity")}</option>
              <option value="price-low">{t("products.sort.priceLow")}</option>
              <option value="price-high">{t("products.sort.priceHigh")}</option>
              <option value="rating">{t("products.sort.rating")}</option>
              <option value="name">{t("products.sort.name")}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {productsQuery.isLoading
                ? t("products.loading")
                : t("products.itemsCount", { count: sorted.length })}
            </span>
            <div className="flex border border-gray-200 rounded-lg">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="p-2 rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="p-2 rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-gray-600" />
            <span className="font-medium">{t("products.filterTitle")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer">
              {t("products.filters.inStock")}
            </Badge>
            <Badge variant="outline" className="cursor-pointer">
              {t("products.filters.onSale")}
            </Badge>
          </div>
        </div>
      )}

      {renderProducts()}

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}

function effectivePriceCents(product: Product) {
  return (product.salePriceCents ?? product.priceCents) || product.priceCents;
}
