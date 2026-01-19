import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Label } from "../../ui/label";
import { AlertTriangle, ArrowLeft, MapPin, Plus, Clock, Truck, DollarSign, CreditCard, Wallet } from "lucide-react";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { useToast } from "../providers/ToastProvider";
import { useAddresses, useCart, useNetworkStatus, useApiErrorToast, usePaymentMethods } from "../hooks";
import { placeGuestOrder, placeOrder, quoteGuestOrder, type GuestOrderQuote } from "../../services/orders";
import { getDeliveryWindows } from "../../services/settings";
import { fmtEGP, fromCents } from "../../lib/money";
import type { Address, OrderDetail, OrderGroupSummary, SavedPaymentMethod } from "../../types/api";
import { NetworkBanner, EmptyState, RetryBlock } from "../components";
import { trackCheckoutStarted, trackOrderFailed, trackOrderPlaced } from "../../lib/analytics";
import { goToCart } from "../navigation/navigation";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { extractNoticeMessage } from "../../utils/extractNoticeMessage";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { isFeatureEnabled } from "../utils/mobileAppConfig";
import { isValidEgyptPhone, normalizeEgyptPhone, sanitizeEgyptPhoneInput } from "../../utils/phone";

interface CheckoutScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

type DeliverySlot = {
  id: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  windowId: string;
  scheduledAt: string;
};

const WEIGHT_PATTERN = /\b(weight|weighed|weighing|kg|kilo|kilogram|grams|gram|g)\b/i;
const AR_WEIGHT_PATTERN = /(\u0627\u0644\u0648\u0632\u0646|\u0648\u0632\u0646|\u0643\u064a\u0644\u0648|\u0643\u062c\u0645|\u062c\u0645)/;

function hasWeightKeyword(value?: string | null) {
  if (!value) return false;
  return WEIGHT_PATTERN.test(value) || AR_WEIGHT_PATTERN.test(value);
}

