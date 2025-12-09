import { Category, Product } from './types';

export const categories: Category[] = [
  { id: 'dairy', name: 'Dairy', icon: 'carton', color: '#e3f2fd' },
  { id: 'fruits', name: 'Fresh Fruits', icon: 'nutrition', color: '#fde7ec' },
  { id: 'vegetables', name: 'Vegetables', icon: 'leaf', color: '#e8f5e9' },
  { id: 'bakery', name: 'Bakery', icon: 'bag-handle', color: '#fff3e0' },
  { id: 'drinks', name: 'Drinks', icon: 'cafe', color: '#ede7f6' }
];

export const products: Product[] = [
  { id: 'milk1', name: 'Fresh Milk', price: 3.99, rating: 4.8, image: '/images/milk.svg', categoryId: 'dairy', stock: 10 },
  { id: 'bread1', name: 'Whole Grain Bread', price: 2.49, rating: 4.3, image: '/images/bread.svg', categoryId: 'bakery', stock: 7 },
  { id: 'strawberry1', name: 'Fresh Strawberries', price: 4.99, oldPrice: 6.99, rating: 4.5, image: '/images/strawberries.svg', categoryId: 'fruits', stock: 12 },
  { id: 'banana1', name: 'Organic Bananas', price: 2.99, rating: 4.6, image: '/images/bananas.svg', categoryId: 'fruits', stock: 0 }
];
