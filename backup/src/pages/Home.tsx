import React, { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { Search, ShoppingCart, Bell } from 'lucide-react';
import { Button, Input } from '../ui';
import Currency from '../components/Currency';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useHistory } from 'react-router';

import { categories as mockCategories, products as mockProducts } from '../data/mock';
import { listCategories, getBestSelling, getHotOffers, ApiCategory, ApiProduct } from '../services/catalog';
import { useCart } from '../store/cart';
import { addToCartBridge } from '../utils/cartBridge';

export default function HomeScreen() {
  const { t } = useTranslation();
  const history = useHistory();

  const cartCount = useCart((s: any) => (Array.isArray(s.items) ? s.items.length : s.count ?? 0));

  const [categories, setCategories] = useState<ApiCategory[]>(
    mockCategories.map((c) => ({ id: c.id, name: c.name, slug: c.id } as any))
  );
  const [popular, setPopular] = useState<ApiProduct[]>(
    mockProducts.map(
      (p) => ({ id: p.id, name: p.name, slug: p.id, imageUrl: p.image, priceCents: Math.round(p.price * 100) } as any)
    )
  );

  useEffect(() => {
    (async () => {
      try {
        const cats = await listCategories();
        if (cats?.length) setCategories(cats);
      } catch {}

      try {
        const best = await getBestSelling(8);
        const hot = await getHotOffers(8);
        const combined = [...(best || []), ...(hot || [])];
        if (combined.length) setPopular(combined);
      } catch {}
    })();
  }, []);

  const promos = useMemo(
    () => [
      {
        id: 1,
        title: t('home.bannerFreshFruits') || 'Fresh Fruits 30% Off',
        subtitle: t('home.bannerPremium') || 'Premium quality fruits',
        image:
          'https://images.unsplash.com/photo-1705727209465-b292e4129a37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      },
      {
        id: 2,
        title: t('home.bannerFreeDelivery') || 'Free Delivery Today',
        subtitle:
          t('home.bannerAboveAmount') ||
          `On orders above ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EGP' }).format(500)}`,
        image:
          'https://images.unsplash.com/photo-1665521032636-e8d2f6927053?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      },
    ],
    [t]
  );

  const catEmoji = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('dairy')) return '🥛';
    if (n.includes('drink') || n.includes('juice')) return '🥤';
    if (n.includes('bakery') || n.includes('bread')) return '🍞';
    if (n.includes('fruit') || n.includes('apple')) return '🍎';
    if (n.includes('veg') || n.includes('vegetable')) return '🥦';
    if (n.includes('meat') || n.includes('chicken')) return '🍗';
    return '🛍️';
  };

  const onCategoryClick = (c: ApiCategory) => history.push(`/products/${c.id}`);
  const onProductClick = (p: ApiProduct) => history.push(`/product/${p.id}`);
  const onAdd = (p: ApiProduct) => {
    addToCartBridge({
      id: p.id,
      name: p.name,
      price: (((p as any).salePriceCents ?? p.priceCents) || 0) / 100,
      categoryId: (p as any).categoryId ?? '',
      image: (p as any).imageUrl,
    });
  };

  return (
    <IonPage>
      <IonContent fullscreen className="bg-gray-50">
        <div className="flex flex-col h-full pb-24">
          {/* Header */}
          <div className="bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 700 }}>
                  Fasket
                </h1>
                <p className="text-gray-600">{t('home.subtitle') || 'What do you need today?'}</p>
              </div>

              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" className="p-2" aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => history.push('/tabs/cart')}
                  className="p-2 relative"
                  aria-label="Cart"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {cartCount}
                    </div>
                  )}
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input placeholder={t('home.searchPlaceholder') || 'Search for groceries...'} className="pl-10 h-12 rounded-xl" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Promo Banners */}
            <div className="px-4 py-4">
              <div className="flex space-x-4 overflow-x-auto no-scrollbar">
                {promos.map((promo) => (
                  <div key={promo.id} className="min-w-80 bg-primary rounded-xl p-4 text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="font-poppins text-lg mb-1" style={{ fontWeight: 700 }}>
                        {promo.title}
                      </h3>
                      <p className="text-white/90">{promo.subtitle}</p>
                      <Button variant="secondary" size="sm" className="mt-3" onClick={() => history.push('/products/all')}>
                        {t('home.shopNow') || 'Shop Now'}
                      </Button>
                    </div>
                    <div className="absolute right-0 top-0 w-32 h-full opacity-20">
                      <ImageWithFallback src={promo.image} alt={promo.title} className="w-full h-full object-cover" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="px-4 py-2">
              <h2 className="font-poppins text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
                {t('home.shopByCategory') || 'Shop by Category'}
              </h2>
              <div className="grid grid-cols-4 gap-3">
                {categories.map((c) => (
                  <Button key={c.id} variant="ghost" onClick={() => onCategoryClick(c)} className="h-20 rounded-xl bg-gray-100 hover:opacity-80 transition-opacity p-2">
                    <div className="flex flex-col items-center text-center">
                      <div className="text-2xl mb-1">{catEmoji(c.name)}</div>
                      <div className="text-xs font-medium text-gray-700 line-clamp-2">{c.name}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Popular Items */}
            <div className="px-4 py-2">
              <h2 className="font-poppins text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
                {t('home.popularItems') || 'Popular Items'}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {popular.map((p) => {
                  const current = (p as any).salePriceCents ?? p.priceCents;
                  const hasSale = typeof (p as any).salePriceCents === 'number';
                  return (
                    <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm">
                      <button type="button" onClick={() => onProductClick(p)} className="w-full h-24 rounded-lg overflow-hidden mb-3 block">
                        <ImageWithFallback src={(p as any).imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      </button>

                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{p.name}</h3>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-poppins text-lg text-primary" style={{ fontWeight: 600 }}>
                            <Currency value={current ?? 0} cents />
                          </span>
                          {hasSale && (
                            <span className="text-xs text-gray-400 line-through">
                              <Currency value={p.priceCents ?? 0} cents />
                            </span>
                          )}
                        </div>

                        <Button size="sm" onClick={() => onAdd(p)} className="h-8 px-3 rounded-lg">
                          {t('app.actions.add') || 'Add'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

