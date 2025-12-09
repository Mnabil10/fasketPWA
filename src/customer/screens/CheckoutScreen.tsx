import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Label } from "../../ui/label";
import { AlertTriangle, ArrowLeft, MapPin, Plus, Clock, Truck, DollarSign } from "lucide-react";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { useToast } from "../providers/ToastProvider";
import { useAddresses, useCart, useNetworkStatus, useApiErrorToast } from "../hooks";
import { placeOrder } from "../../services/orders";
import { fmtEGP, fromCents } from "../../lib/money";
import type { Address } from "../../types/api";
import { NetworkBanner, EmptyState, RetryBlock } from "../components";
import { trackCheckoutStarted, trackOrderFailed, trackOrderPlaced } from "../../lib/analytics";
import { goToCart } from "../navigation/navigation";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { extractNoticeMessage } from "../../utils/extractNoticeMessage";

interface CheckoutScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

export function CheckoutScreen({ appState, updateAppState }: CheckoutScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loyaltyToRedeem, setLoyaltyToRedeem] = useState(0);
  const cart = useCart({ userId: appState.user?.id, addressId: selectedAddressId });
  const { isOffline } = useNetworkStatus();
  const apiErrorToast = useApiErrorToast();
  const {
    addresses,
    isLoading: addressesLoading,
    isError: addressesError,
    error: addressesErrorObj,
    refetch: refetchAddresses,
  } = useAddresses();

  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponFeedback, setCouponFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const savingRef = useRef(false);

  const loading = cart.isLoading || cart.isFetching || addressesLoading;
  const hasError = cart.isError || addressesError;
  const combinedError = cart.error || addressesErrorObj;
  const errorMessage = hasError ? mapApiErrorToMessage(combinedError, "checkout.messages.loadError") : "";

  const serverCart = cart.rawCart;
  const previewItems = cart.items;
  const subtotal = fromCents(cart.subtotalCents);
  const shippingFee = fromCents(cart.shippingFeeCents);
  const couponDiscount = fromCents(cart.discountCents);
  const loyaltyDiscount = fromCents(cart.loyaltyDiscountCents);
  const cartId = serverCart?.cartId ?? null;
  const estimatedDeliveryMinutes = cart.deliveryEstimateMinutes ?? undefined;
  const loyaltyBalance = appState.user?.loyaltyPoints ?? appState.user?.points ?? 0;
  const maxRedeemablePoints = Math.min(loyaltyBalance, cart.loyaltyMaxRedeemablePoints || loyaltyBalance);
  const loyaltySettings = appState.settings?.loyalty;
  const redeemRate = loyaltySettings?.redeemRate && loyaltySettings.redeemRate > 0 ? loyaltySettings.redeemRate : 100;
  const previewRedeemValue = loyaltyToRedeem > 0 ? loyaltyToRedeem / redeemRate : 0;
  const total = Math.max(0, subtotal + shippingFee - couponDiscount - loyaltyDiscount - previewRedeemValue);
  const appliedCoupon = cart.couponCode;
  const loyaltyEnabled = Boolean(loyaltySettings?.enabled && maxRedeemablePoints > 0);
  const etaLabel = estimatedDeliveryMinutes
    ? t("checkout.summary.etaValue", { value: `${estimatedDeliveryMinutes} ${t("checkout.summary.minutes", "min")}` })
    : t("checkout.summary.etaValue", { value: "30-45 min" });
  const couponNotice = serverCart?.couponNotice;
  const couponNoticeText = extractNoticeMessage(couponNotice);
  const loyaltyNotices = useMemo(() => {
    if (!loyaltyEnabled) return [];
    const notes: string[] = [];
    if (maxRedeemablePoints > 0) {
      notes.push(
        t("checkout.loyalty.maxPerOrder", {
          value: maxRedeemablePoints,
          defaultValue: `You can redeem up to ${maxRedeemablePoints} points for this order.`,
        })
      );
    }
    if (loyaltySettings?.minRedeemPoints) {
      notes.push(
        t("checkout.loyalty.minRedeem", {
          value: loyaltySettings.minRedeemPoints,
          defaultValue: `Minimum ${loyaltySettings.minRedeemPoints} points to redeem.`,
        })
      );
    }
    if (loyaltySettings?.maxDiscountPercent) {
      notes.push(
        t("checkout.loyalty.maxDiscountPercent", {
          value: loyaltySettings.maxDiscountPercent,
          defaultValue: `Loyalty discount capped at ${loyaltySettings.maxDiscountPercent}% of order total.`,
        })
      );
    }
    return notes;
  }, [loyaltyEnabled, maxRedeemablePoints, loyaltySettings, t]);

  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    setLoyaltyToRedeem((prev) => Math.min(prev, maxRedeemablePoints));
  }, [maxRedeemablePoints]);

  useEffect(() => {
    if (previewItems.length) {
      trackCheckoutStarted(cartId || "cart");
    }
  }, [previewItems.length, cartId]);

  const selectedAddress = useMemo(() => {
    return addresses.find((addr: Address) => addr.id === selectedAddressId) || null;
  }, [addresses, selectedAddressId]);
  const showAddressWarning = Boolean(appState.user && (!selectedAddress || !selectedAddress.zoneId));

  function ensureIdempotencyKey() {
    if (idempotencyKeyRef.current) return idempotencyKeyRef.current;
    const key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    idempotencyKeyRef.current = key;
    return key;
  }

  async function handlePlaceOrder() {
    if (savingRef.current) return;
    let finalCartId: string | null = cartId;
    if (!finalCartId) {
      try {
        const refreshed = await cart.refetch();
        finalCartId = refreshed?.cartId ?? cart.rawCart?.cartId ?? null;
      } catch {
        finalCartId = null;
      }
    }
    if (!finalCartId) {
      showToast({ type: "error", message: t("checkout.messages.missingCart", "Your cart is not available.") });
      return;
    }
    if (!selectedAddressId) {
      showToast({ type: "error", message: t("checkout.messages.missingAddress") });
      return;
    }
    if (!selectedAddress?.zoneId) {
      showToast({ type: "error", message: t("checkout.messages.missingZone") });
      return;
    }
    if (isOffline) {
      showToast({ type: "error", message: t("checkout.messages.offline", "You are offline. Please reconnect.") });
      return;
    }
    const idempotencyKey = ensureIdempotencyKey();
    savingRef.current = true;
    setSaving(true);
    try {
      const note = deliveryNotes.trim();
      const res = await placeOrder({
        addressId: selectedAddressId,
        paymentMethod: "COD",
        note: note ? note : undefined,
        couponCode: appliedCoupon || undefined,
        loyaltyPointsToRedeem: loyaltyEnabled && loyaltyToRedeem > 0 ? loyaltyToRedeem : undefined,
        idempotencyKey,
      });
      await cart.refetch();
      const redeemedPoints = res.loyaltyPointsRedeemed ?? (loyaltyEnabled ? loyaltyToRedeem : 0);
      const earnedPoints = res.loyaltyPointsEarned ?? 0;
      setLoyaltyToRedeem(0);
      idempotencyKeyRef.current = null;
      updateAppState((prev) => ({
        ...prev,
        user: prev.user
          ? {
              ...prev.user,
              loyaltyPoints: Math.max(
                0,
                (prev.user.loyaltyPoints ?? prev.user.points ?? 0) - redeemedPoints + earnedPoints
              ),
              points: Math.max(
                0,
                (prev.user.points ?? prev.user.loyaltyPoints ?? 0) - redeemedPoints + earnedPoints
              ),
            }
          : prev.user,
        cart: [],
        lastOrder: res,
        lastOrderId: res.id,
        selectedOrder: res,
        selectedOrderId: res.id,
        selectedOrderSummary: {
          id: res.id,
          totalCents: res.totalCents,
          status: res.status,
          createdAt: res.createdAt,
        },
        currentScreen: "order-success",
      }));
      trackOrderPlaced(res.id, res.totalCents);
    } catch (error: any) {
      const friendly = apiErrorToast(error, "checkout.messages.submitError");
      trackOrderFailed(friendly);
      idempotencyKeyRef.current = null;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) {
      setCouponFeedback({ type: "error", message: t("checkout.coupon.required", "Enter a coupon code first.") });
      return;
    }
    setCouponFeedback(null);
    try {
      await cart.applyCoupon(code);
      setCouponFeedback({
        type: "success",
        message: t("checkout.coupon.applied", { code, defaultValue: `Coupon ${code} applied.` }),
      });
    } catch (error: any) {
      const message = mapApiErrorToMessage(error, "checkout.coupon.error");
      setCouponFeedback({ type: "error", message });
    }
  }

  const renderAddress = (address: Address) => {
    const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
    const zoneName = address.deliveryZone
      ? (lang === "ar" ? address.deliveryZone.nameAr || address.deliveryZone.nameEn : address.deliveryZone.nameEn || address.deliveryZone.nameAr)
      : address.zone;
    const line1 = [address.city, zoneName].filter(Boolean).join(", ");
    const line2 = [address.street, address.building, address.apartment].filter(Boolean).join(", ");
    const zoneSummary = address.deliveryZone
      ? [
          fmtEGP(fromCents(address.deliveryZone.feeCents)),
          address.deliveryZone.etaMinutes
            ? t("addresses.zoneEta", { value: address.deliveryZone.etaMinutes })
            : null,
        ]
          .filter(Boolean)
          .join(" • ")
      : null;
    const isSelected = selectedAddressId === address.id;

    return (
      <button
        key={address.id}
        onClick={() => setSelectedAddressId(address.id)}
        className={`w-full text-left rounded-xl border p-4 transition ${
          isSelected ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <p className="font-semibold text-gray-900">{address.label || t("checkout.address.defaultName")}</p>
            {address.isDefault && (
              <Badge variant="secondary" className="text-xs">
                {t("addresses.badges.default", "Default")}
              </Badge>
            )}
          </div>
          {isSelected && <Badge>{t("checkout.address.selected", "Selected")}</Badge>}
        </div>
        <p className="text-sm text-gray-700">{line1 || t("checkout.address.noCity")}</p>
        {line2 && <p className="text-xs text-gray-500 mt-1">{line2}</p>}
        {zoneSummary && <p className="text-xs text-gray-500 mt-1">{zoneSummary}</p>}
      </button>
    );
  };

  const renderItems = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-white rounded-xl p-3 shadow-sm flex gap-3 border border-border">
              <Skeleton className="w-16 h-16 rounded-lg skeleton-soft" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 skeleton-soft" />
                <Skeleton className="h-4 w-1/3 skeleton-soft" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!previewItems.length) {
      return (
        <div className="bg-white rounded-xl p-6 text-center text-gray-500">
          {t("checkout.messages.emptyCart", "Your cart is empty. Add items to checkout.")}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {previewItems.map((item) => {
          const price = item.price;
          return (
            <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm flex gap-3 border border-border">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                {item.image ? (
                  <ImageWithFallback src={item.image} alt={item.name ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">Cart</div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.name || item.product?.name || t("checkout.item.unknown")}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity} x {fmtEGP(price)}
                </p>
              </div>
              <div className="font-semibold text-gray-900">{fmtEGP(price * item.quantity)}</div>
            </div>
          );
        })}
      </div>
    );
  };

  if (hasError) {
    return (
      <div className="page-shell">
        <NetworkBanner />
        <RetryBlock
          message={errorMessage || t("checkout.messages.loadError")}
          onRetry={() => {
            cart.refetch();
            refetchAddresses();
          }}
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <NetworkBanner />
      <div className="section-card flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => goToCart(updateAppState)} className="p-2 mr-2 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {t("checkout.title")}
            </h1>
            <p className="text-xs text-gray-500">{t("checkout.subtitle", { count: previewItems.length })}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => updateAppState({ currentScreen: "addresses" })} className="rounded-xl">
          <Plus className="w-4 h-4 mr-1" />
          {t("checkout.address.add")}
        </Button>
      </div>

      <div className="section-card glass-surface space-y-2">
        <p className="text-xs text-gray-500">{t("checkout.stepsLabel", "Cart > Address > Summary > Confirm")}</p>
        <div className="flex items-center gap-3 text-sm font-semibold text-gray-900">
          {[
            t("checkout.steps.cart", "Cart"),
            t("checkout.steps.address", "Address"),
            t("checkout.steps.summary", "Summary"),
            t("checkout.steps.confirm", "Confirm"),
          ].map((label, idx) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${idx <= 2 ? "bg-primary" : "bg-gray-300"}`}>
                {idx + 1}
              </div>
              <span className="text-xs sm:text-sm">{label}</span>
              {idx < 3 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-24 w-full">
        <section className="section-card space-y-3">
          <h2 className="font-semibold text-gray-900 mb-3">{t("checkout.sections.items")}</h2>
          {renderItems()}
        </section>

        <section className="section-card space-y-3">
          <h2 className="font-semibold text-gray-900 mb-3">{t("checkout.sections.address")}</h2>
          {addresses.length === 0 && !loading ? (
            <EmptyState
              icon={<MapPin className="w-10 h-10 text-primary" />}
              title={t("checkout.address.empty", "No saved addresses yet. Add one to continue.")}
              subtitle={t("checkout.address.subtitle", "Create an address to place your order.")}
              actionLabel={t("checkout.address.add")}
              onAction={() => updateAppState({ currentScreen: "addresses" })}
            />
          ) : (
            <div className="space-y-3">{addresses.map(renderAddress)}</div>
          )}
        </section>

        <section className="section-card space-y-3">
          <h2 className="font-semibold text-gray-900 mb-3">{t("checkout.sections.payment")}</h2>
          <div className="inline-card flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-gray-900">{t("checkout.payment.codOnly", "Cash on delivery")}</p>
              <p className="text-sm text-gray-600">
                {t("checkout.payment.codOnlyDesc", "Only cash payments are supported at the moment.")}
              </p>
            </div>
          </div>
        </section>

        {loyaltyEnabled && (
          <section className="section-card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{t("checkout.loyalty.title")}</h2>
              <Button variant="ghost" size="sm" onClick={() => setLoyaltyToRedeem(maxRedeemablePoints)}>
                {t("checkout.loyalty.useMax")}
              </Button>
            </div>
            <div>
              <Label>{t("checkout.loyalty.pointsLabel")}</Label>
              <Input
                type="number"
                min={0}
                max={maxRedeemablePoints}
                value={loyaltyToRedeem}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (Number.isNaN(next)) {
                    setLoyaltyToRedeem(0);
                    return;
                  }
                  setLoyaltyToRedeem(Math.max(0, Math.min(maxRedeemablePoints, next)));
                }}
                disabled={isOffline}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-gray-500">
              {t("checkout.loyalty.balance", { balance: loyaltyBalance })}
            </p>
            {previewRedeemValue > 0 && (
              <p className="text-xs text-green-600">
                {t("checkout.loyalty.preview", { amount: fmtEGP(previewRedeemValue) })}
              </p>
            )}
            {loyaltyNotices.length > 0 && (
              <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                {loyaltyNotices.map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="section-card space-y-3">
          <h3 className="font-semibold text-gray-900">{t("checkout.coupon.title", "Coupon")}</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder={t("checkout.coupon.placeholder", "Enter coupon code")}
              className="flex-1"
              disabled={cart.applyingCoupon}
            />
            <Button
              type="button"
              onClick={handleApplyCoupon}
              disabled={cart.applyingCoupon}
              className="h-11 rounded-xl sm:w-32"
            >
              {cart.applyingCoupon ? t("checkout.coupon.applying", "Applying...") : t("checkout.coupon.apply", "Apply")}
            </Button>
          </div>
          {appliedCoupon && (
            <p className="text-xs text-gray-500">{t("checkout.coupon.appliedLabel", { code: appliedCoupon, defaultValue: `Applied coupon: ${appliedCoupon}` })}</p>
          )}
          {couponFeedback && (
            <p className={`text-sm ${couponFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}>{couponFeedback.message}</p>
          )}
          {couponNoticeText && (
            <div className="bg-amber-50 text-amber-900 text-xs rounded-xl p-2 border border-amber-100">
              {couponNoticeText}
            </div>
          )}
        </section>

        <section className="section-card space-y-3">
          <h3 className="font-semibold text-gray-900">{t("checkout.sections.notes")}</h3>
          <Textarea
            placeholder={t("checkout.notes.placeholder")}
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            className="min-h-[80px]"
          />
        </section>

        <section className="section-card space-y-3">
          <h3 className="font-semibold text-gray-900">{t("checkout.sections.summary")}</h3>
          {showAddressWarning && (
            <div className="bg-amber-50 text-amber-900 text-sm rounded-xl p-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{t("checkout.messages.missingZone")}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{t("checkout.summary.subtotal")}</span>
            <span className="price-text">{fmtEGP(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Truck className="w-4 h-4" />
              {t("checkout.summary.delivery")}
            </span>
            <span className="price-text">{shippingFee ? fmtEGP(shippingFee) : t("checkout.summary.freeDelivery", "Free")}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {t("checkout.summary.eta")}
            </span>
            <span>{selectedAddress ? etaLabel : t("checkout.summary.etaUnknown")}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>{t("checkout.summary.discount", "Discount")}</span>
              <span className="price-text">-{fmtEGP(couponDiscount)}</span>
            </div>
          )}
          {(loyaltyDiscount > 0 || previewRedeemValue > 0) && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>{t("checkout.loyalty.summaryLabel")}</span>
              <span className="price-text">-{fmtEGP(loyaltyDiscount + previewRedeemValue)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-lg font-semibold text-gray-900">
            <span>{t("checkout.summary.total")}</span>
            <span className="price-text">{fmtEGP(total)}</span>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">{t("checkout.trust.title", "We deliver anywhere inside Badr City")}</p>
            <p className="text-xs text-gray-600">
              {t("checkout.trust.support", "Support available on WhatsApp for updates.")}
            </p>
          </div>
          <Button
            className="w-full h-12 rounded-xl"
            onClick={handlePlaceOrder}
            disabled={saving || !previewItems.length || !selectedAddressId || isOffline || !cartId}
          >
            {saving ? t("checkout.actions.placing") : t("checkout.actions.placeOrder")}
          </Button>
        </section>
      </div>
      {saving && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white rounded-xl px-6 py-4 shadow-xl text-center space-y-2">
            <p className="font-semibold text-gray-900">{t("checkout.actions.placing")}</p>
            <p className="text-sm text-gray-600">{t("checkout.messages.processing", "Please wait while we place your order...")}</p>
          </div>
        </div>
      )}
    </div>
  );
}







