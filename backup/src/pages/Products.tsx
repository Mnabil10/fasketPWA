import React, { useEffect, useMemo, useState } from 'react';
// Ionic wrappers removed for visual parity; using semantic HTML instead
import { useParams, useHistory } from 'react-router';
import { categories as mockCategories, products as mockProducts } from '../data/mock';
import { listProducts, listCategories, ApiProduct, ApiCategory } from '../services/catalog';
import { addToCartBridge } from '../utils/cartBridge';

import { Button, Input, Badge } from '../ui';
import Currency from '../components/Currency';
import { ArrowLeft, Search, Filter, SlidersHorizontal, Grid, List, Star } from 'lucide-react';

export default function Products() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();

  // fallback values from local mock until API resolves
  const [cat, setCat] = useState<ApiCategory | undefined>(
    (mockCategories as any).find((c: any) => c.id === id) as any
  );
  const [list, setList] = useState<ApiProduct[] | any[]>(
    (mockProducts as any[]).filter((p: any) => p.categoryId === id)
  );

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'price-low' | 'price-high' | 'rating' | 'name'>('popularity');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // load from API
  useEffect(() => {
    (async () => {
      try {
        const cats = await listCategories();
        setCat(cats.find((c) => c.id === id || c.slug === id));
      } catch {}
      try {
        const res = await listProducts({ categoryId: id });
        setList(res);
      } catch {}
    })();
  }, [id]);

  // price helpers
  const curPriceCents = (p: any) =>
    typeof p?.salePriceCents === 'number' ? p.salePriceCents : p?.priceCents;

  // filters/search/sort
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (list || []).filter((p: any) => {
      if (!q) return true;
      const name = (p?.name || '').toLowerCase();
      const catName = (cat?.name || '').toLowerCase();
      return name.includes(q) || catName.includes(q);
    });
  }, [list, searchQuery, cat]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    items.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'price-low':
          return (curPriceCents(a) ?? 0) - (curPriceCents(b) ?? 0);
        case 'price-high':
          return (curPriceCents(b) ?? 0) - (curPriceCents(a) ?? 0);
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'name':
          return String(a.name || '').localeCompare(String(b.name || ''));
        default:
          return 0;
      }
    });
    return items;
  }, [filtered, sortBy]);

  // add to cart
  const onAdd = (p: any) => {
    addToCartBridge({
      id: p.id,
      name: p.name,
      price: (curPriceCents(p) ?? 0) / 100,
      categoryId: id,
      image: p.imageUrl,
    });
  };

  // card renderers
  const renderListCard = (p: any) => (
    <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm mb-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="w-20 h-20 rounded-lg overflow-hidden relative"
          onClick={() => history.push(`/product/${p.id}`)}
        >
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
          {typeof p.salePriceCents === 'number' && p.priceCents > p.salePriceCents && (
            <Badge variant="destructive" className="absolute top-1 right-1 text-xs px-1 py-0">Sale</Badge>
          )}
        </button>

        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{p.name}</h3>
          <div className="flex items-center mb-2 gap-2">
            <div className="flex items-center">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
              <span className="text-xs text-gray-600">{p.rating ?? '4.5'}</span>
            </div>
            {p.inStock === false && <Badge variant="secondary" className="text-xs">Out of Stock</Badge>}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-poppins text-lg text-primary" style={{ fontWeight: 600 }}>
                <Currency value={curPriceCents(p) ?? 0} cents />
              </span>
              {typeof p.salePriceCents === 'number' && (
                <span className="text-sm text-gray-500 line-through">
                  <Currency value={p.priceCents ?? 0} cents />
                </span>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => onAdd(p)}
              disabled={p.inStock === false}
              className="h-8 px-3"
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGridCard = (p: any) => (
    <div
      key={p.id}
      className="bg-white rounded-xl p-3 shadow-sm cursor-pointer"
      onClick={() => history.push(`/product/${p.id}`)}
    >
      <div className="relative w-full h-32 rounded-lg overflow-hidden mb-3">
        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        {typeof p.salePriceCents === 'number' && p.priceCents > p.salePriceCents && (
          <Badge variant="destructive" className="absolute top-2 right-2 text-xs">Sale</Badge>
        )}
        {p.inStock === false && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="secondary">Out of Stock</Badge>
          </div>
        )}
      </div>

      <h3 className="font-medium text-gray-900 mb-1 text-sm line-clamp-2">{p.name}</h3>
      <div className="flex items-center mb-2">
        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
        <span className="text-xs text-gray-600">{p.rating ?? '4.5'}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-poppins text-primary" style={{ fontWeight: 600 }}>
            <Currency value={curPriceCents(p) ?? 0} cents />
          </span>
          {typeof p.salePriceCents === 'number' && (
            <span className="text-xs text-gray-500 line-through">
              <Currency value={p.priceCents ?? 0} cents />
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onAdd(p);
          }}
          disabled={p.inStock === false}
          className="h-7 px-2 text-xs"
        >
          Add
        </Button>
      </div>
    </div>
  );

  const sortOptions = [
    { id: 'popularity', label: 'Most Popular' },
    { id: 'price-low', label: 'Price: Low to High' },
    { id: 'price-high', label: 'Price: High to Low' },
    { id: 'rating', label: 'Highest Rated' },
    { id: 'name', label: 'Name A-Z' },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white px-2 shadow-sm">
          <div className="flex items-center gap-1 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => history.goBack()}
              className="p-2 mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {cat?.name || 'Products'}
            </h1>
          </div>

          {/* Search + Controls */}
          <div className="px-2 pb-3">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters((v) => !v)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                >
                  {sortOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{sorted.length} items</span>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="p-2 rounded-none"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="p-2 rounded-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
      </header>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-gray-600" />
            <span className="font-medium">Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer">In Stock</Badge>
            <Badge variant="outline" className="cursor-pointer">On Sale</Badge>
            <Badge variant="outline" className="cursor-pointer">Organic</Badge>
            <Badge variant="outline" className="cursor-pointer">Local</Badge>
          </div>
        </div>
      )}

      <main className="flex-1">
        <div className="px-4 py-4">
          {sorted.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-4">
                {sorted.map(renderGridCard)}
              </div>
            ) : (
              <div className="space-y-0">{sorted.map(renderListCard)}</div>
            )
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="font-poppins text-lg text-gray-900 mb-2" style={{ fontWeight: 600 }}>
                No products found
              </h3>
              <p className="text-gray-600">Try searching with different keywords</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

