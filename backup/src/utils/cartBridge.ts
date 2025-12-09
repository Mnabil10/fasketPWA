import { addItem, getCart, Cart } from '../services/cart';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';

export async function addToCartBridge(p: { id: string; name: string; price: number; image?: string; categoryId?: string }, qty = 1) {
  const isAuthed = useAuth.getState().isAuthenticated;
  // Always update local cart for instant UX/offline support
  useCart.getState().add({ ...p, categoryId: p.categoryId || '' } as any, qty);
  if (isAuthed) {
    try { await addItem({ productId: p.id, qty }); } catch {}
  }
}

export async function fetchServerCart(): Promise<Cart | null> {
  const isAuthed = useAuth.getState().isAuthenticated;
  if (!isAuthed) return null;
  try { return await getCart(); } catch { return null; }
}

