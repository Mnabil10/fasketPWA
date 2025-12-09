import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { ArrowLeft } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState } from "../CustomerApp";
import { Separator } from "../../ui/separator";
import { Badge } from "../../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import dayjs from "dayjs";

/** خدمات الـ API */
import { listMyOrders, getOrderById } from "../../services/orders";
import { fmtEGP, fromCents } from "../../lib/money";

interface OrdersScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

type OrderListItem = {
  id: string;
  totalCents: number;
  status: string;
  createdAt: string;
};

type OrderDetail = {
  id: string;
  status: string;
  paymentMethod: "COD" | "CARD";
  subtotalCents: number;
  shippingFeeCents: number;
  discountCents: number;
  totalCents: number;
  createdAt: string;
  address?: {
    id: string;
    label?: string;
    city?: string;
    zone?: string;
    street?: string;
  };
  items: Array<{
    id: string;
    productId: string;
    productNameSnapshot: string;
    priceSnapshotCents: number;
    qty: number;
  }>;
};

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    PENDING: { variant: "secondary", label: "Pending" },
    CONFIRMED: { variant: "default", label: "Confirmed" },
    PROCESSING: { variant: "default", label: "Processing" },
    SHIPPED: { variant: "default", label: "Shipped" },
    DELIVERED: { variant: "default", label: "Delivered" },
    CANCELED: { variant: "destructive", label: "Canceled" },
    FAILED: { variant: "destructive", label: "Failed" },
  };
  const picked = map[s] || { variant: "outline", label: s };
  return <Badge variant={picked.variant}>{picked.label}</Badge>;
}

export function OrdersScreen({ appState, updateAppState }: OrdersScreenProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await listMyOrders(); // GET /orders
      setItems(res || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openDetail(id: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const d = await getOrderById(id); // GET /orders/:id
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  }

  const titleHint = useMemo(() => {
    if (loading) return "Loading orders…";
    if (items.length === 0) return "No orders yet";
    return `${items.length} order${items.length > 1 ? "s" : ""}`;
  }, [loading, items.length]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAppState({ currentScreen: "home" })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              My Orders
            </h1>
            <p className="text-xs text-gray-500">{titleHint}</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-5 w-16 bg-gray-200 rounded" />
                </div>
                <div className="mt-2 h-3 w-32 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-600">
            لا توجد طلبات بعد. ابدأ التسوق الآن!
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((o) => (
              <button
                key={o.id}
                onClick={() => openDetail(o.id)}
                className="w-full text-left bg-white rounded-xl p-4 shadow-sm hover:bg-gray-50 transition"
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium text-gray-900">#{o.id}</div>
                  <StatusPill status={o.status} />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {dayjs(o.createdAt).format("DD MMM YYYY • HH:mm")}
                </div>
                <div className="mt-2 font-poppins text-primary" style={{ fontWeight: 600 }}>
                  {fmtEGP(fromCents(o.totalCents))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="space-y-3">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-24 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">#{detail.id}</div>
                <StatusPill status={detail.status} />
              </div>
              <div className="text-sm text-gray-600">
                {dayjs(detail.createdAt).format("DD MMM YYYY • HH:mm")}
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{fmtEGP(fromCents(detail.subtotalCents))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{fmtEGP(fromCents(detail.shippingFeeCents || 0))}</span>
                </div>
                {detail.discountCents ? (
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>-{fmtEGP(fromCents(detail.discountCents))}</span>
                  </div>
                ) : null}
                <div className="pt-2 border-t flex justify-between font-poppins text-lg" style={{ fontWeight: 600 }}>
                  <span>Total</span>
                  <span className="text-primary">{fmtEGP(fromCents(detail.totalCents))}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Payment: {detail.paymentMethod === "COD" ? "Cash on Delivery" : "Card"}
                </div>
              </div>

              {detail.address && (
                <>
                  <Separator />
                  <div>
                    <div className="font-medium mb-1">Delivery Address</div>
                    <div className="text-sm text-gray-700">
                      {detail.address.street ||
                        [detail.address.city, detail.address.zone].filter(Boolean).join(", ")}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <div className="font-medium mb-2">Items</div>
                <div className="space-y-2">
                  {detail.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1 pr-2 line-clamp-2">{it.productNameSnapshot}</div>
                      <div className="mx-2 text-gray-500">×{it.qty}</div>
                      <div className="font-medium">
                        {fmtEGP(fromCents(it.priceSnapshotCents) * it.qty)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}