export function CheckoutScreen({ appState, updateAppState }: CheckoutScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const isGuest = !appState.user;
  const guestCheckoutEnabled = isFeatureEnabled(appState.settings?.mobileApp, "guestCheckout", true);
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
  } = useAddresses({ enabled: !isGuest });
  const paymentMethodsQuery = usePaymentMethods({ enabled: !isGuest });
  const paymentMethods = paymentMethodsQuery.methods ?? [];

  const guestSession = appState.guestSession;
  const [guestName, setGuestName] = useState(guestSession?.name ?? "");
  const [guestPhone, setGuestPhone] = useState(guestSession?.phone ?? "");
  const [guestAddress, setGuestAddress] = useState(guestSession?.address?.fullAddress ?? "");
  const [guestAddressNotes, setGuestAddressNotes] = useState(guestSession?.address?.notes ?? "");
  const [guestQuote, setGuestQuote] = useState<GuestOrderQuote | null>(null);
  const [guestQuoteError, setGuestQuoteError] = useState<string | null>(null);
  const [guestQuoteLoading, setGuestQuoteLoading] = useState(false);
  const guestQuoteRef = useRef(0);

  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponFeedback, setCouponFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const [deliveryTermsAccepted, setDeliveryTermsAccepted] = useState(false);
  const [weightNoticeAccepted, setWeightNoticeAccepted] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<"COD" | "CARD" | "WALLET">("COD");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"ASAP" | "SCHEDULED">("ASAP");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const loading = cart.isLoading || cart.isFetching || (!isGuest && addressesLoading);
  const hasError = cart.isError || (!isGuest && addressesError);
  const combinedError = cart.error || addressesErrorObj;
  const errorMessage = hasError ? mapApiErrorToMessage(combinedError, "checkout.messages.loadError") : "";

  const serverCart = cart.rawCart;
  const previewItems = cart.items;
  const guestAddressValid = guestAddress.trim().length > 0;
  const normalizedGuestPhone = normalizeEgyptPhone(guestPhone);
  const guestPhoneValid = Boolean(normalizedGuestPhone);

  const guestItems = useMemo(
    () =>
      previewItems.map((item) => ({
        productId: item.productId,
        qty: item.quantity,
        branchId: item.branchId ?? item.product?.branchId ?? null,
        options: item.options?.map((opt) => ({ optionId: opt.optionId, qty: opt.qty })) ?? undefined,
      })),
    [previewItems]
  );

  const cartGroups = isGuest ? guestQuote?.groups ?? [] : serverCart?.groups ?? [];
  const subtotalCents = isGuest ? guestQuote?.subtotalCents ?? cart.subtotalCents : cart.subtotalCents;
  const shippingFeeCents = isGuest ? guestQuote?.shippingFeeCents ?? 0 : cart.shippingFeeCents;
  const serviceFeeCents = isGuest ? guestQuote?.serviceFeeCents ?? 0 : cart.serviceFeeCents;
  const discountCents = isGuest ? 0 : cart.discountCents;
  const loyaltyDiscountCents = isGuest ? 0 : cart.loyaltyDiscountCents;
  const subtotal = fromCents(subtotalCents);
  const shippingFee = fromCents(shippingFeeCents);
  const serviceFee = fromCents(serviceFeeCents);
  const shippingDisplayedCents = shippingFeeCents + serviceFeeCents;
  const shippingDisplayed = fromCents(shippingDisplayedCents);
  const couponDiscount = fromCents(discountCents);
  const loyaltyDiscount = fromCents(loyaltyDiscountCents);
  const cartId = serverCart?.cartId ?? null;
  const estimatedDeliveryMinutes = isGuest
    ? appState.settings?.delivery?.defaultEtaMinutes ?? undefined
    : cart.deliveryEstimateMinutes ?? undefined;
  const loyaltyBalance = appState.user?.loyaltyPoints ?? appState.user?.points ?? 0;
  const maxRedeemablePoints = Math.min(loyaltyBalance, cart.loyaltyMaxRedeemablePoints || loyaltyBalance);
  const loyaltySettings = appState.settings?.loyalty;
  const redeemRate = loyaltySettings?.redeemRate && loyaltySettings.redeemRate > 0 ? loyaltySettings.redeemRate : 100;
  const previewRedeemValue = loyaltyToRedeem > 0 ? loyaltyToRedeem / redeemRate : 0;
  const total = Math.max(
    0,
    subtotal + shippingFee + serviceFee - couponDiscount - loyaltyDiscount - previewRedeemValue
  );
  const appliedCoupon = cart.couponCode;
  const couponsEnabled = isFeatureEnabled(appState.settings?.mobileApp, "coupons", true);
  const loyaltyFeatureEnabled = isFeatureEnabled(appState.settings?.mobileApp, "loyalty", true);
  const loyaltyEnabled = !isGuest && Boolean(loyaltySettings?.enabled && loyaltyFeatureEnabled && maxRedeemablePoints > 0);
  const paymentSettings = appState.settings?.payment ?? null;
  const legacyCodEnabled = paymentSettings && "codEnabled" in paymentSettings ? (paymentSettings as any).codEnabled : undefined;
  const legacyCardEnabled = paymentSettings && "cardEnabled" in paymentSettings ? (paymentSettings as any).cardEnabled : undefined;
  const codEnabled = legacyCodEnabled ?? paymentSettings?.cashOnDelivery?.enabled !== false;
  const cardEnabled = legacyCardEnabled ?? paymentSettings?.creditCards?.enabled === true;
  const walletConfigs = paymentSettings?.digitalWallets ?? {};
  const walletProviderOptions: Array<{ key: "VODAFONE_CASH" | "ORANGE_MONEY" | "ETISALAT_CASH"; label: string }> = [
    { key: "VODAFONE_CASH", label: t("checkout.payment.walletProviders.vodafone", "Vodafone Cash") },
    { key: "ORANGE_MONEY", label: t("checkout.payment.walletProviders.orange", "Orange Money") },
    { key: "ETISALAT_CASH", label: t("checkout.payment.walletProviders.etisalat", "Etisalat Cash") },
  ];
  const enabledWalletProviders = walletProviderOptions.filter((provider) => {
    if (provider.key === "VODAFONE_CASH") return walletConfigs.vodafoneCash?.enabled === true;
    if (provider.key === "ORANGE_MONEY") return walletConfigs.orangeMoney?.enabled === true;
    if (provider.key === "ETISALAT_CASH") return walletConfigs.etisalatCash?.enabled === true;
    return false;
  });
  const walletEnabled = enabledWalletProviders.length > 0;
  const scheduleProviderId = cart.cartProviderId ?? null;
  const scheduleBranchId = cart.cartBranchId ?? null;
  const canSchedule = !cart.cartScopeMixed && Boolean(scheduleProviderId || scheduleBranchId);
  const deliveryWindowsQuery = useQuery({
    queryKey: ["delivery-windows", scheduleProviderId ?? "none", scheduleBranchId ?? "none"],
    queryFn: () =>
      getDeliveryWindows({
        providerId: scheduleProviderId ?? undefined,
        branchId: scheduleBranchId ?? undefined,
      }),
    enabled: canSchedule && !isOffline,
    staleTime: 2 * 60 * 1000,
  });
  const deliveryWindows = deliveryWindowsQuery.data?.data ?? [];
  const scheduleLoading = deliveryWindowsQuery.isLoading || deliveryWindowsQuery.isFetching;
  const showScheduleSection = canSchedule && (scheduleLoading || deliveryWindows.length > 0);
  const availableSlots = useMemo<DeliverySlot[]>(() => {
    if (!canSchedule || !deliveryWindows.length) return [];
    const locale = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";
    const formatTime = (date: Date) =>
      date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    const formatDate = (date: Date) =>
      date.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const slots: DeliverySlot[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(startOfDay);
      date.setDate(date.getDate() + offset);
      const day = date.getDay();
      const dateKey = date.toISOString().slice(0, 10);
      for (const window of deliveryWindows) {
        if (Array.isArray(window.daysOfWeek) && window.daysOfWeek.length > 0 && !window.daysOfWeek.includes(day)) {
          continue;
        }
        if (window.minOrderAmountCents && subtotalCents < window.minOrderAmountCents) {
          continue;
        }
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        start.setMinutes(window.startMinutes);
        const end = new Date(date);
        end.setHours(0, 0, 0, 0);
        end.setMinutes(window.endMinutes);
        const leadMinutes = window.minLeadMinutes ?? 0;
        const earliest = new Date(now.getTime() + leadMinutes * 60 * 1000);
        if (start < earliest) continue;
        const timeLabel = `${formatTime(start)} - ${formatTime(end)}`;
        slots.push({
          id: `${window.id}:${dateKey}`,
          dateKey,
          dateLabel: formatDate(date),
          timeLabel,
          windowId: window.id,
          scheduledAt: start.toISOString(),
        });
      }
    }
    return slots.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }, [canSchedule, deliveryWindows, i18n.language, subtotalCents]);
  const scheduleReady = canSchedule && !scheduleLoading;
  const scheduleDisabled = scheduleReady && availableSlots.length === 0;
  const selectedSlot = useMemo(
    () => availableSlots.find((slot) => slot.id === selectedSlotId) ?? null,
    [availableSlots, selectedSlotId]
  );
  const slotsByDate = useMemo(() => {
    const grouped = new Map<string, { dateKey: string; dateLabel: string; slots: DeliverySlot[] }>();
    availableSlots.forEach((slot) => {
      if (!grouped.has(slot.dateKey)) {
        grouped.set(slot.dateKey, { dateKey: slot.dateKey, dateLabel: slot.dateLabel, slots: [] });
      }
      grouped.get(slot.dateKey)!.slots.push(slot);
    });
    return Array.from(grouped.values());
  }, [availableSlots]);

  useEffect(() => {
    if (deliveryMode === "ASAP") {
      setSelectedSlotId(null);
    }
  }, [deliveryMode]);

  useEffect(() => {
    if (deliveryMode === "SCHEDULED" && scheduleDisabled) {
      setDeliveryMode("ASAP");
    }
  }, [deliveryMode, scheduleDisabled]);

  useEffect(() => {
    if (selectedSlotId && !selectedSlot) {
      setSelectedSlotId(null);
    }
  }, [selectedSlotId, selectedSlot]);
  const hasWeightBasedItems = useMemo(
    () =>
      previewItems.some((item) => {
        const product = item.product ?? {};
        const weightFlag =
          (product as any).pricingModel === "weight" ||
          (product as any).weightBased ||
          (product as any).soldByWeight ||
          (product as any).isWeightBased;
        if (weightFlag) return true;
        const tags = (product as any).tags;
        if (Array.isArray(tags) && tags.some((tag) => hasWeightKeyword(tag))) return true;
        if (
          item.options?.some((opt) =>
            [opt.groupName, opt.groupNameAr, opt.name, opt.nameAr].some((label) => hasWeightKeyword(label))
          )
        ) {
          return true;
        }
        return [item.name, (product as any).name, (product as any).nameAr].some((label) => hasWeightKeyword(label));
      }),
    [previewItems]
  );

  useEffect(() => {
    if (!hasWeightBasedItems) {
      setWeightNoticeAccepted(false);
    }
  }, [hasWeightBasedItems]);
  const cardMethods = useMemo(
    () => paymentMethods.filter((method) => method.type === "CARD"),
    [paymentMethods]
  );
  const walletMethods = useMemo(
    () => paymentMethods.filter((method) => method.type === "WALLET"),
    [paymentMethods]
  );
  const etaLabel = estimatedDeliveryMinutes
    ? t("checkout.summary.etaValue", { value: `${estimatedDeliveryMinutes} ${t("checkout.summary.minutes", "min")}` })
    : t("checkout.summary.etaValue", { value: "30-45 min" });
  const deliveryFeeLabel =
    shippingDisplayedCents > 0 ? fmtEGP(shippingDisplayed) : t("checkout.summary.freeDelivery", "Free");
  const deliveryFeeEstimate =
    isGuest
      ? guestQuoteLoading
        ? t("checkout.deliveryEstimate.calculating", "Calculating delivery fee...")
        : guestQuote
          ? deliveryFeeLabel
          : t("checkout.deliveryEstimate.pendingGuest", "Enter address to see delivery fee")
      : selectedAddressId
        ? deliveryFeeLabel
        : t("checkout.deliveryEstimate.pending", "Select an address to see delivery fee");
  const couponNotice = !isGuest ? serverCart?.couponNotice : null;
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
    if (isGuest) {
      setSelectedPaymentType("COD");
      return;
    }
    const available: Array<"COD" | "CARD" | "WALLET"> = [];
    if (codEnabled) available.push("COD");
    if (cardEnabled) available.push("CARD");
    if (walletEnabled) available.push("WALLET");
    if (available.length && !available.includes(selectedPaymentType)) {
      setSelectedPaymentType(available[0]);
    }
  }, [isGuest, codEnabled, cardEnabled, walletEnabled, selectedPaymentType]);

  useEffect(() => {
    if (selectedPaymentType === "CARD") {
      const preferred = cardMethods.find((method) => method.isDefault) ?? cardMethods[0] ?? null;
      setSelectedPaymentMethodId(preferred?.id ?? null);
      return;
    }
    if (selectedPaymentType === "WALLET") {
      const preferred = walletMethods.find((method) => method.isDefault) ?? walletMethods[0] ?? null;
      setSelectedPaymentMethodId(preferred?.id ?? null);
      return;
    }
    setSelectedPaymentMethodId(null);
  }, [selectedPaymentType, cardMethods, walletMethods]);

  const debouncedGuestAddress = useDebouncedValue(guestAddress, 350);

  const checkoutSteps = isGuest
    ? [t("checkout.steps.cart", "Cart"), t("checkout.steps.guest", "Details"), t("checkout.steps.confirm", "Confirm")]
    : [
        t("checkout.steps.cart", "Cart"),
        t("checkout.steps.address", "Address"),
        t("checkout.steps.summary", "Summary"),
        t("checkout.steps.confirm", "Confirm"),
      ];

  useEffect(() => {
    if (isGuest) return;
    if (!selectedAddressId && addresses.length > 0) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [addresses, selectedAddressId, isGuest]);

  useEffect(() => {
    if (isGuest) {
      setLoyaltyToRedeem(0);
      return;
    }
    setLoyaltyToRedeem((prev) => Math.min(prev, maxRedeemablePoints));
  }, [maxRedeemablePoints, isGuest]);

  useEffect(() => {
    if (previewItems.length) {
      trackCheckoutStarted(cartId || "cart");
    }
  }, [previewItems.length, cartId]);

  useEffect(() => {
    if (!isGuest) return;
    updateAppState({
      guestSession: {
        name: guestName.trim() || undefined,
        phone: guestPhone.trim() || undefined,
        address: {
          fullAddress: guestAddress.trim() || undefined,
          notes: guestAddressNotes.trim() || undefined,
        },
      },
    });
  }, [
    isGuest,
    guestName,
    guestPhone,
    guestAddress,
    guestAddressNotes,
    updateAppState,
  ]);

  useEffect(() => {
    if (!isGuest || !guestCheckoutEnabled) return;
    if (!guestItems.length) {
      setGuestQuote(null);
      setGuestQuoteError(null);
      return;
    }
    const addressValue = debouncedGuestAddress.trim();
    if (!addressValue) {
      setGuestQuote(null);
      setGuestQuoteError(null);
      return;
    }
    if (isOffline) return;

    const requestId = guestQuoteRef.current + 1;
    guestQuoteRef.current = requestId;
    setGuestQuoteLoading(true);
    setGuestQuoteError(null);
    const addressPayload: { fullAddress: string } = {
      fullAddress: addressValue,
    };

    quoteGuestOrder({
      items: guestItems,
      address: addressPayload,
      deliveryWindowId: deliveryMode === "SCHEDULED" && selectedSlot ? selectedSlot.windowId : undefined,
      scheduledAt: deliveryMode === "SCHEDULED" && selectedSlot ? selectedSlot.scheduledAt : undefined,
    })
      .then((quote) => {
        if (guestQuoteRef.current !== requestId) return;
        setGuestQuote(quote);
      })
      .catch((error) => {
        if (guestQuoteRef.current !== requestId) return;
        setGuestQuote(null);
        setGuestQuoteError(mapApiErrorToMessage(error, "checkout.messages.quoteError"));
      })
      .finally(() => {
        if (guestQuoteRef.current === requestId) {
          setGuestQuoteLoading(false);
        }
      });
  }, [
    isGuest,
    guestCheckoutEnabled,
    guestItems,
    debouncedGuestAddress,
    isOffline,
    deliveryMode,
    selectedSlot?.scheduledAt,
    selectedSlot?.windowId,
  ]);

  const selectedAddress = useMemo(() => {
    if (isGuest) return null;
    return addresses.find((addr: Address) => addr.id === selectedAddressId) || null;
  }, [addresses, selectedAddressId, isGuest]);
  const showAddressWarning = isGuest
    ? !guestAddressValid
    : Boolean(appState.user && (!selectedAddress || !selectedAddress.zoneId));
  const guestReady =
    guestCheckoutEnabled &&
    Boolean(guestName.trim()) &&
    guestPhoneValid &&
    guestAddressValid;
  const paymentReady =
    isGuest || selectedPaymentType === "COD" || Boolean(selectedPaymentMethodId);
  const canPlaceOrder =
    previewItems.length > 0 &&
    !isOffline &&
    deliveryTermsAccepted &&
    (!hasWeightBasedItems || weightNoticeAccepted) &&
    (isGuest ? guestReady : Boolean(selectedAddressId && cartId && paymentReady));

  const isOrderGroupSummary = (value: any): value is OrderGroupSummary =>
    Boolean(value && typeof value === "object" && Array.isArray(value.orders) && value.orderGroupId);

  function ensureIdempotencyKey() {
    if (idempotencyKeyRef.current) return idempotencyKeyRef.current;
    const key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    idempotencyKeyRef.current = key;
    return key;
  }

  async function handleGuestOrder() {
    if (!deliveryTermsAccepted) {
      showToast({ type: "error", message: t("checkout.deliveryTerms.required", "Please accept the delivery terms.") });
      return;
    }
    if (hasWeightBasedItems && !weightNoticeAccepted) {
      showToast({ type: "error", message: t("checkout.weightNotice.required", "Please accept the weight-based pricing notice.") });
      return;
    }
    if (cart.cartScopeMixed) {
      showToast({ type: "error", message: t("checkout.messages.cartScopeMixed") });
      return;
    }
    if (!guestCheckoutEnabled) {
      showToast({ type: "error", message: t("checkout.guest.disabled", "Guest checkout is disabled.") });
      return;
    }
    if (!guestItems.length) {
      showToast({ type: "error", message: t("checkout.messages.emptyCart", "Your cart is empty.") });
      return;
    }
    const name = guestName.trim();
    const phone = normalizedGuestPhone;
    const fullAddress = guestAddress.trim();
    if (!name) {
      showToast({ type: "error", message: t("checkout.guest.nameRequired", "Name is required.") });
      return;
    }
    if (!phone) {
      showToast({ type: "error", message: t("checkout.guest.phoneInvalid", "Enter a valid phone number.") });
      return;
    }
    if (!fullAddress) {
      showToast({ type: "error", message: t("checkout.guest.addressRequired", "Enter full address to continue.") });
      return;
    }
    if (deliveryMode === "SCHEDULED" && !selectedSlot) {
      showToast({ type: "error", message: t("checkout.deliveryWindow.required", "Select a delivery time slot.") });
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
      const addressPayload: { fullAddress: string; notes?: string } = {
        fullAddress,
        notes: guestAddressNotes.trim() || undefined,
      };

      const res = await placeGuestOrder({
        name,
        phone,
        deliveryTermsAccepted,
        note: note ? note : undefined,
        idempotencyKey,
        items: guestItems,
        address: addressPayload,
        deliveryWindowId: deliveryMode === "SCHEDULED" && selectedSlot ? selectedSlot.windowId : undefined,
        scheduledAt: deliveryMode === "SCHEDULED" && selectedSlot ? selectedSlot.scheduledAt : undefined,
      });
      cart.clearLocal();
      const isGroup = isOrderGroupSummary(res);
      const detailOrder = !isGroup ? (res as OrderDetail) : null;
      const trackingCode = isGroup
        ? (res as OrderGroupSummary).code ?? (res as OrderGroupSummary).orderGroupId
        : detailOrder?.code ?? detailOrder?.id ?? null;
      idempotencyKeyRef.current = null;
      updateAppState((prev) => ({
        ...prev,
        cart: [],
        lastOrder: res,
        lastOrderId: detailOrder ? detailOrder.id : (res as OrderGroupSummary).orderGroupId ?? null,
        selectedOrder: res,
        selectedOrderId: detailOrder ? detailOrder.id : null,
        selectedOrderSummary: detailOrder
          ? {
              id: detailOrder.id,
              totalCents: detailOrder.totalCents,
              status: detailOrder.status,
              createdAt: detailOrder.createdAt,
            }
          : null,
        guestTracking: { phone, code: trackingCode ?? undefined },
        currentScreen: "order-success",
      }));
      trackOrderPlaced(trackingCode ?? "guest-order", res.totalCents);
    } catch (error: any) {
      const friendly = apiErrorToast(error, "checkout.messages.submitError");
      trackOrderFailed(friendly);
      idempotencyKeyRef.current = null;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handlePlaceOrder() {
    if (savingRef.current) return;
    if (!deliveryTermsAccepted) {
      showToast({ type: "error", message: t("checkout.deliveryTerms.required", "Please accept the delivery terms.") });
      return;
    }
    if (hasWeightBasedItems && !weightNoticeAccepted) {
      showToast({ type: "error", message: t("checkout.weightNotice.required", "Please accept the weight-based pricing notice.") });
      return;
    }
    if (cart.cartScopeMixed) {
      showToast({ type: "error", message: t("checkout.messages.cartScopeMixed") });
      return;
    }
    if (isGuest) {
      await handleGuestOrder();
      return;
    }
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
    if (deliveryMode === "SCHEDULED" && !selectedSlot) {
      showToast({ type: "error", message: t("checkout.deliveryWindow.required", "Select a delivery time slot.") });
      return;
    }
    if (isOffline) {
      showToast({ type: "error", message: t("checkout.messages.offline", "You are offline. Please reconnect.") });
      return;
    }
    if (selectedPaymentType !== "COD" && !selectedPaymentMethodId) {
      showToast({ type: "error", message: t("checkout.payment.methodRequired", "Select a saved payment method.") });
      return;
    }
    const idempotencyKey = ensureIdempotencyKey();
    savingRef.current = true;
    setSaving(true);
    try {
      const note = deliveryNotes.trim();
      const res = await placeOrder({
        addressId: selectedAddressId,
        paymentMethod: selectedPaymentType,
        paymentMethodId: selectedPaymentMethodId || undefined,
        deliveryTermsAccepted,
        note: note ? note : undefined,
        couponCode: appliedCoupon || undefined,
        loyaltyPointsToRedeem: loyaltyEnabled && loyaltyToRedeem > 0 ? loyaltyToRedeem : undefined,
        idempotencyKey,
        deliveryWindowId: deliveryMode === "SCHEDULED" && selectedSlot ? selectedSlot.windowId : undefined,
        scheduledAt: deliveryMode === "SCHEDULED" && selectedSlot ? selectedSlot.scheduledAt : undefined,
      });
      await cart.refetch();
      const isGroup = isOrderGroupSummary(res);
      let orderId = "";
      let detailOrder: OrderDetail | null = null;
      if (isGroup) {
        orderId = res.orderGroupId;
      } else {
        orderId = res.id;
        detailOrder = res as OrderDetail;
      }
      const redeemedPoints = isGroup
        ? 0
        : detailOrder?.loyaltyPointsRedeemed ?? (loyaltyEnabled ? loyaltyToRedeem : 0);
      const earnedPoints = isGroup ? 0 : detailOrder?.loyaltyPointsEarned ?? 0;
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
        lastOrderId: detailOrder ? detailOrder.id : null,
        selectedOrder: res,
        selectedOrderId: detailOrder ? detailOrder.id : null,
        selectedOrderSummary: detailOrder
          ? {
              id: detailOrder.id,
              totalCents: detailOrder.totalCents,
              status: detailOrder.status,
              createdAt: detailOrder.createdAt,
            }
          : null,
        currentScreen: "order-success",
      }));
      trackOrderPlaced(orderId, res.totalCents);
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
    if (isGuest) {
      setCouponFeedback({ type: "error", message: t("checkout.coupon.guest", "Coupons are only for registered users.") });
      return;
    }
    if (!couponsEnabled) {
      setCouponFeedback({ type: "error", message: t("checkout.coupon.disabled", "Coupons are disabled.") });
      return;
    }
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
    const zoneName = address.deliveryZone
      ? (lang === "ar" ? address.deliveryZone.nameAr || address.deliveryZone.nameEn : address.deliveryZone.nameEn || address.deliveryZone.nameAr)
      : address.zone;
    const line1 = [address.city, zoneName].filter(Boolean).join(", ");
    const line2 = [address.street, address.building, address.apartment].filter(Boolean).join(", ");
    const isSelected = selectedAddressId === address.id;
    const feeLabel = isSelected
      ? deliveryFeeLabel
      : address.deliveryZone
        ? fmtEGP(fromCents(address.deliveryZone.feeCents))
        : null;
    const zoneEta = address.deliveryZone?.etaMinutes
      ? t("addresses.zoneEta", { value: address.deliveryZone.etaMinutes })
      : null;
    const zoneSummary = [feeLabel, zoneEta].filter(Boolean).join(" - ") || null;

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

  const walletLabel = (provider?: string | null) => {
    if (!provider) return t("checkout.payment.wallet", "Wallet");
    const key = String(provider).toUpperCase();
    if (key === "VODAFONE_CASH") return t("checkout.payment.walletProviders.vodafone", "Vodafone Cash");
    if (key === "ORANGE_MONEY") return t("checkout.payment.walletProviders.orange", "Orange Money");
    if (key === "ETISALAT_CASH") return t("checkout.payment.walletProviders.etisalat", "Etisalat Cash");
    return provider;
  };

  const formatPaymentMethod = (method: SavedPaymentMethod) => {
    if (method.type === "WALLET") {
      return [walletLabel(method.walletProvider), method.walletPhone].filter(Boolean).join(" - ");
    }
    const brand = method.brand ? method.brand : t("checkout.payment.card", "Card");
    const last4 = method.last4 ? `**** ${method.last4}` : "";
    const expiry =
      method.expMonth && method.expYear ? `exp ${String(method.expMonth).padStart(2, "0")}/${method.expYear}` : "";
    return [brand, last4, expiry].filter(Boolean).join(" ");
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
          const optionLines =
            item.options?.map((opt) => {
              const optionName = lang === "ar" ? opt.nameAr || opt.name : opt.name || opt.nameAr;
              const groupName = lang === "ar" ? opt.groupNameAr || opt.groupName : opt.groupName || opt.groupNameAr;
              const safeOption = optionName || "";
              const safeGroup = groupName || "";
              const name = safeGroup ? `${safeGroup}: ${safeOption}` : safeOption;
              const qtyLabel = opt.qty > 1 ? ` x${opt.qty}` : "";
              return { id: opt.optionId, label: `${name}${qtyLabel}`.trim() };
            }) ?? [];
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
                {optionLines.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    {optionLines.map((line) => (
                      <div key={line.id}>- {line.label}</div>
                    ))}
                  </div>
                )}
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
        {!isGuest && (
          <Button size="sm" variant="outline" onClick={() => updateAppState({ currentScreen: "addresses" })} className="rounded-xl">
            <Plus className="w-4 h-4 mr-1" />
            {t("checkout.address.add")}
          </Button>
        )}
      </div>

      <div className="section-card glass-surface space-y-2">
        <p className="text-xs text-gray-500">
          {isGuest
            ? t("checkout.stepsLabelGuest", "Cart > Details > Confirm")
            : t("checkout.stepsLabel", "Cart > Address > Summary > Confirm")}
        </p>
        <div className="flex items-center gap-3 text-sm font-semibold text-gray-900">
          {checkoutSteps.map((label, idx) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${idx <= 2 ? "bg-primary" : "bg-gray-300"}`}>
                {idx + 1}
              </div>
              <span className="text-xs sm:text-sm">{label}</span>
              {idx < checkoutSteps.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      <div className="section-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t("checkout.deliveryEstimate.label", "Estimated delivery fee")}</p>
            <p className="text-sm font-semibold text-gray-900">{deliveryFeeEstimate}</p>
          </div>
        </div>
        {!isGuest && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => updateAppState({ currentScreen: "addresses" })}
          >
            {t("checkout.deliveryEstimate.change", "Change address")}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-24 w-full">
        <section className="section-card space-y-3">
          <h2 className="font-semibold text-gray-900 mb-3">{t("checkout.sections.items")}</h2>
          {renderItems()}
        </section>

        {!isGuest ? (
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
        ) : (
          <>
            <section className="section-card space-y-3">
              <h2 className="font-semibold text-gray-900 mb-3">
                {t("checkout.guest.detailsTitle", "Guest details")}
              </h2>
              {!guestCheckoutEnabled && (
                <div className="bg-amber-50 text-amber-900 text-sm rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t("checkout.guest.disabled", "Guest checkout is disabled. Please sign in to continue.")}
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <Label>{t("checkout.guest.nameLabel", "Full name")}</Label>
                  <Input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={t("checkout.guest.namePlaceholder", "Enter your name")}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t("checkout.guest.phoneLabel", "Phone number")}</Label>
                  <Input
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(sanitizeEgyptPhoneInput(e.target.value))}
                    placeholder={t("checkout.guest.phonePlaceholder", "Enter your phone")}
                    className="mt-1"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {t("checkout.guest.phoneHint", "We will use your phone to send order updates and tracking.")}
                </p>
                {guestPhone && !guestPhoneValid && (
                  <p className="text-xs text-red-600">{t("checkout.guest.phoneInvalid", "Enter a valid phone number.")}</p>
                )}
              </div>
            </section>
            <section className="section-card space-y-3">
              <h2 className="font-semibold text-gray-900 mb-3">
                {t("checkout.guest.addressTitle", "Delivery address")}
              </h2>
              <div className="space-y-3">
                <div>
                  <Label>{t("checkout.guest.fullAddress", "Full address")}</Label>
                  <Textarea
                    placeholder={t("checkout.guest.addressPlaceholder", "Street, building, area")}
                    value={guestAddress}
                    onChange={(e) => setGuestAddress(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <div>
                  <Label>{t("checkout.guest.notesLabel", "Landmark (optional)")}</Label>
                  <Textarea
                    placeholder={t("checkout.guest.notesPlaceholder", "Nearby landmark or delivery notes")}
                    value={guestAddressNotes}
                    onChange={(e) => setGuestAddressNotes(e.target.value)}
                    className="min-h-[70px]"
                  />
                </div>
                {guestQuoteLoading && (
                  <div className="text-xs text-gray-500">{t("checkout.guest.quoteLoading", "Calculating delivery...")}</div>
                )}
                {guestQuoteError && (
                  <div className="text-xs text-red-600 bg-red-50 rounded-xl p-2">{guestQuoteError}</div>
                )}
                {guestQuote?.skippedBranchIds && guestQuote.skippedBranchIds.length > 0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 rounded-xl p-2">
                    {t("checkout.guest.skippedBranches", "Some items are unavailable and were skipped.")}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {showScheduleSection && (
          <section className="section-card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{t("checkout.deliveryWindow.title", "Delivery time")}</h2>
              {scheduleLoading && (
                <span className="text-xs text-gray-500">
                  {t("checkout.deliveryWindow.loading", "Loading slots...")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryMode("ASAP")}
                className={`w-full text-left rounded-xl border p-3 transition ${
                  deliveryMode === "ASAP" ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold text-gray-900">{t("checkout.deliveryWindow.asap", "ASAP")}</p>
                    <p className="text-xs text-gray-500">
                      {t("checkout.deliveryWindow.asapDesc", "Deliver as soon as possible.")}
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMode("SCHEDULED")}
                disabled={scheduleDisabled || scheduleLoading}
                className={`w-full text-left rounded-xl border p-3 transition ${
                  deliveryMode === "SCHEDULED" ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                } ${scheduleDisabled || scheduleLoading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold text-gray-900">{t("checkout.deliveryWindow.schedule", "Schedule")}</p>
                    <p className="text-xs text-gray-500">
                      {t("checkout.deliveryWindow.scheduleDesc", "Pick a delivery slot.")}
                    </p>
                  </div>
                </div>
              </button>
            </div>
            {scheduleReady && availableSlots.length === 0 && (
              <div className="bg-amber-50 text-amber-900 text-xs rounded-xl p-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {t("checkout.deliveryWindow.noSlots", "No delivery slots available right now.")}
              </div>
            )}
            {deliveryMode === "SCHEDULED" && !scheduleDisabled && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  {t("checkout.deliveryWindow.select", "Select a time slot")}
                </p>
                {scheduleLoading && availableSlots.length === 0 ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <Skeleton key={idx} className="h-10 w-full skeleton-soft" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {slotsByDate.map((group) => (
                      <div key={group.dateKey} className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">{group.dateLabel}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.slots.map((slot) => {
                            const isSelected = selectedSlotId === slot.id;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => setSelectedSlotId(slot.id)}
                                className={`px-3 py-2 rounded-full border text-xs font-medium transition ${
                                  isSelected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-gray-200 bg-white text-gray-700"
                                }`}
                              >
                                {slot.timeLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="section-card space-y-3">
          <h2 className="font-semibold text-gray-900 mb-3">{t("checkout.sections.payment")}</h2>
          {isGuest ? (
            <div className="inline-card flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-gray-900">{t("checkout.payment.codOnly", "Cash on delivery")}</p>
                <p className="text-sm text-gray-600">
                  {t("checkout.payment.codOnlyDesc", "Only cash payments are supported at the moment.")}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {codEnabled && (
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentType("COD")}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      selectedPaymentType === "COD" ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold text-gray-900">{t("checkout.payment.cod", "Cash on delivery")}</p>
                        <p className="text-xs text-gray-500">{t("checkout.payment.codDesc", "Pay the courier on arrival.")}</p>
                      </div>
                    </div>
                  </button>
                )}
                {cardEnabled && (
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentType("CARD")}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      selectedPaymentType === "CARD" ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold text-gray-900">{t("checkout.payment.card", "Card")}</p>
                        <p className="text-xs text-gray-500">{t("checkout.payment.cardDesc", "Visa / Mastercard")}</p>
                      </div>
                    </div>
                  </button>
                )}
                {walletEnabled && (
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentType("WALLET")}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      selectedPaymentType === "WALLET" ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold text-gray-900">{t("checkout.payment.wallet", "Wallet")}</p>
                        <p className="text-xs text-gray-500">{t("checkout.payment.walletDesc", "Vodafone Cash and more")}</p>
                      </div>
                    </div>
                  </button>
                )}
                {!codEnabled && !cardEnabled && !walletEnabled && (
                  <div className="bg-amber-50 text-amber-900 text-sm rounded-xl p-3">
                    {t("checkout.payment.disabled", "No payment methods are enabled right now.")}
                  </div>
                )}
              </div>

              {selectedPaymentType === "CARD" && cardEnabled && (
                <div className="space-y-2">
                  {paymentMethodsQuery.isLoading && (
                    <p className="text-xs text-gray-500">{t("checkout.payment.loading", "Loading payment methods...")}</p>
                  )}
                  {!paymentMethodsQuery.isLoading && cardMethods.length === 0 && (
                    <div className="bg-amber-50 text-amber-900 text-sm rounded-xl p-3">
                      {t("checkout.payment.noCards", "No saved cards yet. Add a card to continue.")}
                    </div>
                  )}
                  {cardMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethodId(method.id)}
                      className={`w-full text-left rounded-xl border p-3 transition ${
                        selectedPaymentMethodId === method.id ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-900">{formatPaymentMethod(method)}</span>
                        {method.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            {t("checkout.payment.default", "Default")}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => updateAppState({ currentScreen: "payment-methods" })}
                  >
                    {t("checkout.payment.addCard", "Add card")}
                  </Button>
                </div>
              )}

              {selectedPaymentType === "WALLET" && walletEnabled && (
                <div className="space-y-2">
                  {paymentMethodsQuery.isLoading && (
                    <p className="text-xs text-gray-500">{t("checkout.payment.loading", "Loading payment methods...")}</p>
                  )}
                  {!paymentMethodsQuery.isLoading && walletMethods.length === 0 && (
                    <div className="bg-amber-50 text-amber-900 text-sm rounded-xl p-3">
                      {t("checkout.payment.noWallets", "No saved wallets yet. Add one to continue.")}
                    </div>
                  )}
                  {walletMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethodId(method.id)}
                      className={`w-full text-left rounded-xl border p-3 transition ${
                        selectedPaymentMethodId === method.id ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-900">{formatPaymentMethod(method)}</span>
                        {method.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            {t("checkout.payment.default", "Default")}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                  <div className="text-xs text-gray-500">
                    {enabledWalletProviders.map((provider) => provider.label).join(", ")}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => updateAppState({ currentScreen: "payment-methods" })}
                  >
                    {t("checkout.payment.addWallet", "Add wallet")}
                  </Button>
                </div>
              )}
            </>
          )}
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

        {!isGuest && couponsEnabled && (
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
        )}

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
              <span>
                {isGuest
                  ? t("checkout.guest.addressRequired", "Enter full address to continue.")
                  : !selectedAddress
                    ? t("checkout.messages.missingAddress")
                    : t("checkout.messages.missingZone")}
              </span>
            </div>
          )}
          {isGuest && (
            <div className="bg-gray-50 text-gray-700 text-xs rounded-xl p-2">
              {t("checkout.guest.noRewards", "Guest orders do not use coupons or loyalty rewards.")}
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
            <span className="price-text">
              {shippingDisplayedCents > 0 ? fmtEGP(shippingDisplayed) : t("checkout.summary.freeDelivery", "Free")}
            </span>
          </div>
          {cartGroups.length > 0 && (
            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 space-y-2">
              <p className="font-semibold text-gray-900">
                {t("checkout.summary.byBranch", "Delivery by branch")}
              </p>
              {cartGroups.map((group) => {
                const branchName =
                  i18n.language?.startsWith("ar")
                    ? group.branchNameAr || group.branchName || group.branchId
                    : group.branchName || group.branchNameAr || group.branchId;
                const feeLabel = group.deliveryUnavailable
                  ? t("checkout.summary.deliveryUnavailable", "Unavailable")
                  : fmtEGP(fromCents(group.shippingFeeCents ?? 0));
                return (
                  <div key={group.branchId} className="flex items-center justify-between">
                    <span className="text-gray-700">{branchName}</span>
                    <span className="font-medium text-gray-900">{feeLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {t("checkout.summary.eta")}
            </span>
            <span>
              {isGuest
                ? guestAddressValid
                  ? etaLabel
                  : t("checkout.summary.etaUnknown")
                : selectedAddress
                  ? etaLabel
                  : t("checkout.summary.etaUnknown")}
            </span>
          </div>
          {deliveryMode === "SCHEDULED" && selectedSlot && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {t("checkout.deliveryWindow.selectedLabel", "Scheduled")}
              </span>
              <span>{selectedSlot.dateLabel} {selectedSlot.timeLabel}</span>
            </div>
          )}
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
          {hasWeightBasedItems && (
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={weightNoticeAccepted}
                onChange={(e) => setWeightNoticeAccepted(e.target.checked)}
              />
              <span>
                {t(
                  "checkout.weightNotice.text",
                  "Some items are sold by weight. The final total may go up or down after weighing."
                )}
              </span>
            </label>
          )}
          <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={deliveryTermsAccepted}
              onChange={(e) => setDeliveryTermsAccepted(e.target.checked)}
            />
            <span>
              {t(
                "checkout.deliveryTerms.text",
                "For the safety of our delivery captain and vehicle, delivery is at the building entrance by default. If a safe place is available, the captain can go up to the apartment door when possible."
              )}
            </span>
          </label>
          <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">{t("checkout.trust.title", "We deliver anywhere inside Badr City")}</p>
            <p className="text-xs text-gray-600">
              {t("checkout.trust.support", "Support available on WhatsApp for updates.")}
            </p>
          </div>
          <Button
            className="w-full h-12 rounded-xl"
            onClick={handlePlaceOrder}
            disabled={saving || !canPlaceOrder}
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







