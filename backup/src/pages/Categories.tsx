// src/pages/Categories.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { categories as mockCategories } from '../data/mock';
import { listCategories, ApiCategory } from '../services/catalog';
import { ArrowLeft, Search, TrendingUp, Star } from 'lucide-react';

type Cat = ApiCategory & {
  icon?: string;
  color?: string;
  itemsCount?: number;
  popular?: boolean;
  trending?: boolean;
};

export default function Categories() {
  const { t } = useTranslation();
  const history = useHistory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'popular' | 'trending'>('all');

  // seed from mock, then hydrate from API
  const [items, setItems] = useState<Cat[]>(
    mockCategories.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.id,
      icon: guessEmoji(c.name),
      color: pickColor(c.name),
      itemsCount: c.itemsCount ?? c.count ?? undefined,
      popular: !!c.popular,
      trending: !!c.trending,
    }))
  );

  // Optional: featured products (skipped for brevity)
  const [featured, setFeatured] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const apiItems = await listCategories();
        if (Array.isArray(apiItems)) {
          setItems(
            apiItems.map((c: any) => ({
              ...c,
              icon: c.icon ?? guessEmoji(c.name),
              color: c.color ?? pickColor(c.name),
              itemsCount: c.itemsCount ?? c.productsCount ?? c.items ?? undefined,
              popular: !!c.popular,
              trending: !!c.trending,
            }))
          );
        }
      } catch {}
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return items.filter((c) => {
      const matchesSearch = !q || String(c.name).toLowerCase().includes(q);
      const matchesFilter =
        selectedFilter === 'all' || (selectedFilter === 'popular' && !!c.popular) || (selectedFilter === 'trending' && !!c.trending);
      return matchesSearch && matchesFilter;
    });
  }, [items, searchQuery, selectedFilter]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('categories.title', 'Categories')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-gray-50">
        {/* Header */}
        <div className="bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center mb-4">
            <button onClick={() => history.replace('/tabs/home')} className="p-2 mr-2 rounded-lg hover:bg-gray-100 active:scale-[0.98] transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {t('categories.title', 'Categories')}
            </h1>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              placeholder={t('categories.search', 'Search categories...') as string}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full h-12 rounded-xl bg-gray-50 focus:bg-white border border-gray-200 focus:border-gray-300 focus:outline-none px-3"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-2">
            {[
              { id: 'all', label: t('categories.filters.all', 'All Categories') },
              { id: 'popular', label: t('categories.filters.popular', 'Popular') },
              { id: 'trending', label: t('categories.filters.trending', 'Trending') },
            ].map((f: any) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`rounded-full text-xs px-3 h-8 border transition ${selectedFilter === f.id ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200'}`}
              >
                {f.id === 'trending' && <TrendingUp className="w-3 h-3 inline mr-1" />}
                {f.id === 'popular' && <Star className="w-3 h-3 inline mr-1" />}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories grid */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
              {t('categories.browse', 'Browse Categories')}
            </h2>
            <span className="text-sm text-gray-500">{filtered.length} {t('categories.count', 'categories')}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => history.push(`/products/${c.id}`)}
                className={`h-28 rounded-xl ${c.color || 'bg-gray-100'} hover:opacity-90 transition-all duration-200 p-4 relative overflow-hidden border border-gray-100 active:scale-[0.99]`}
              >
                <div className="flex flex-col items-center text-center w-full relative z-10">
                  <div className="text-3xl mb-2">{c.icon || '🛍️'}</div>
                  <div className="text-sm font-medium text-gray-700 mb-1 line-clamp-2">{c.name}</div>
                  <div className="text-xs text-gray-600">
                    {typeof c.itemsCount === 'number' ? c.itemsCount : ''} {t('categories.items', 'items')}
                  </div>

                  <div className="flex space-x-1 mt-2">
                    {c.trending && <span className="bg-white/70 text-gray-700 text-[10px] px-1.5 py-0.5 rounded">{t('categories.trending', 'Trending')}</span>}
                    {c.popular && <span className="bg-white/70 text-gray-700 text-[10px] px-1.5 py-0.5 rounded">{t('categories.popular', 'Popular')}</span>}
                  </div>
                </div>

                <div className="absolute top-1 right-2 opacity-10 text-gray-700 text-3xl">{c.icon || '🛍️'}</div>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🧺</div>
              <h3 className="font-poppins text-lg text-gray-900 mb-2" style={{ fontWeight: 600 }}>
                {t('categories.emptyTitle', 'No categories found')}
              </h3>
              <p className="text-gray-600">{t('categories.emptyHint', 'Try searching with different keywords')}</p>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

/* ---------- helpers ---------- */

function guessEmoji(name: string = ''): string {
  const n = name.toLowerCase();
  if (includesAny(n, ['dairy', 'milk', 'cheese', 'yogurt'])) return '🥛';
  if (includesAny(n, ['fruit', 'fruits'])) return '🍎';
  if (includesAny(n, ['vegetable', 'veg'])) return '🥦';
  if (includesAny(n, ['bakery', 'bread', 'cake'])) return '🍞';
  if (includesAny(n, ['meat', 'seafood', 'chicken', 'beef', 'fish'])) return '🍗';
  if (includesAny(n, ['beverage', 'drinks', 'juice', 'soda'])) return '🥤';
  if (includesAny(n, ['snack', 'chips', 'nuts'])) return '🥨';
  if (includesAny(n, ['frozen', 'ice'])) return '🧊';
  if (includesAny(n, ['pantry', 'staple'])) return '🧂';
  if (includesAny(n, ['health', 'beauty'])) return '💄';
  if (includesAny(n, ['household', 'home'])) return '🏠';
  if (includesAny(n, ['pet', 'cat', 'dog'])) return '🐾';
  return '🛍️';
}

function pickColor(name: string = ''): string {
  const palette = ['bg-blue-100', 'bg-red-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100', 'bg-orange-100', 'bg-pink-100', 'bg-gray-100', 'bg-emerald-100', 'bg-indigo-100'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function includesAny(s: string, arr: string[]) {
  return arr.some((k) => s.includes(k));
}

