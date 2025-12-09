import type { Product } from "../types/api";

export type CartPreviewItem = {
  id: string;
  productId: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  category?: string;
  product?: Partial<Product>;
};

