export type Category = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  rating?: number;
  image?: string;
  categoryId: string;
  stock?: number;
};

