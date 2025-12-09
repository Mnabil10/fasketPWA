export type Role = "CUSTOMER" | "ADMIN";

export type User = { id: string; name: string; phone: string; email?: string | null; role: Role };

export type AuthPayload = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type Category = {
  id: string; name: string; slug: string; imageUrl?: string | null; parentId?: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  priceCents: number;
  salePriceCents?: number | null;
  stock: number;
  status: "ACTIVE" | "INACTIVE";
  category?: { id: string; name: string; slug: string };
};

export type Address = {
  id: string; label: string; city: string; zone?: string; street: string;
  building?: string | null; apartment?: string | null; lat?: number; lng?: number;
};

export type CartItem = {
  id: string; cartId: string; productId: string; qty: number; priceCents: number;
  product: { name: string; imageUrl?: string | null; priceCents: number; salePriceCents?: number | null };
};

export type Cart = { cartId: string; items: CartItem[]; subtotalCents: number };

export type OrderSummary = { id: string; totalCents: number; status: string; createdAt: string };
export type OrderDetail = {
  id: string; userId?: string; status: string; paymentMethod: "COD"|"CARD";
  subtotalCents: number; shippingFeeCents: number; discountCents: number; totalCents: number;
  createdAt: string;
  address: { id: string; label: string; city: string; street: string; zone?: string };
  items: Array<{ id: string; productId: string; productNameSnapshot: string; priceSnapshotCents: number; qty: number }>;
};
