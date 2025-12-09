import { describe, it, expect, beforeEach } from 'vitest';
import { useCart, calcTotals } from '../store/cart';

describe.skip('cart store (skipped)', () => {
  beforeEach(() => { useCart.setState({ items: {} }); });

  it('adds items and computes totals', () => {
    const p = { id: 'p1', name: 'Milk', price: 3.99, categoryId: 'd', image: '' } as any;
    useCart.getState().add(p, 2);
    const items = useCart.getState().items;
    expect(Object.values(items)[0].qty).toBe(2);
    const totals = calcTotals(items);
    expect(totals.subtotal).toBeCloseTo(7.98, 2);
    expect(totals.total).toBeCloseTo(7.98 + 4.99, 2);
  });
});
