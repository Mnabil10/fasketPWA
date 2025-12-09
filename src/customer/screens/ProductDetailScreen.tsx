import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ArrowLeft, Plus, Minus, ShoppingCart, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { useToast } from "../providers/ToastProvider";
import { fmtEGP, fromCents } from "../../lib/money";
import { NetworkBanner, ProductCard, ProductCardSkeleton, RetryBlock } from "../components";
import { useCart, useProductDetail, useProducts, useApiErrorToast } from "../hooks";
import type { Product } from "../../types/api";
import { trackAddToCart, trackViewProduct } from "../../lib/analytics";
import { goToCart, goToCategory, goToHome, goToProduct } from "../navigation/navigation";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";

interface ProductDetailScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

export function ProductDetailScreen({ appState, updateAppState }: ProductDetailScreenProps) {
  const selected = appState.selectedProduct as Partial<Product> | undefined;
  const productKey = selected?.id || selected?.slug || null;
  const hasInitial = selected?.id && selected?.name && selected?.priceCents !== undefined;

  const { t } = useTranslation();
  const { showToast } = useToast();
  const cart = useCart({ userId: appState.user?.id });
  const apiErrorToast = useApiErrorToast("cart.updateError");
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addingCart, setAddingCart] = useState(false);

  const detailQuery = useProductDetail(
    { idOrSlug: productKey, initialData: hasInitial ? (selected as Product) : null },
    { enabled: Boolean(productKey) }
  );
  const productResult = detailQuery.data;
  const product = productResult?.data ?? null;
  const productStale = productResult?.stale ?? false;

  const similarQuery = useProducts(
    { categoryId: product?.category?.id, enabled: Boolean(product?.category?.id) },
    { enabled: Boolean(product?.category?.id) }
  );

  const fallbackOffers = useProducts({ type: "hot-offers", limit: 6 });

  const similarProducts = useMemo(() => {
    const categoryId = product?.category?.id ?? null;
    const similarItems = similarQuery.data?.data ?? [];
    const fallbackItems = fallbackOffers.data?.data ?? [];
    const filterByCategory = (items?: Product[]) =>
      (items ?? []).filter((p) => p.id !== product?.id && (!categoryId || p.category?.id === categoryId));
    const primary = filterByCategory(similarItems);
    if (primary.length) return primary;
    const fallback = filterByCategory(fallbackItems);
    return fallback;
  }, [product?.id, product?.category?.id, similarQuery.data, fallbackOffers.data]);

  useEffect(() => {
    if (product?.slug || product?.id) {
      trackViewProduct(product.slug || product.id);
    }
  }, [product?.slug, product?.id]);

  const productImages = useMemo(() => {
    const gallery = product?.gallery?.length ? product.gallery : [];
    const fallback = product?.imageUrl ? [product.imageUrl] : [];
    const combined = [...gallery, ...fallback];
    return combined.length ? combined : fallback;
  }, [product?.gallery, product?.imageUrl]);

  const hasDiscount = product ? product.salePriceCents !== null && product.salePriceCents !== undefined : false;
  const basePrice = product ? fromCents(product.priceCents) : 0;
  const sellPrice = product ? fromCents(product.salePriceCents ?? product.priceCents) : 0;
  const discountPct =
    hasDiscount && product ? Math.max(0, Math.round((1 - (product.salePriceCents || 0) / product.priceCents) * 100)) : 0;
  const etaLabel = product?.deliveryEstimateMinutes
    ? t("checkout.summary.etaValue", {
        value: `${product.deliveryEstimateMinutes} ${t("checkout.summary.minutes", "min")}`,
      })
    : t("checkout.summary.etaValue", { value: "30-45 min" });

  const stockLabel = useMemo(() => {
    const stock = product?.stock ?? 0;
    if (stock <= 0) return t("product.stock.out");
    if (stock < 3) return t("product.stock.low", { count: stock });
    return t("product.stock.in");
  }, [product?.stock, t]);

  useEffect(() => {
    const maxQty = Math.max(0, product?.stock ?? 99);
    setQuantity((q) => {
      if (maxQty === 0) return 0;
      return Math.min(Math.max(1, q), maxQty);
    });
  }, [product?.stock]);

  const addToCart = async () => {
    if (!product || addingCart) return;
    const available = Math.max(0, product?.stock ?? 0);
    if (available <= 0) {
      showToast({ type: "error", message: t("product.stock.out") });
      return;
    }
    const clampedQty = Math.min(quantity, available);
    if (clampedQty !== quantity) {
      setQuantity(clampedQty);
    }
    setAddingCart(true);
    try {
      await cart.addProduct(product, clampedQty);
      trackAddToCart(product.id, clampedQty);
      showToast({ type: "success", message: t("products.buttons.added") });
    } catch (error: any) {
      apiErrorToast(error, "cart.updateError");
    } finally {
      setAddingCart(false);
    }
  };

  const addSuggestedToCart = (p: Product) => addToCartByProduct(p);

  const addToCartByProduct = async (p: Product) => {
    const available = Math.max(0, p.stock ?? 0);
    if (available <= 0) {
      showToast({ type: "error", message: t("product.stock.out") });
      return;
    }
    try {
      await cart.addProduct(p, 1);
      trackAddToCart(p.id, 1);
      showToast({ type: "success", message: t("products.buttons.added") });
    } catch (error: any) {
      apiErrorToast(error, "cart.updateError");
    }
  };

  const imagesCount = productImages.length;

  const renderSimilar = () => {
    if ((similarQuery.isLoading || fallbackOffers.isLoading) && !similarProducts.length) {
      return (
        <div className="premium-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      );
    }
    if (!similarProducts.length) return null;
    return (
      <div className="premium-grid">
        {similarProducts.slice(0, 6).map((item) => (
          <ProductCard
            key={item.id}
            product={item}
            adding={cart.addingProductId === item.id}
            onAddToCart={addSuggestedToCart}
            onPress={(next) => goToProduct(next.slug || next.id, updateAppState, { product: next })}
          />
        ))}
      </div>
    );
  };

  const handleBack = () => {
    if (appState.selectedCategory?.slug) {
      goToCategory(appState.selectedCategory.slug, updateAppState, {
        category: appState.selectedCategory,
        categoryId: appState.selectedCategory.id,
      });
      return;
    }
    goToHome(updateAppState);
  };

  if (detailQuery.isError) {
    return (
      <div className="page-shell">
        <NetworkBanner stale={productStale} />
        <RetryBlock
          message={mapApiErrorToMessage(detailQuery.error, "product.messages.notFound")}
          onRetry={() => detailQuery.refetch()}
        />
      </div>
    );
  }

  if (detailQuery.isLoading || !product) {
    return (
      <div className="page-shell">
        <NetworkBanner stale={productStale} />
        <div className="p-4 space-y-3">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <NetworkBanner
        stale={
          productStale ||
          Boolean(similarQuery.data?.stale) ||
          Boolean(fallbackOffers.data?.stale)
        }
      />
      <div className="bg-white px-4 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={handleBack} className="p-2 mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {t("product.title")}
            </h1>
            <p className="text-xs text-gray-500">{product.category?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => goToCart(updateAppState)} className="p-2 relative">
            <ShoppingCart className="w-5 h-5" />
            {cart.items.length > 0 && (
              <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {cart.items.length}
              </div>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="px-4 mb-4">
          <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-card bg-gradient-to-br from-primary/10 via-white to-white flex items-center justify-center">
            {productImages[0] ? (
              <ImageWithFallback
                src={productImages[currentImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100" />
            )}
            {hasDiscount && (
              <Badge className="absolute left-3 top-3 rounded-full shadow-card bg-white text-primary border border-primary/20">
                -{discountPct}%
              </Badge>
            )}

            {imagesCount > 1 && (
              <>
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentImageIndex((idx) => (idx - 1 + imagesCount) % imagesCount)}
                    className="rounded-full bg-white/80"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentImageIndex((idx) => (idx + 1) % imagesCount)}
                    className="rounded-full bg-white/80"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
                  {productImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? "bg-primary" : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-poppins text-2xl text-gray-900" style={{ fontWeight: 700 }}>
                {product.name}
              </h1>
              <p className="text-gray-600 mb-3">{product.category?.name}</p>
            </div>
            {hasDiscount && (
              <Badge className="rounded-lg bg-red-100 text-red-600 border border-red-200">
                -{discountPct}%
              </Badge>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="font-poppins text-3xl text-primary" style={{ fontWeight: 700 }}>
                {fmtEGP(sellPrice)}
              </span>
              {hasDiscount && (
                <span className="text-gray-500 line-through text-lg">{fmtEGP(basePrice)}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={product.stock && product.stock > 0 ? "secondary" : "destructive"} className="w-fit rounded-full">
                {stockLabel}
              </Badge>
              <Badge variant="outline" className="rounded-full bg-white text-gray-700 border-gray-200">
                <Clock className="w-3 h-3 mr-1 inline" />
                {etaLabel}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{t("product.descriptionFallback")}</p>
          </div>

          <div className="flex items-center justify-between mb-4 bg-white rounded-2xl p-4 border shadow-card">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setQuantity((q) => {
                    const min = (product?.stock ?? 0) > 0 ? 1 : 0;
                    return Math.max(min, q - 1);
                  })
                }
                className="w-10 h-10 p-0 rounded-xl"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-10 text-center font-semibold text-lg">{quantity}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setQuantity((q) => {
                    const max = Math.max(0, product?.stock ?? 99);
                    return Math.min(max, q + 1);
                  })
                }
                className="w-10 h-10 p-0 rounded-xl"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <Button
              onClick={addToCart}
              className="rounded-xl shadow-card"
              disabled={addingCart || product.stock === 0}
            >
              {addingCart ? t("products.buttons.adding") : t("products.buttons.add")}
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
              {t("product.similar")}
            </h3>
            {renderSimilar()}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-200 shadow-lg backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pt-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500">{etaLabel}</p>
            <p className="text-lg font-semibold text-gray-900 price-text">
              {fmtEGP(sellPrice * quantity)}
            </p>
          </div>
          <Button
            onClick={addToCart}
            className="h-12 rounded-xl shadow-card min-w-[200px]"
            disabled={addingCart || (product.stock ?? 0) <= 0}
          >
            {(product.stock ?? 0) <= 0
              ? t("product.stock.out")
              : t("product.cta", { total: fmtEGP(sellPrice * quantity) })}
          </Button>
        </div>
      </div>
    </div>
  );
}
