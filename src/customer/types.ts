import type { Product, ProductOptionSelection } from "../types/api";

export type CartPreviewItem = {
  id: string;
  productId: string;
  branchId?: string | null;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  category?: string;
  product?: Partial<Product>;
  options?: ProductOptionSelection[];
};
