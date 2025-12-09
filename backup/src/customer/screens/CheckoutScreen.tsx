import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import { Badge } from "../../ui/badge";
import { ArrowLeft, MapPin, Plus, Clock, Truck, CreditCard, DollarSign } from "lucide-react";
import { AppState } from "../CustomerApp";
import { ImageWithFallback } from "../../figma/ImageWithFallback";

/** خدمات الـ API (عدّل المسارات حسب مشروعك) */
import { getCart } from "../../services/cart";
import { listAddresses } from "../../services/addresses";
import { placeOrder } from "../../services/orders";
import { fmtEGP, fromCents } from "../../lib/money";

interface CheckoutScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

type Address = {
  id: string;
  label: string;
  city?: string;
  zone?: string;
  street?: string;
  building?: string | null;
  apartment?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export function CheckoutScreen({ appState, updateAppState }: CheckoutScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [serverCart, setServerCart] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card">("cod");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // تحميل العناوين والسلة
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [addr, cart] = await Promise.all([listAddresses(), getCart()]);
        setAddresses(addr || []);
        setServerCart(cart || null);

        // اختيار عنوان افتراضي (أول عنوان)
        if ((addr || []).length > 0) setSelectedAddressId(addr[0].id);

        // حافظ على مزامنة عدّاد السلة في حالة تغيّرها من السيرفر
        if (cart?.items) {
          updateAppState({
            cart: (cart.items || []).map((it: any) => ({
              id: it.id,
              productId: it.productId,
              name: it.product?.name ?? "",
              image: it.product?.imageUrl ?? undefined,
              price: fromCents(it.priceCents),
              quantity: it.qty,
              category: it.product?.category?.name,
            })),
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = serverCart?.items ?? [];
  const subtotal = fromCents(serverCart?.subtotalCents ?? 0);
  const cartId = serverCart?.cartId as string | undefined;

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) || null,
    [addresses, selectedAddressId]
  );

  async function handlePlaceOrder() {
    if (!cartId || !selectedAddressId) {
      // TODO: Toast تحذير
      return;
    }
    setSaving(true);
    try {
      const res = await placeOrder({
        cartId,
        addressId: selectedAddressId,
        paymentMethod: paymentMethod === "cod" ? "COD" : "CARD",
        notes: deliveryNotes || undefined,
      });

      // نجاح: فضّي السلة محليًا وروّح لنجاح الطلب
      updateAppState({
        cart: [],
        lastOrderId: res.id,
        currentScreen: "order-success",
      });
    } catch (e) {
      console.error(e);
      // TODO: Toast خطأ
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>جارِ التحميل…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAppState({ currentScreen: "cart" })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            Checkout
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Order Items Preview */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            Order Items ({items.length})
          </h2>
          {items.length === 0 ? (
            <div className="text-sm text-gray-500">سلتك فاضية.</div>
          ) : (
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {items.map((it: any) => (
                <div key={it.id} className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white">
                    {it.product?.imageUrl ? (
                      <ImageWithFallback
                        src={it.product.imageUrl}
                        alt={it.product?.name ?? "product"}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                      {it.product?.name}
                    </h3>
                    <p className="text-xs text-gray-500">Qty: {it.qty}</p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {fmtEGP(fromCents(it.priceCents) * it.qty)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivery Address */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins text-lg" style={{ fontWeight: 600 }}>
              Delivery Address
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary p-0"
              onClick={() => updateAppState({ currentScreen: "addresses" })}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add New
            </Button>
          </div>

          {addresses.length === 0 ? (
            <div className="text-sm text-gray-500">
              لا توجد عناوين بعد. أضف عنوانًا أولًا من شاشة العناوين.
            </div>
          ) : (
            <RadioGroup
              value={selectedAddressId ?? ""}
              onValueChange={(v) => setSelectedAddressId(v)}
            >
              {addresses.map((address) => {
                const line1 =
                  address.street ||
                  [address.city, address.zone].filter(Boolean).join(", ") ||
                  address.label;
                const line2 = [address.building, address.apartment].filter(Boolean).join(", ");
                return (
                  <div
                    key={address.id}
                    className={`p-3 border rounded-lg transition-colors ${
                      selectedAddressId === address.id ? "border-primary bg-accent" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                          <Label htmlFor={address.id} className="font-medium">
                            {address.label || "Address"}
                          </Label>
                          {address.id === selectedAddressId && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{line1}</p>
                        {line2 && <p className="text-sm text-gray-500">{line2}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          )}
        </div>

        {/* Delivery Info (UI فقط توضيحي) */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            Delivery
          </h2>
          <div className="flex items-center space-x-3 text-gray-600">
            <Truck className="w-5 h-5" />
            <span className="text-sm">
              رسوم الشحن تُحسب تلقائيًا عند إنشاء الطلب بناءً على إعدادات السيرفر.
            </span>
          </div>
          <div className="flex items-center mt-2 text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span className="text-sm">التسليم خلال 30–45 دقيقة (تقديري)</span>
          </div>
        </div>

        {/* Delivery Notes */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            Delivery Notes
          </h2>
          <Textarea
            placeholder="Any special instructions for delivery..."
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            className="min-h-20 rounded-lg"
          />
        </div>

        {/* Payment Method */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            Payment Method
          </h2>
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
            {[
              { id: "cod", label: "Cash on Delivery", icon: DollarSign, desc: "Pay on delivery" },
              { id: "card", label: "Card", icon: CreditCard, desc: "Visa/MasterCard" },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  className={`p-3 border rounded-lg transition-colors ${
                    paymentMethod === m.id ? "border-primary bg-accent" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={m.id} id={m.id} />
                    <Icon className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                      <Label htmlFor={m.id} className="font-medium">
                        {m.label}
                      </Label>
                      <p className="text-sm text-gray-500">{m.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Order Summary */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            Order Summary
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({items.length} items)</span>
              <span>{fmtEGP(subtotal)}</span>
            </div>
            <div className="text-xs text-gray-500">
              Shipping & discounts are calculated at checkout.
            </div>
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <Button
          onClick={handlePlaceOrder}
          className="w-full h-12 rounded-xl"
          disabled={saving || !selectedAddress || items.length === 0}
        >
          {saving ? "Placing…" : `Place Order • ${fmtEGP(subtotal)}`}
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          عنوان التوصيل: {selectedAddress ? selectedAddress.label : "اختر عنوانًا"}
        </p>
      </div>
    </div>
  );
}
