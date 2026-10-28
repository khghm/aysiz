import Stars from '../shared/Stars';
import ProductCard from '../shared/ProductCard';
import { useState, useMemo } from 'react';
import { useShop } from '../../context/ShopContext';
import { categories, brands } from '../../data/products';
import { formatPrice, finalPrice, faNum } from '../../utils/format';
import { IconFilter, IconX, IconGrid, IconList, IconPackage } from '../Icons';

export default function ShopView() {
  const { products } = useShop();
  const [catFilter, setCatFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [sort, setSort] = useState('bestselling');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [mobileFilter, setMobileFilter] = useState(false);

  const filtered = useMemo(() => {
    let f = products.filter(p => p.effective);
    if (catFilter) f = f.filter(p => p.category === catFilter || p.subcategory === catFilter);
    if (brandFilter) f = f.filter(p => p.brand === brandFilter);
    if (priceMin) f = f.filter(p => finalPrice(p.price, p.discount) >= +priceMin);
    if (priceMax) f = f.filter(p => finalPrice(p.price, p.discount) <= +priceMax);
    if (ratingFilter) f = f.filter(p => p.rating >= ratingFilter);
    if (onlyInStock) f = f.filter(p => p.stock > 0);
    if (onlyDiscount) f = f.filter(p => p.discount > 0);
    switch (sort) {
      case 'cheapest': f.sort((a, b) => finalPrice(a.price, a.discount) - finalPrice(b.price, b.discount)); break;
      case 'expensive': f.sort((a, b) => finalPrice(b.price, b.discount) - finalPrice(a.price, a.discount)); break;
      case 'newest': f.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
      case 'discount': f.sort((a, b) => b.discount - a.discount); break;
      default: f.sort((a, b) => b.sales - a.sales);
    }
    return f;
  }, [products, catFilter, brandFilter, priceMin, priceMax, ratingFilter, onlyInStock, onlyDiscount, sort]);

  const FilterPanel = () => (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-bold text-brand-700 mb-1 block">دسته‌بندی</label>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-[12px] outline-none focus:border-brand-400">
          <option value="">همه دسته‌ها</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[11px] font-bold text-brand-700 mb-1 block">برند</label>
        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-[12px] outline-none focus:border-brand-400">
          <option value="">همه برندها</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <input type="number" placeholder="حداقل قیمت" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="w-1/2 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-[12px] outline-none" />
        <input type="number" placeholder="حداکثر قیمت" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="w-1/2 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-[12px] outline-none" />
      </div>
      <div>
        <label className="text-[11px] font-bold text-brand-700 mb-1 block">حداقل امتیاز</label>
        <div className="flex gap-1">
          {[0, 3, 4, 4.5].map(r => (
            <button key={r} onClick={() => setRatingFilter(r)} className={`px-2 py-1 rounded-lg text-[10px] font-bold ${ratingFilter === r ? 'bg-brand-900 text-white' : 'bg-cream-100 text-brand-700'}`}>{r === 0 ? 'همه' : `${faNum(r)}+`}</button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={onlyInStock} onChange={e => setOnlyInStock(e.target.checked)} className="rounded" />
        <span className="text-[11px] font-bold text-brand-700">فقط موجود</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={onlyDiscount} onChange={e => setOnlyDiscount(e.target.checked)} className="rounded" />
        <span className="text-[11px] font-bold text-brand-700">فقط تخفیف‌دار</span>
      </label>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl text-brand-900">فروشگاه</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setLayout('grid')} className={`p-2 rounded-lg ${layout === 'grid' ? 'bg-brand-100 text-brand-900' : 'text-cream-500'}`}><IconGrid className="w-4 h-4" /></button>
          <button onClick={() => setLayout('list')} className={`p-2 rounded-lg ${layout === 'list' ? 'bg-brand-100 text-brand-900' : 'text-cream-500'}`}><IconList className="w-4 h-4" /></button>
          <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[11px] font-bold outline-none">
            <option value="bestselling">پرفروش‌ترین</option>
            <option value="newest">جدیدترین</option>
            <option value="cheapest">ارزان‌ترین</option>
            <option value="expensive">گران‌ترین</option>
            <option value="discount">بیشترین تخفیف</option>
          </select>
          <button onClick={() => setMobileFilter(true)} className="lg:hidden p-2 rounded-xl border border-cream-300"><IconFilter className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex gap-6">
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="rounded-2xl border border-cream-300 bg-white p-4 sticky top-24">
            <h3 className="text-sm font-bold text-brand-900 mb-3 flex items-center gap-2"><IconFilter className="w-4 h-4" /> فیلترها</h3>
            <FilterPanel />
          </div>
        </aside>
        <div className="flex-1">
          <p className="text-[11px] text-cream-500 mb-3">{faNum(filtered.length)} محصول</p>
          {layout === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => (
                <div key={p.id} className="flex gap-4 p-3 rounded-xl border border-cream-200 bg-white hover:shadow-md transition-all">
                  <img src={p.image} className="w-24 h-24 rounded-xl object-cover" alt="" />
                  <div className="flex-1">
                    <p className="text-[10px] text-brand-600">{p.brand}</p>
                    <h3 className="text-[13px] font-bold text-brand-900">{p.name}</h3>
                    <Stars rating={p.rating} />
                    <p className="text-[11px] text-cream-500 mt-1 line-clamp-1">{p.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {p.discount > 0 && <span className="text-[10px] text-cream-500 line-through">{formatPrice(p.price)}</span>}
                      <span className="text-[13px] font-extrabold text-brand-900">{formatPrice(finalPrice(p.price, p.discount))} تومان</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {filtered.length === 0 && <div className="text-center py-16 text-cream-500"><IconPackage className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">محصولی یافت نشد</p></div>}
        </div>
      </div>
      {mobileFilter && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileFilter(false)}>
          <div className="absolute inset-y-0 end-0 w-72 bg-white p-4 overflow-y-auto animate-drawer" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-brand-900">فیلترها</h3><button onClick={() => setMobileFilter(false)}><IconX className="w-5 h-5" /></button></div>
            <FilterPanel />
          </div>
        </div>
      )}
    </div>
  );
}
