import React from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus, ShoppingCart, Sparkles, Weight } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import type { Product } from "../../types/api";
import { fmtEGP, fromCents } from "../../lib/money";
import { SmartImage } from "../../components/SmartImage";
import { requiresOptionSelection } from "../utils/productOptions";
import { formatQty } from "../utils/quantity";

type ProductCardProps = {
  product: Product;
  layout?: "grid" | "list";
  imageVariant?: "default" | "compact";
  disabled?: boolean;
  adding?: boolean;
  onPress?: (product: Product) => void;
  onAddToCart?: (product: Product) => void | Promise<void>;
  quantity?: number;
  onIncrease?: () => void;
  onDecrease?: () => void;
  showCategory?: boolean;
  metaLabel?: string;
};

const resolveImageSizeClasses = (layout: "grid" | "list", variant: "default" | "compact") => {
  if (variant === "compact") {
    return layout === "list"
      ? "w-24 h-24"
      : "w-full max-w-[120px] aspect-square mx-auto";
  }
  return layout === "list" ? "w-24 aspect-[3/4]" : "w-full aspect-[3/4]";
};

export function ProductCard({
  product,
  layout = "grid",
  imageVariant = "default",
  disabled,
  adding,
  onPress,
  onAddToCart,
  quantity,
  onIncrease,
  onDecrease,
  showCategory = true,
  metaLabel,
}: ProductCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const isWeightProduct =
    product.pricingModel === "weight" ||
    product.isWeightBased ||
    product.weightBased ||
    product.soldByWeight;
  const rawUnitLabel = product.unitLabel?.trim() || "";
  const normalizedUnit = rawUnitLabel.toLowerCase();
  const weightUnits = new Set(["kg", "k.g", "kilo", "kilogram", "كيلو", "كجم", "جم", "g", "gram", "grams"]);
  const resolvedWeightUnit = weightUnits.has(normalizedUnit) ? rawUnitLabel : "kg";
  const unitLabel = isWeightProduct ? resolvedWeightUnit : rawUnitLabel;
  const pricePerKgCents = product.pricePerKg ?? (isWeightProduct ? product.priceCents : null);
  const price = fmtEGP(fromCents(product.priceCents));
  const isOnSale = !isWeightProduct && product.salePriceCents !== null && product.salePriceCents !== undefined;
  const salePrice = isOnSale ? fmtEGP(fromCents(product.salePriceCents || 0)) : null;
  const effectivePriceCents = product.salePriceCents ?? product.priceCents;
  const hasSetPriceGroup = (product.optionGroups ?? []).some(
    (group) => group.isActive !== false && (group.priceMode ?? "ADD") === "SET"
  );
  const showSelectPrice = !isWeightProduct && (effectivePriceCents <= 0 || hasSetPriceGroup);
  const requiresOptions = requiresOptionSelection(product);
  const requiresSelection = showSelectPrice || requiresOptions || isWeightProduct;
  const discountPct = isOnSale
    ? Math.max(0, Math.round((1 - (product.salePriceCents || 0) / product.priceCents) * 100))
    : null;
  const stock = product.stock ?? 0;
  const isOutOfStock = stock <= 0;
  const stockLabel =
    stock <= 0
      ? t("product.stock.out")
      : stock < 3
        ? t("product.stock.low", { count: stock })
        : t("product.stock.in");
  const quickQty = Math.max(0, quantity ?? 0);
  const canAdjustQty = typeof onIncrease === "function" && typeof onDecrease === "function";
  const showStepper = quickQty > 0 && !requiresSelection && canAdjustQty;
  const showAddButton = !showStepper;
  const tagSet = new Set((product.tags ?? []).map((tag) => String(tag).toLowerCase()));
  const showFreshBadge = tagSet.has("fresh") || tagSet.has("produce") || tagSet.has("farm");
  const showNextDayBadge = tagSet.has("next-day") || tagSet.has("tomorrow") || tagSet.has("nextday");

  const containerClasses =
    layout === "list"
      ? "group flex gap-4 items-center w-full"
      : "group flex flex-col gap-3 h-full w-full";

  const imageSize = resolveImageSizeClasses(layout, imageVariant);

  const handlePress = () => {
    if (disabled) return;
    onPress?.(product);
  };

  const handleAdd = () => {
    if (disabled) return;
    if (requiresSelection) {
      onPress?.(product);
      return;
    }
    if (!onAddToCart) return;
    onAddToCart(product);
  };

  const badgeItems = [
    isOutOfStock ? { key: "out", label: t("products.badges.outOfStock", "Out of stock"), variant: "destructive" as const } : null,
    isOutOfStock && (product.category?.id || product.category?.slug)
      ? { key: "alt", label: t("products.badges.suggestedAlt", "Suggested alternative"), variant: "secondary" as const }
      : null,
    isWeightProduct ? { key: "weight", label: t("products.badges.byWeight", "By weight"), variant: "secondary" as const } : null,
    showFreshBadge ? { key: "fresh", label: t("products.badges.fresh", "Fresh"), variant: "success" as const } : null,
    showNextDayBadge ? { key: "next-day", label: t("products.badges.nextDay", "Next day"), variant: "outline" as const } : null,
    !isOutOfStock && stock < 3
      ? { key: "low", label: t("product.stock.low", { count: stock, defaultValue: `Low stock (${stock})` }), variant: "warning" as const }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; variant: "default" | "secondary" | "destructive" | "outline" | "warning" | "success" }>;
  const visibleBadges = badgeItems.slice(0, 2);

  return (
    <div
      className={`${containerClasses} rounded-[var(--radius-lg)] bg-[var(--surface-card)] border border-[var(--border-strong)] shadow-[var(--shadow-card)] transition-transform duration-200 motion-pop`}
      role="button"
      tabIndex={0}
      onClick={handlePress}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handlePress();
      }}
      dir="auto"
      aria-disabled={disabled}
    >
      <div className={`relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-muted)] ${imageSize} flex-shrink-0`}>
        {discountPct !== null && discountPct > 0 && (
          <div className="absolute left-2 top-2 z-10">
            <Badge variant="destructive" className="text-[11px] rounded-full px-2 py-1 shadow-sm">
              -{discountPct}%
            </Badge>
          </div>
        )}
        <SmartImage
          src={product.imageUrl}
          alt={product.name}
          objectFit="cover"
          className="w-full h-full transition-transform duration-300 ease-out group-hover:scale-105"
        />
      </div>

      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[13px] sm:text-[15px] text-[var(--ink-900)] leading-5 line-clamp-2 break-words">
            {product.name}
          </h3>
          {product.tags?.includes?.("featured") && layout === "grid" ? <FeaturedBadge /> : null}
        </div>
        {showCategory && (
          <p className="text-[11px] sm:text-xs text-[var(--ink-500)] line-clamp-1">{product.category?.name}</p>
        )}
        {metaLabel ? (
          <p className="text-[11px] sm:text-xs text-[var(--ink-500)] line-clamp-1">{metaLabel}</p>
        ) : null}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className={
              showSelectPrice
                ? "text-[11px] sm:text-xs leading-4 text-[var(--ink-500)] line-clamp-2"
                : "font-semibold text-[13px] sm:text-[15px] text-[var(--color-primary)] price-text whitespace-nowrap"
            }
            data-price
          >
            {isWeightProduct && pricePerKgCents !== null && pricePerKgCents !== undefined
              ? `${fmtEGP(fromCents(pricePerKgCents))} / ${unitLabel}`
              : showSelectPrice
              ? t("products.priceOnSelect", "Select options to set price")
              : fmtEGP(fromCents(effectivePriceCents))}
          </span>
          {salePrice && !showSelectPrice && (
            <span className="text-xs text-[var(--ink-500)] line-through price-text whitespace-nowrap" data-price>
              {price}
            </span>
          )}
          {!isWeightProduct && unitLabel ? (
            <span className="text-[11px] sm:text-xs text-[var(--ink-500)] whitespace-nowrap">{unitLabel}</span>
          ) : null}
        </div>
        {visibleBadges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleBadges.map((badge) => (
              <Badge
                key={badge.key}
                variant={badge.variant}
                className="text-[10px] w-fit whitespace-nowrap rounded-full px-2"
              >
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 mt-auto w-full">
          {showAddButton ? (
            <Button
              size="sm"
              className="min-h-9 h-auto rounded-xl px-2 sm:px-3 w-full justify-center gap-2 text-[11px] sm:text-sm leading-4"
              disabled={disabled || adding || isOutOfStock}
              onClick={(e) => {
                e.stopPropagation();
                handleAdd();
              }}
            >
              {isOutOfStock
                ? t("product.stock.out")
                : adding
                  ? t("products.buttons.adding")
                  : requiresSelection
                    ? (
                      <>
                        {isWeightProduct ? <Weight className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                        {isWeightProduct
                          ? t("products.buttons.selectWeight", "Select weight")
                          : t("products.buttons.selectOptions", "Select options")}
                      </>
                    )
                    : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        {t("products.buttons.add")}
                      </>
                    )}
            </Button>
          ) : (
            <div className={`flex items-center justify-between gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className={`inline-flex items-center border border-gray-200 rounded-full bg-gray-50 shadow-inner ${isRTL ? "flex-row-reverse" : ""}`}>
                <button
                  type="button"
                  className="px-3 py-1 text-gray-600 disabled:text-gray-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecrease?.();
                  }}
                  disabled={disabled || adding || quickQty <= 0}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 font-semibold min-w-[40px] text-center">{formatQty(quickQty)}</span>
                <button
                  type="button"
                  className="px-3 py-1 text-gray-600 disabled:text-gray-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onIncrease?.();
                  }}
                  disabled={disabled || adding || isOutOfStock}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs text-[var(--ink-500)]">{stockLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton({
  layout = "grid",
  imageVariant = "default",
}: {
  layout?: "grid" | "list";
  imageVariant?: "default" | "compact";
}) {
  const containerClasses =
    layout === "list"
      ? "flex gap-3 items-center bg-white rounded-xl p-3 shadow-sm w-full"
      : "bg-white rounded-xl p-3 shadow-sm flex flex-col gap-3 h-full";
  const imageSize = resolveImageSizeClasses(layout, imageVariant);

  return (
    <div className={`${containerClasses} motion-fade`}>
      <Skeleton className={`rounded-lg ${imageSize} skeleton-soft`} />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 skeleton-soft" />
        <Skeleton className="h-3 w-1/2 skeleton-soft" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16 skeleton-soft" />
          <Skeleton className="h-9 w-20 skeleton-soft" />
        </div>
      </div>
    </div>
  );
}

export function FeaturedBadge() {
  const { t } = useTranslation();
  return (
    <Badge variant="secondary" className="flex items-center gap-1 rounded-full">
      <Sparkles className="w-3 h-3" />
      <span className="text-xs">{t("products.featuredBadge", "Featured")}</span>
    </Badge>
  );
}
