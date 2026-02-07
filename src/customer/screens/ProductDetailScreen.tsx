import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ArrowLeft, Plus, Minus, ShoppingCart, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { useToast } from "../providers/ToastProvider";
import { fmtEGP, fromCents } from "../../lib/money";
import { NetworkBanner, ProductCard, ProductCardSkeleton, RetryBlock } from "../components";
import { useCart, useCartGuard, useProductDetail, useProducts, useApiErrorToast } from "../hooks";
import type { Product } from "../../types/api";
import { trackAddToCart, trackViewProduct } from "../../lib/analytics";
import { goToCart, goToCategory, goToHome, goToProduct } from "../navigation/navigation";
import { extractApiError, mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { resolveQuickAddProduct } from "../utils/productOptions";
import { calcLineTotal, clampQty, formatOptionQtyLabel } from "../utils/quantity";

interface ProductDetailScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

const MAX_OPTION_QTY = 99;
type OptionLabelCandidate = {
  name?: string | null;
  nameAr?: string | null;
  groupName?: string | null;
  groupNameAr?: string | null;
  qty?: number | null;
};

export function ProductDetailScreen({ appState, updateAppState }: ProductDetailScreenProps) {
  const selected = appState.selectedProduct as Partial<Product> | undefined;
  const productKey = selected?.id || selected?.slug || null;
  const hasInitial = selected?.id && selected?.name && selected?.priceCents !== undefined;

  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const cart = useCart({ userId: appState.user?.id });
  const cartGuard = useCartGuard(cart);
  const apiErrorToast = useApiErrorToast("cart.updateError");
  const [quantity, setQuantity] = useState(1);
  const [optionQuantities, setOptionQuantities] = useState<Record<string, number>>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addingCart, setAddingCart] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedProviderId = appState.selectedProvider?.id ?? appState.selectedProviderId ?? null;
  const providerLabel = useMemo(() => {
    const provider = appState.selectedProvider;
    if (!provider) return null;
    return lang === "ar" ? provider.nameAr || provider.name : provider.name || provider.nameAr;
  }, [appState.selectedProvider, lang]);

  const detailQuery = useProductDetail(
    { idOrSlug: productKey, initialData: hasInitial ? (selected as Product) : null },
    { enabled: Boolean(productKey) }
  );
  const productResult = detailQuery.data;
  const product = productResult?.data ?? null;
  const productStale = productResult?.stale ?? false;
  const resolvedProviderId = selectedProviderId ?? product?.providerId ?? null;
  const optionGroups = useMemo(() => {
    const groups = product?.optionGroups ?? [];
    return groups
      .filter((group) => group.isActive !== false)
      .map((group) => ({
        ...group,
        options: (group.options ?? []).filter((option) => option.isActive !== false),
      }))
      .filter((group) => (group.options ?? []).length > 0)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [product?.optionGroups]);
  const selectedOptions = useMemo(() => {
    const selections = [];
    for (const group of optionGroups) {
      const groupName = group.name;
      const groupNameAr = group.nameAr ?? null;
      for (const opt of group.options ?? []) {
        const qty = optionQuantities[opt.id] ?? 0;
        if (qty > 0) {
          selections.push({
            optionId: opt.id,
            name: opt.name,
            nameAr: opt.nameAr ?? null,
            priceCents: opt.priceCents,
            qty,
            groupId: group.id,
            groupName,
            groupNameAr,
            groupPriceMode: group.priceMode ?? "ADD",
          });
        }
      }
    }
    return selections;
  }, [optionGroups, optionQuantities]);
  const optionTotals = useMemo(() => {
    let addOnsTotalCents = 0;
    let baseOverrideCents = 0;
    let hasOverride = false;
    for (const opt of selectedOptions) {
      const qty = clampQty(opt.qty, 1);
      if (qty <= 0) continue;
      const price = opt.priceCents ?? 0;
      if (opt.groupPriceMode === "SET") {
        baseOverrideCents += calcLineTotal(price, qty);
        hasOverride = true;
      } else {
        addOnsTotalCents += calcLineTotal(price, qty);
      }
    }
    return {
      addOnsTotalCents,
      baseOverrideCents: hasOverride ? baseOverrideCents : null,
    };
  }, [selectedOptions]);
  const hasSetPriceGroup = optionGroups.some((group) => (group.priceMode ?? "ADD") === "SET");

  const similarQuery = useProducts(
    { categoryId: product?.category?.id, providerId: resolvedProviderId, enabled: Boolean(product?.category?.id) },
    { enabled: Boolean(product?.category?.id) }
  );

  const fallbackOffers = useProducts({ type: "hot-offers", limit: 6, providerId: resolvedProviderId });

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

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = 0;
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [productKey]);

  const productImages = useMemo(() => {
    const gallery = product?.gallery?.length ? product.gallery : [];
    const fallback = product?.imageUrl ? [product.imageUrl] : [];
    const combined = [...gallery, ...fallback];
    return combined.length ? combined : fallback;
  }, [product?.gallery, product?.imageUrl]);

  const isWeightProduct =
    product?.pricingModel === "weight" ||
    product?.isWeightBased ||
    product?.weightBased ||
    product?.soldByWeight;
  const unitLabel = product?.unitLabel || "kg";
  const pricePerKgCents = product?.pricePerKg ?? (isWeightProduct ? product?.priceCents ?? 0 : null);
  const listPriceCents = product?.priceCents ?? 0;
  const salePriceCents = product?.salePriceCents ?? null;
  const hasDiscount = !isWeightProduct && salePriceCents !== null && salePriceCents !== undefined;
  const showDiscount = optionTotals.baseOverrideCents === null && hasDiscount;
  const basePrice = fromCents(listPriceCents);
  const baseUnitCents = optionTotals.baseOverrideCents ?? (salePriceCents ?? listPriceCents);
  const sellPrice = fromCents(baseUnitCents);
  const unitTotalCents = baseUnitCents + optionTotals.addOnsTotalCents;
  const unitTotal = fromCents(unitTotalCents);
  const totalWithQty = fromCents(unitTotalCents * quantity);
  const showSelectPrice = hasSetPriceGroup && optionTotals.baseOverrideCents === null;
  const selectPriceLabel = isWeightProduct
    ? t("products.weight_select_price", "Select a weight to set the price")
    : t("products.priceOnSelect", "Select options to set price");
  const sellPriceLabel = showSelectPrice ? selectPriceLabel : fmtEGP(sellPrice);
  const totalLabel = showSelectPrice ? selectPriceLabel : fmtEGP(totalWithQty);
  const weightPriceLabel =
    isWeightProduct && pricePerKgCents !== null && pricePerKgCents !== undefined
      ? `${fmtEGP(fromCents(pricePerKgCents))} / ${unitLabel}`
      : null;
  const discountPct =
    showDiscount && product
      ? Math.max(0, Math.round((1 - (product.salePriceCents || 0) / product.priceCents) * 100))
      : 0;
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

  const formatOptionLabels = useCallback(
    (options?: OptionLabelCandidate[]) => {
      if (!options?.length) return [];
      return options
        .map((opt) => {
          const optionName = lang === "ar" ? opt.nameAr || opt.name : opt.name || opt.nameAr || "";
          const groupName = lang === "ar" ? opt.groupNameAr || opt.groupName : opt.groupName || opt.groupNameAr || "";
          const label = groupName ? `${groupName}: ${optionName}` : optionName;
          const qtyLabel = formatOptionQtyLabel(opt.qty);
          return `${label}${qtyLabel}`.trim();
        })
        .filter(Boolean);
    },
    [lang]
  );

  const resolveProductName = useCallback(
    (target?: Product | null) => {
      if (!target) return "";
      if (lang === "ar") return target.nameAr || target.name || "";
      return target.name || target.nameAr || "";
    },
    [lang]
  );

  const showCartErrorMessage = useCallback(
    (error: unknown, context?: { product?: Product | null; options?: OptionLabelCandidate[] }) => {
      const { code, details } = extractApiError(error);
      const productName = resolveProductName(context?.product) || t("product.title", "Product");
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
      if (code === "CART_OPTIONS_INVALID") {
        const detailOptions = Array.isArray((details as any)?.options) ? ((details as any).options as string[]) : [];
        const optionLabels = detailOptions.length ? detailOptions : formatOptionLabels(context?.options);
        if (optionLabels.length) {
          const joined = optionLabels.join(lang === "ar" ? "، " : ", ");
          showToast({
            type: "error",
            message: t("errors.cartOptionsInvalidNamed", {
              options: joined,
              defaultValue: `These options are no longer available: ${joined}.`,
            }),
          });
          return;
        }
      }
      apiErrorToast(error, "cart.updateError");
    },
    [apiErrorToast, formatOptionLabels, lang, resolveProductName, showToast, t]
  );

  const description = useMemo(() => {
    const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
    if (lang === "ar") {
      return product?.descriptionAr || product?.description || "";
    }
    return product?.description || product?.descriptionAr || "";
  }, [i18n.language, product?.description, product?.descriptionAr]);

  useEffect(() => {
    const maxQty = Math.max(0, product?.stock ?? 99);
    setQuantity((q) => {
      if (maxQty === 0) return 0;
      return Math.min(Math.max(1, q), maxQty);
    });
  }, [product?.stock]);

  useEffect(() => {
    setOptionQuantities({});
  }, [product?.id]);

  const updateOptionQty = (groupId: string, optionId: string, nextQty: number) => {
    const group = optionGroups.find((entry) => entry.id === groupId);
    if (!group) return;
    const maxPerOption = group.options?.find((opt) => opt.id === optionId)?.maxQtyPerOption ?? MAX_OPTION_QTY;
    const desiredQty = Math.max(0, Math.min(maxPerOption, nextQty));
    setOptionQuantities((prev) => {
      const next = { ...prev };
      const groupOptions = group.options ?? [];
      const selectedCount = groupOptions.reduce((count, opt) => {
        const qty = opt.id === optionId ? desiredQty : prev[opt.id] ?? 0;
        return count + (qty > 0 ? 1 : 0);
      }, 0);
      const maxSelected = group.maxSelected ?? (group.type === "SINGLE" ? 1 : null);
      if (group.type === "MULTI" && maxSelected != null && desiredQty > 0 && selectedCount > maxSelected) {
        showToast({
          type: "info",
          message: t("productOptions.maxSelectedLimit", {
            max: maxSelected,
            defaultValue: `You can select up to ${maxSelected} options.`,
          }),
        });
        return prev;
      }
      if (group.type === "SINGLE") {
        groupOptions.forEach((opt) => {
          if (opt.id !== optionId) {
            delete next[opt.id];
          }
        });
      }
      if (desiredQty <= 0) {
        delete next[optionId];
      } else {
        next[optionId] = desiredQty;
      }
      return next;
    });
  };

  const validateOptions = () => {
    for (const group of optionGroups) {
      const groupLabel = lang === "ar" ? group.nameAr || group.name : group.name || group.nameAr || group.name;
      const minSelected = group.minSelected ?? 0;
      const maxSelected = group.maxSelected ?? (group.type === "SINGLE" ? 1 : null);
      const selectedCount = (group.options ?? []).reduce((count, opt) => {
        const qty = optionQuantities[opt.id] ?? 0;
        return count + (qty > 0 ? 1 : 0);
      }, 0);
      if (minSelected > 0 && selectedCount < minSelected) {
        showToast({
          type: "error",
          message: t("productOptions.requiredGroup", {
            group: groupLabel,
            defaultValue: `Select required options for ${groupLabel}.`,
          }),
        });
        return false;
      }
      if (maxSelected != null && selectedCount > maxSelected) {
        showToast({
          type: "error",
          message: t("productOptions.tooManyGroup", {
            group: groupLabel,
            max: maxSelected,
            defaultValue: `Too many options selected for ${groupLabel}.`,
          }),
        });
        return false;
      }
    }
    return true;
  };

  const addToCart = async () => {
    if (!product || addingCart) return;
    const available = Math.max(0, product?.stock ?? 0);
    if (available <= 0) {
      showToast({ type: "error", message: t("product.stock.out") });
      return;
    }
    if (isWeightProduct && showSelectPrice) {
      showToast({
        type: "info",
        message: t("products.weight_select_price", "Select a weight to set the price"),
      });
      return;
    }
    const clampedQty = Math.min(quantity, available);
    if (clampedQty !== quantity) {
      setQuantity(clampedQty);
    }
    if (optionGroups.length && !validateOptions()) {
      return;
    }
    setAddingCart(true);
    try {
      const added = await cartGuard.requestAdd(
        product,
        clampedQty,
        selectedOptions.length ? selectedOptions : undefined,
        () => {
          trackAddToCart(product.id, clampedQty);
          showToast({ type: "success", message: t("products.buttons.added") });
        },
        { nextProviderLabel: providerLabel }
      );
      if (!added) return;
    } catch (error: any) {
      showCartErrorMessage(error, { product, options: selectedOptions });
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
      const resolved = await resolveQuickAddProduct(p, lang, !cart.isOffline);
      if (resolved.requiresOptions) {
        goToProduct(resolved.product.slug || resolved.product.id, updateAppState, { product: resolved.product });
        return;
      }
      const added = await cartGuard.requestAdd(
        resolved.product,
        1,
        undefined,
        () => {
          trackAddToCart(resolved.product.id, 1);
          showToast({ type: "success", message: t("products.buttons.added") });
        },
        { nextProviderLabel: providerLabel }
      );
      if (!added) return;
    } catch (error: any) {
      showCartErrorMessage(error, { product: p });
    }
  };

  const imagesCount = productImages.length;

  const renderSimilar = () => {
    if ((similarQuery.isLoading || fallbackOffers.isLoading) && !similarProducts.length) {
      return (
        <div className="premium-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} imageVariant="compact" />
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
            imageVariant="compact"
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
          <ProductCardSkeleton imageVariant="compact" />
          <ProductCardSkeleton imageVariant="compact" />
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

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-28">
        <div className="px-4 mb-4">
          <div className="relative w-full h-[220px] sm:h-[240px] rounded-3xl overflow-hidden shadow-card bg-gradient-to-br from-primary/10 via-white to-white flex items-center justify-center">
            {productImages[0] ? (
              <ImageWithFallback
                src={productImages[currentImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100" />
            )}
            {showDiscount && (
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
            {showDiscount && (
              <Badge className="rounded-lg bg-red-100 text-red-600 border border-red-200">
                -{discountPct}%
              </Badge>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="font-poppins text-3xl text-primary" style={{ fontWeight: 700 }}>
                {sellPriceLabel}
              </span>
              {showDiscount && (
                <span className="text-gray-500 line-through text-lg">{fmtEGP(basePrice)}</span>
              )}
            </div>
            {weightPriceLabel && <p className="text-xs text-gray-500">{weightPriceLabel}</p>}
            {optionTotals.addOnsTotalCents > 0 && (
              <p className="text-xs text-gray-500">
                {t("productOptions.addonsTotal", {
                  value: fmtEGP(fromCents(optionTotals.addOnsTotalCents)),
                  defaultValue: `Add-ons ${fmtEGP(fromCents(optionTotals.addOnsTotalCents))}`,
                })}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={product.stock && product.stock > 0 ? "secondary" : "destructive"} className="w-fit rounded-full">
                {stockLabel}
              </Badge>
              <Badge variant="outline" className="rounded-full bg-white text-gray-700 border-gray-200">
                <Clock className="w-3 h-3 mr-1 inline" />
                {etaLabel}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{description || t("product.descriptionFallback")}</p>
          </div>

          {optionGroups.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
                {t("productOptions.title", "Options")}
              </h3>
              {optionGroups.map((group) => {
                const minSelected = group.minSelected ?? 0;
                const maxSelected = group.maxSelected ?? (group.type === "SINGLE" ? 1 : null);
                const groupLabel = lang === "ar" ? group.nameAr || group.name : group.name || group.nameAr || group.name;
                let hint = t("productOptions.optional", "Optional");
                if (minSelected > 0 && maxSelected != null && minSelected === maxSelected) {
                  hint = t("productOptions.chooseExactly", {
                    count: minSelected,
                    defaultValue: `Choose ${minSelected}`,
                  });
                } else if (minSelected > 0 && maxSelected != null) {
                  hint = t("productOptions.chooseBetween", {
                    min: minSelected,
                    max: maxSelected,
                    defaultValue: `Choose ${minSelected}-${maxSelected}`,
                  });
                } else if (minSelected > 0) {
                  hint = t("productOptions.chooseAtLeast", {
                    min: minSelected,
                    defaultValue: `Choose at least ${minSelected}`,
                  });
                } else if (maxSelected != null) {
                  hint = t("productOptions.chooseUpTo", {
                    max: maxSelected,
                    defaultValue: `Choose up to ${maxSelected}`,
                  });
                }
                return (
                  <div key={group.id} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{groupLabel}</p>
                        <p className="text-xs text-gray-500">{hint}</p>
                      </div>
                      {minSelected > 0 && (
                        <Badge variant="secondary" className="rounded-full">
                          {t("productOptions.required", "Required")}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(group.options ?? []).map((option) => {
                        const qty = optionQuantities[option.id] ?? 0;
                        const maxQty = option.maxQtyPerOption ?? MAX_OPTION_QTY;
                        const isSelected = qty > 0;
                        const optionLabel = lang === "ar" ? option.nameAr || option.name : option.name || option.nameAr || option.name;
                        return (
                          <div
                            key={option.id}
                            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition ${
                              isSelected ? "border-primary/40 bg-primary/5" : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{optionLabel}</p>
                              <p className="text-xs text-gray-500">{fmtEGP(fromCents(option.priceCents))}</p>
                            </div>
                            {isSelected ? (
                              <div className="inline-flex items-center border border-gray-200 rounded-full bg-white shadow-inner">
                                <button
                                  className="px-2 py-1 text-gray-600 disabled:text-gray-300"
                                  onClick={() => updateOptionQty(group.id, option.id, qty - 1)}
                                  disabled={qty <= 0}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-2 text-sm font-semibold min-w-[32px] text-center">{qty}</span>
                                <button
                                  className="px-2 py-1 text-gray-600 disabled:text-gray-300"
                                  onClick={() => updateOptionQty(group.id, option.id, qty + 1)}
                                  disabled={qty >= maxQty}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => updateOptionQty(group.id, option.id, 1)}
                              >
                                {t("productOptions.add", "Add")}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
              {totalLabel}
            </p>
          </div>
          <Button
            onClick={addToCart}
            className="h-12 rounded-xl shadow-card min-w-[200px]"
            disabled={addingCart || (product.stock ?? 0) <= 0}
          >
            {(product.stock ?? 0) <= 0
              ? t("product.stock.out")
              : t("product.cta", { total: totalLabel })}
          </Button>
        </div>
      </div>
      {cartGuard.dialog}
    </div>
  );
}
