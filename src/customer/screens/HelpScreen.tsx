import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { useNetworkStatus } from "../hooks";
import { requestGuestTrackingOtp, trackGuestOrders, verifyGuestTrackingOtp } from "../../services/orders";
import { getDeliveryZones } from "../../services/settings";
import { listProducts } from "../../services/catalog";
import { NetworkBanner, SkeletonList, EmptyState, OrderProgress } from "../components";
import { openWhatsapp } from "../../lib/fasketLinks";
import { fmtEGP, fromCents } from "../../lib/money";
import type { OrderGroupSummary } from "../../types/api";
import { resolveSupportConfig } from "../utils/mobileAppConfig";
import { isValidEgyptPhone, normalizeEgyptPhone, sanitizeEgyptPhoneInput } from "../../utils/phone";

export function HelpScreen({ appState, updateAppState }: { appState: AppState; updateAppState: UpdateAppState }) {
  const { t, i18n } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const supportConfig = resolveSupportConfig(appState.settings?.mobileApp ?? null, lang);
  const [guestPhone, setGuestPhone] = useState(appState.guestTracking?.phone ?? "");
  const [guestCode, setGuestCode] = useState(appState.guestTracking?.code ?? "");
  const [guestResult, setGuestResult] = useState<OrderGroupSummary | null>(null);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestNotice, setGuestNotice] = useState<string | null>(null);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const normalizedGuestPhone = useMemo(() => normalizeEgyptPhone(guestPhone), [guestPhone]);
  const isGuestPhoneValid = useMemo(() => isValidEgyptPhone(guestPhone), [guestPhone]);

  const fetchGuestOrder = async () => {
    setGuestError(null);
    setGuestNotice(null);
    setGuestResult(null);
    const phone = normalizedGuestPhone;
    if (!phone) {
      setGuestError(t("help.phoneRequired", "Phone number is required."));
      return;
    }
    if (!isGuestPhoneValid) {
      setGuestError(t("validation.phone", "Enter a valid phone number."));
      return;
    }
    try {
      const result = await trackGuestOrders({ phone, code: guestCode.trim() || undefined });
      updateAppState({ guestTracking: { phone, code: guestCode.trim() || undefined } });
      setGuestResult(result);
    } catch (error) {
      setGuestError(t("help.order_not_found", "Order not found. Try WhatsApp support."));
    }
  };

  const requestOtp = async () => {
    setGuestError(null);
    setGuestNotice(null);
    setGuestResult(null);
    if (!normalizedGuestPhone || !isGuestPhoneValid) {
      setGuestError(t("validation.phone", "Enter a valid phone number."));
      return;
    }
    try {
      setOtpSending(true);
      const response = await requestGuestTrackingOtp(normalizedGuestPhone);
      setOtpId(response.otpId ?? null);
      setGuestNotice(t("help.otp_sent", "OTP sent. Check your phone."));
      setOtpValue("");
    } catch (error) {
      setGuestError(t("help.otp_failed", "Unable to send OTP right now."));
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    setGuestError(null);
    setGuestNotice(null);
    setGuestResult(null);
    if (!normalizedGuestPhone || !isGuestPhoneValid) {
      setGuestError(t("validation.phone", "Enter a valid phone number."));
      return;
    }
    if (!otpValue.trim() || otpValue.trim().length < 4) {
      setGuestError(t("help.otp_required", "Enter the OTP code."));
      return;
    }
    try {
      setOtpVerifying(true);
      const result = await verifyGuestTrackingOtp({
        phone: normalizedGuestPhone,
        otp: otpValue.trim(),
        otpId: otpId || undefined,
        code: guestCode.trim() || undefined,
      });
      updateAppState({ guestTracking: { phone: normalizedGuestPhone, code: guestCode.trim() || undefined } });
      setGuestResult(result);
      setGuestNotice(t("help.otp_verified", "OTP verified."));
    } catch (error) {
      setGuestError(t("help.otp_invalid", "Invalid or expired OTP."));
    } finally {
      setOtpVerifying(false);
    }
  };

  const fetchZones = async () => {
    setZoneError(null);
    try {
      const res = await getDeliveryZones();
      setZones(res.data || []);
      setZonesLoaded(true);
    } catch (error) {
      setZoneError(t("help.zones_error", "Unable to load delivery areas"));
    }
  };

  const searchProducts = async () => {
    if (!productQuery.trim()) return;
    setProductsLoading(true);
    setProductsError(null);
    try {
      const res = await listProducts({ q: productQuery.trim(), pageSize: 5 });
      setProducts(res.data || []);
    } catch (error) {
      setProductsError(t("help.products_error", "Unable to search products"));
    } finally {
      setProductsLoading(false);
    }
  };

  const whatsappFallback = (intent: string) => {
    openWhatsapp(t("help.whatsapp_prefill", "Hi, I need help with {{intent}}", { intent }), supportConfig.whatsappNumber);
  };

  return (
    <div className="page-shell">
      <NetworkBanner />
      <div className="section-card space-y-4">
        <div>
          <h1 className="font-poppins text-xl font-semibold">{t("help.title", "Help & self-service")}</h1>
          <p className="text-sm text-gray-600">{t("help.subtitle", "Track orders, delivery areas, and prices without waiting.")}</p>
        </div>

        <div className="section-card space-y-3">
          <h2 className="text-sm font-semibold">{t("help.track_order", "Track order by phone")}</h2>
          <Input
            placeholder={t("help.phone_placeholder", "Enter phone number")}
            value={guestPhone}
            onChange={(e) => setGuestPhone(sanitizeEgyptPhoneInput(e.target.value))}
            inputMode="tel"
          />
          <Input
            placeholder={t("help.order_placeholder", "Order code (optional)")}
            value={guestCode}
            onChange={(e) => setGuestCode(e.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={fetchGuestOrder} disabled={isOffline}>
              {t("help.track", "Track")}
            </Button>
            <Button variant="outline" onClick={requestOtp} disabled={isOffline || otpSending}>
              {otpSending ? t("help.otp_sending", "Sending...") : t("help.otp_send", "Send OTP")}
            </Button>
          </div>
          {otpId && (
            <div className="space-y-2">
              <Input
                placeholder={t("help.otp_placeholder", "Enter OTP code")}
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
              />
              <Button onClick={verifyOtp} disabled={isOffline || otpVerifying}>
                {otpVerifying ? t("help.otp_verifying", "Verifying...") : t("help.otp_verify", "Verify OTP")}
              </Button>
            </div>
          )}
          {guestNotice && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3">{guestNotice}</div>}
          {guestError && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{guestError}</div>}
          {guestResult && (
            <div className="text-sm space-y-2">
              <OrderProgress status={guestResult.status} />
              <div>
                <p className="font-medium">#{guestResult.code || guestResult.orderGroupId}</p>
                <p>{t("orders.status", "Status")}: {guestResult.status}</p>
                <p>{t("orders.amount", "Amount")}: {fmtEGP(fromCents(guestResult.totalCents || 0))}</p>
              </div>
              {guestResult.orders?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">{t("help.groupOrders", "Orders in this group")}</p>
                  {guestResult.orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between text-xs">
                      <span>#{order.code || order.id}</span>
                      <span>{fmtEGP(fromCents(order.totalCents || 0))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!guestResult && guestError && (
            <Button variant="outline" onClick={() => whatsappFallback("order tracking")}>{t("help.whatsapp", "Contact WhatsApp")}</Button>
          )}
          {appState.user && (
            <p className="text-xs text-gray-500">
              {t("help.loggedInHint", "Signed in? You can view your orders from the Orders tab.")}
            </p>
          )}
        </div>

        <div className="section-card space-y-3">
          <h2 className="text-sm font-semibold">{t("help.delivery_areas", "Delivery areas")}</h2>
          <Button variant="outline" onClick={fetchZones} disabled={zonesLoaded || isOffline}>
            {zonesLoaded ? t("help.loaded", "Loaded") : t("help.load_areas", "Load areas")}
          </Button>
          {zoneError && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{zoneError}</div>}
          {zonesLoaded && !zoneError && zones.length === 0 && <EmptyState title={t("help.no_zones", "No areas available")} />}
          {zones.length > 0 && (
            <ul className="space-y-1 text-sm">
              {zones.map((z) => (
                <li key={z.id} className="flex items-center justify-between border-b pb-1">
                  <span>{z.nameEn || z.name || z.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {z.feeCents ? fmtEGP(fromCents(z.feeCents)) : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="section-card space-y-3">
          <h2 className="text-sm font-semibold">{t("help.product_lookup", "Product price lookup")}</h2>
          <Input
            placeholder={t("help.product_placeholder", "Enter product name")}
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
          />
          <Button variant="outline" onClick={searchProducts} disabled={isOffline || !productQuery.trim()}>
            {t("help.search", "Search")}
          </Button>
          {productsLoading && <SkeletonList lines={2} />}
          {productsError && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{productsError}</div>}
          {!productsLoading && !productsError && products.length === 0 && productQuery.trim().length > 0 && (
            <EmptyState title={t("help.no_products", "No products found")} />
          )}
          {products.length > 0 && (
            <ul className="space-y-2 text-sm">
              {products.map((p) => (
                <li key={p.id} className="border-b pb-2">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-muted-foreground">{fmtEGP(fromCents(p.salePriceCents ?? p.priceCents ?? 0))}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-center">
          <Button variant="outline" className="w-full" onClick={() => whatsappFallback("support")}>
            {t("help.whatsapp", "Contact WhatsApp")}
          </Button>
        </div>
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}
