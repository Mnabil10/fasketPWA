import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { useNetworkStatus } from "../hooks";
import { getDeliveryZones } from "../../services/settings";
import { listProducts } from "../../services/catalog";
import { NetworkBanner, SkeletonList, EmptyState } from "../components";
import { openWhatsapp } from "../../lib/fasketLinks";
import { fmtEGP, fromCents } from "../../lib/money";
import { resolveSupportConfig } from "../utils/mobileAppConfig";

export function HelpScreen({ appState, updateAppState }: { appState: AppState; updateAppState: UpdateAppState }) {
  const { t, i18n } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const supportConfig = resolveSupportConfig(appState.settings?.mobileApp ?? null, lang);
  const [zones, setZones] = useState<any[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

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
