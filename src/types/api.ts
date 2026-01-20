export type Role = "CUSTOMER" | "ADMIN";

export type User = { id: string; name: string; phone: string; email?: string | null; role: Role };

export type NotificationPreferences = {
  orderUpdates: boolean;
  loyalty: boolean;
  marketing: boolean;
  whatsappOrderUpdates?: boolean;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type?: string | null;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

export type LoyaltyConfig = {
  enabled: boolean;
  earnPoints?: number;
  earnPerCents?: number;
  earnRate?: number;
  redeemRate?: number;
  redeemRateValue?: number;
  redeemUnitCents?: number;
  minRedeemPoints?: number;
  maxRedeemPerOrder?: number;
  maxDiscountPercent?: number;
  resetThreshold?: number;
};

export type DeliveryConfig = {
  defaultEtaMinutes?: number;
  minEtaMinutes?: number;
  maxEtaMinutes?: number;
  currencyCode?: string;
  feeCurrency?: string;
  distancePricingEnabled?: boolean;
};

export type LocalizedString = string | { en?: string; ar?: string };

export type MobileAppConfig = {
  branding?: {
    appName?: LocalizedString;
    logoUrl?: string;
    splashUrl?: string;
    wordmarkUrl?: string;
  };
  theme?: {
    primary?: string;
    primaryStrong?: string;
    accent?: string;
    background?: string;
    surface?: string;
    surfaceMuted?: string;
    text?: string;
    textStrong?: string;
    textMuted?: string;
    mutedForeground?: string;
    borderStrong?: string;
    borderSoft?: string;
    heroGradient?: string;
    splashGradient?: string;
    fontBase?: string;
    fontArabic?: string;
  };
  navigation?: {
    tabs?: Array<{
      id?: string;
      screen?: string;
      label?: LocalizedString;
      icon?: string;
      enabled?: boolean;
      requiresAuth?: boolean;
      order?: number;
    }>;
  };
  home?: {
    hero?: {
      prompt?: LocalizedString;
      title?: LocalizedString;
      subtitle?: LocalizedString;
      pills?: Array<{ label: LocalizedString; icon?: string }>;
    };
    promos?: Array<{
      imageUrl: string;
      title?: LocalizedString;
      subtitle?: LocalizedString;
      action?: string | null;
      link?: string | null;
    }>;
    sections?: Array<{
      id?: string;
      type?: string;
      title?: LocalizedString;
      subtitle?: LocalizedString;
      enabled?: boolean;
      order?: number;
      limit?: number;
    }>;
  };
  content?: {
    support?: {
      phone?: string;
      email?: string;
      websiteUrl?: string;
      webAppUrl?: string;
      whatsapp?: string;
      serviceArea?: LocalizedString;
      workingHours?: LocalizedString;
      cityCoverage?: LocalizedString;
      playStoreUrl?: string;
      appStoreUrl?: string;
    };
  };
  features?: {
    guestCheckout?: boolean;
    coupons?: boolean;
    loyalty?: boolean;
  };
};

export type AppSettings = {
  loyalty?: LoyaltyConfig | null;
  delivery?: DeliveryConfig | null;
  storeName?: string;
  currency?: string;
  maintenanceMode?: boolean;
  contactEmail?: string | null;
  contactPhone?: string | null;
  supportUrl?: string | null;
  payment?: {
    codEnabled?: boolean;
    cardEnabled?: boolean;
    provider?: string | null;
    cashOnDelivery?: {
      enabled?: boolean;
      maxAmount?: number | null;
    };
    creditCards?: {
      enabled?: boolean;
      acceptedCards?: string[];
    };
    digitalWallets?: {
      paypal?: { enabled?: boolean; merchantId?: string | null };
      applePay?: { enabled?: boolean; merchantId?: string | null };
      googlePay?: { enabled?: boolean; merchantId?: string | null };
      vodafoneCash?: { enabled?: boolean; merchantId?: string | null };
      orangeMoney?: { enabled?: boolean; merchantId?: string | null };
      etisalatCash?: { enabled?: boolean; merchantId?: string | null };
    };
    stripe?: {
      enabled?: boolean;
      publicKey?: string | null;
      secretKey?: string | null;
      webhookSecret?: string | null;
    };
  } | null;
  banners?: Array<{ imageUrl: string; action?: string | null }>;
  mobileApp?: MobileAppConfig | null;
};

export type UserProfile = User & {
  points?: number;
  loyaltyPoints?: number;
  loyaltyTier?: string | null;
  loyaltyTotalEarned?: number;
  loyaltyTotalRedeemed?: number;
  ordersCount?: number;
  totalSpentCents?: number;
  addressesCount?: number;
  createdAt?: string;
};

export type AuthPayload = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export type Category = {
  id: string; name: string; nameAr?: string; slug: string; imageUrl?: string | null; parentId?: string | null;
};

export type ProviderSummary = {
  id: string;
  name: string;
  nameAr?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  type?: string | null;
};

export type ProductOptionGroupType = "SINGLE" | "MULTI";
export type ProductOptionGroupPriceMode = "ADD" | "SET";

export type ProductOption = {
  id: string;
  name: string;
  nameAr?: string | null;
  priceCents: number;
  maxQtyPerOption?: number | null;
  sortOrder?: number | null;
  isActive?: boolean;
};

export type ProductOptionGroup = {
  id: string;
  name: string;
  nameAr?: string | null;
  type: ProductOptionGroupType;
  priceMode?: ProductOptionGroupPriceMode;
  minSelected?: number | null;
  maxSelected?: number | null;
  sortOrder?: number | null;
  isActive?: boolean;
  options?: ProductOption[];
};

export type ProductOptionSelection = {
  optionId: string;
  name: string;
  nameAr?: string | null;
  priceCents: number;
  qty: number;
  groupId?: string;
  groupName?: string;
  groupNameAr?: string | null;
  groupPriceMode?: ProductOptionGroupPriceMode;
};

export type Product = {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  imageUrl?: string | null;
  gallery?: string[] | null;
  images?: string[] | null;
  tags?: string[] | null;
  weightBased?: boolean | null;
  soldByWeight?: boolean | null;
  isWeightBased?: boolean | null;
  description?: string | null;
  descriptionAr?: string | null;
  priceCents: number;
  pricingModel?: "unit" | "weight";
  pricePerKg?: number | null;
  unitLabel?: string | null;
  salePriceCents?: number | null;
  stock: number;
  status: "ACTIVE" | "INACTIVE";
  isHotOffer?: boolean;
  deliveryEstimateMinutes?: number | null;
  providerId?: string | null;
  branchId?: string | null;
  categoryId?: string;
  category?: { id: string; name: string; slug: string };
  rating?: number | null;
  optionGroups?: ProductOptionGroup[];
};

export type DeliveryWindow = {
  id: string;
  providerId: string;
  branchId?: string | null;
  name: string;
  nameAr?: string | null;
  startMinutes: number;
  endMinutes: number;
  daysOfWeek?: number[];
  minLeadMinutes?: number | null;
  minOrderAmountCents?: number | null;
  sortOrder?: number | null;
  isActive?: boolean;
};

export type DeliveryZone = {
  id: string;
  nameEn: string;
  nameAr: string;
  name?: string;
  city?: string | null;
  region?: string | null;
  feeCents: number;
  etaMinutes?: number | null;
  freeDeliveryThresholdCents?: number | null;
  minOrderAmountCents?: number | null;
  currencyCode?: string | null;
  isActive?: boolean;
};

export type Address = {
  id: string;
  label: string;
  city: string;
  region?: string | null;
  zone?: string | null;
  zoneId?: string | null;
  street: string;
  building?: string | null;
  apartment?: string | null;
  notes?: string | null;
  lat?: number;
  lng?: number;
  deliveryZone?: DeliveryZone | null;
  isDefault?: boolean;
};

export type LoyaltyTransaction = {
  id: string;
  type: "EARN" | "REDEEM" | "ADJUST";
  points: number;
  orderId?: string | null;
  createdAt: string;
  description?: string | null;
  balanceAfter?: number | null;
};

export type LoyaltySummary = {
  balance: number;
  totalEarned?: number;
  totalRedeemed?: number;
  tier?: string | null;
  nextResetAt?: string | null;
  recentTransactions?: LoyaltyTransaction[];
};

export type DeliveryDriver = {
  id: string;
  fullName: string;
  phone: string;
  vehicleType?: string | null;
  vehiclePlate?: string | null;
  vehicleColor?: string | null;
};

export type CartItem = {
  id: string; cartId: string; productId: string; branchId?: string | null; qty: number; priceCents: number;
  product: {
    name: string;
    imageUrl?: string | null;
    priceCents: number;
    salePriceCents?: number | null;
    pricingModel?: "unit" | "weight";
    pricePerKg?: number | null;
    unitLabel?: string | null;
  };
  options?: ProductOptionSelection[];
};

export type CartGroup = {
  branchId: string;
  providerId?: string | null;
  branchName?: string | null;
  branchNameAr?: string | null;
  items: CartItem[];
  subtotalCents: number;
  shippingFeeCents: number;
  distanceKm?: number | null;
  ratePerKmCents?: number | null;
  deliveryMode?: string | null;
  deliveryRequiresLocation?: boolean;
  deliveryUnavailable?: boolean;
};

export type Cart = {
  cartId: string;
  items: CartItem[];
  groups?: CartGroup[];
  subtotalCents: number;
  totalCents?: number;
  discountCents?: number;
  shippingFeeCents?: number;
  serviceFeeCents?: number;
  couponCode?: string | null;
  coupon?: { code: string; discountCents?: number } | null;
  couponNotice?: Record<string, unknown> | null;
  loyaltyDiscountCents?: number;
  loyaltyAppliedPoints?: number;
  loyaltyAvailablePoints?: number;
  loyaltyMaxRedeemablePoints?: number;
  deliveryEstimateMinutes?: number | null;
  deliveryZoneId?: string | null;
  deliveryZone?: DeliveryZone | null;
  addressId?: string | null;
  delivery?: {
    addressId?: string | null;
    zoneId?: string | null;
    zoneName?: string | null;
    estimatedDeliveryTime?: string | null;
    etaMinutes?: number | null;
    requiresLocation?: boolean;
  };
  requiresAddress?: boolean;
  quote?: unknown;
};

export type OrderGroupItem = {
  id: string;
  code?: string | null;
  status: string;
  subtotalCents: number;
  shippingFeeCents: number;
  discountCents: number;
  totalCents: number;
  serviceFeeCents?: number;
  providerId?: string | null;
  branchId?: string | null;
  providerName?: string | null;
  providerNameAr?: string | null;
  deliveryFailedAt?: string | null;
  deliveryFailedReason?: string | null;
  deliveryFailedNote?: string | null;
  createdAt: string;
  items?: Array<{
    id: string;
    productId: string;
    productNameSnapshot: string;
    priceSnapshotCents: number;
    qty: number;
    options?: ProductOptionSelection[];
  }>;
};

export type OrderGroupProviderSummary = {
  orderId: string;
  providerId?: string | null;
  providerName?: string | null;
  providerNameAr?: string | null;
  status: string;
};

export type OrderGroupSummary = {
  orderGroupId: string;
  code?: string | null;
  status: string;
  subtotalCents: number;
  shippingFeeCents: number;
  discountCents: number;
  totalCents: number;
  serviceFeeCents?: number;
  createdAt: string;
  orders: OrderGroupItem[];
  providers?: OrderGroupProviderSummary[];
  skippedBranchIds?: string[];
};

export type OrderGroupDetail = {
  orderGroupId: string;
  code?: string | null;
  status: string;
  subtotalCents: number;
  shippingFeeCents: number;
  discountCents: number;
  totalCents: number;
  serviceFeeCents?: number;
  createdAt: string;
  address?: OrderDetail["address"] | null;
  providerOrders: OrderGroupItem[];
  orders?: OrderGroupItem[];
};

export type OrderGroupCancelResult = {
  orderGroupId: string;
  cancelledProviders: Array<{ orderId: string; providerId?: string | null; providerName?: string | null }>;
  blockedProviders: Array<{ orderId: string; providerId?: string | null; providerName?: string | null; status: string }>;
  totals: {
    subtotalCents: number;
    shippingFeeCents: number;
    serviceFeeCents: number;
    discountCents: number;
    totalCents: number;
  };
  status: string;
};

export type OrderTimelineEntry = {
  id?: string;
  from?: string | null;
  to?: string | null;
  note?: string | null;
  createdAt: string;
};

export type DriverLocation = {
  driverId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  recordedAt: string;
};

export type OrderSummary = {
  id: string;
  code?: string | null;
  totalCents: number;
  status: string;
  createdAt: string;
  driver?: DeliveryDriver | null;
};

export type WalletProvider = "VODAFONE_CASH" | "ORANGE_MONEY" | "ETISALAT_CASH";
export type PaymentMethodType = "COD" | "CARD" | "WALLET";

export type SavedPaymentMethod = {
  id: string;
  type: PaymentMethodType;
  provider?: string | null;
  last4?: string | null;
  brand?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
  walletProvider?: WalletProvider | null;
  walletPhone?: string | null;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
export type OrderDetail = {
  id: string;
  code?: string | null;
  userId?: string;
  guestName?: string | null;
  guestPhone?: string | null;
  guestAddress?: {
    fullAddress?: string;
    city?: string | null;
    region?: string | null;
    street?: string | null;
    building?: string | null;
    apartment?: string | null;
    notes?: string | null;
  } | null;
  guestLat?: number | null;
  guestLng?: number | null;
  status: string;
  statusHistory?: Array<{ id?: string; from?: string | null; to: string; note?: string | null; createdAt: string }> | null;
  paymentMethod: PaymentMethodType;
  paymentMethodId?: string | null;
  walletProvider?: WalletProvider | null;
  subtotalCents: number;
  shippingFeeCents: number;
  serviceFeeCents?: number;
  discountCents: number;
  totalCents: number;
  createdAt: string;
  deliveryEstimateMinutes?: number | null;
  loyaltyDiscountCents?: number | null;
  loyaltyPointsEarned?: number | null;
  loyaltyPointsRedeemed?: number | null;
  contactPhone?: string | null;
  driver?: DeliveryDriver | null;
  driverAssignedAt?: string | null;
  deliveryZone?: DeliveryZone | null;
  deliveryZoneId?: string | null;
  deliveryZoneName?: string | null;
  deliveryEtaMinutes?: number | null;
  estimatedDeliveryTime?: string | null;
  deliveryWindowId?: string | null;
  scheduledAt?: string | null;
  deliveryWindow?: DeliveryWindow | null;
  deliveryFailedAt?: string | null;
  deliveryFailedReason?: string | null;
  deliveryFailedNote?: string | null;
  address: {
    id: string;
    label: string;
    city: string;
    street: string;
    region?: string | null;
    zone?: string | null;
    zoneId?: string | null;
    deliveryZone?: DeliveryZone | null;
    building?: string | null;
    apartment?: string | null;
    notes?: string | null;
  };
  items: Array<{
    id: string;
    productId: string;
    productNameSnapshot: string;
    priceSnapshotCents: number;
    qty: number;
    options?: ProductOptionSelection[];
  }>;
  recommendedProducts?: Product[];
};

export type OrderReceipt = {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string };
  address: {
    street?: string;
    city?: string;
    region?: string;
    building?: string | null;
    apartment?: string | null;
    notes?: string | null;
    label?: string | null;
  };
  deliveryZone: {
    id: string;
    name: string;
    city?: string | null;
    region?: string | null;
    deliveryFeeCents: number;
    freeDeliveryThresholdCents?: number | null;
    minOrderCents?: number | null;
    etaMinutes?: number | null;
    isActive?: boolean;
  } | null;
  driver: {
    id: string;
    fullName: string;
    phone?: string | null;
    vehicleType?: string | null;
    plateNumber?: string | null;
  } | null;
  items: Array<{
    productId: string;
    productName: string;
    productNameAr?: string | null;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    options?: ProductOptionSelection[];
  }>;
  hasWeightBasedItems?: boolean;
  subtotalCents: number;
  shippingFeeCents: number;
  couponDiscountCents: number;
  loyaltyDiscountCents: number;
  totalCents: number;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  currency: string;
};

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Review = {
  id: string;
  orderId?: string;
  providerId?: string;
  rating: number;
  comment?: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  provider?: { id: string; name: string; nameAr?: string | null } | null;
};
