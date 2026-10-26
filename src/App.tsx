import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { ShopProvider, useShop } from './context/ShopContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { Product, Category, categories, brands } from './data/products';
import { formatPrice, finalPrice, faNum, faDateFull, dayLabel, codeAmount, toCSV, toExcel, downloadFile } from './utils/format';
import { summarize, growthRate, channelStats, funnelStages, bottleneck, aggregateCustomers, computePL, cashflowForecast, isPaidOrder, collectedAmount } from './utils/analytics';
import * as api from './services/api';
import { IconHome, IconCart, IconSearch, IconUser, IconHeart, IconStar, IconFilter, IconTruck, IconLock, IconShield, IconClock, IconCheck, IconX, IconPlus, IconMinus, IconEdit, IconTrash, IconChevronDown, IconChevronLeft, IconChevronRight, IconMenu, IconGrid, IconList, IconSun, IconMoon, IconBell, IconSettings, IconChart, IconPackage, IconUsers, IconTag, IconDollar, IconReturn, IconTicket, IconRocket, IconEye, IconLogout, IconDownload, IconUpload, IconPrint, IconMail, IconPhone, IconMapPin, IconClipboard, IconLink, IconStore, IconBox, IconRefresh, IconCamera, IconCalendar, IconFlag, IconZap, IconGift, IconTrending, IconAlert, IconSend, IconCopy, IconBarcode } from './components/Icons';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';

/* ─────────── Toast System ─────────── */
function Toasts() {
  const { toasts } = useShop();
  return (
    <div className="fixed bottom-6 left-6 z-[999] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`animate-rise rounded-xl px-4 py-3 text-sm font-bold shadow-lg ${t.type === 'success' ? 'bg-emerald-600 text-white' : t.type === 'danger' ? 'bg-coral-500 text-white' : 'bg-brand-900 text-white'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ─────────── Star Rating ─────────── */
function Stars({ rating, size = 'sm' }: { rating: number; size?: string }) {
  const s = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <IconStar key={i} className={`${s} ${i <= Math.round(rating) ? 'text-accent-500' : 'text-cream-300'}`} filled={i <= Math.round(rating)} />
      ))}
    </div>
  );
}

/* ─────────── Product Card ─────────── */
function ProductCard({ product }: { product: Product }) {
  const { setSelectedProduct, setView, addToCart, toggleWishlist, wishlist, money } = useShop();
  const liked = wishlist.includes(product.id);
  const fp = finalPrice(product.price, product.discount);
  return (
    <div className="group rounded-2xl border border-cream-300 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-cream-50 cursor-pointer" onClick={() => { setSelectedProduct(product.id); setView('product'); }}>
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        {product.discount > 0 && (
          <span className="absolute top-2 start-2 bg-coral-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">{faNum(product.discount)}٪</span>
        )}
        {product.isNew && (
          <span className="absolute top-2 end-2 bg-emerald-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">جدید</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }} className="absolute bottom-2 end-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow hover:scale-110 transition-transform">
          <IconHeart className={`w-4 h-4 ${liked ? 'text-coral-500' : 'text-brand-700'}`} filled={liked} />
        </button>
      </div>
      <div className="p-3">
        <p className="text-[10px] text-brand-600 font-medium mb-0.5">{product.brand}</p>
        <h3 className="text-[12px] font-bold text-brand-900 line-clamp-2 mb-1.5 cursor-pointer hover:text-brand-600" onClick={() => { setSelectedProduct(product.id); setView('product'); }}>{product.name}</h3>
        <Stars rating={product.rating} />
        <div className="mt-2 flex items-center justify-between">
          <div>
            {product.discount > 0 && <span className="text-[10px] text-cream-500 line-through block">{formatPrice(product.price)}</span>}
            <span className="text-[13px] font-extrabold text-brand-900">{formatPrice(fp)} <span className="text-[9px] font-normal">تومان</span></span>
          </div>
          <button onClick={() => addToCart({ product, qty: 1, size: product.sizes[0], color: product.colors[0]?.name || '' })} className="w-8 h-8 rounded-xl bg-brand-900 text-white flex items-center justify-center hover:bg-brand-700 transition-colors">
            <IconPlus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Header ─────────── */
function Header() {
  const { setView, view, cart, wishlist, products, setSelectedProduct, setSelectedPage, settings, customer } = useShop();
  const { isAdmin, setIsAdmin } = useAdmin();
  const [search, setSearch] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [catMenu, setCatMenu] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  useEffect(() => {
    if (search.length > 1) {
      setSearchResults(products.filter(p => p.effective && (p.name.includes(search) || p.brand.includes(search))).slice(0, 6));
    } else setSearchResults([]);
  }, [search, products]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-cream-200 shadow-sm">
      {settings.tickerTexts?.length > 0 && (
        <div className="bg-brand-900 text-white text-[11px] py-1.5 overflow-hidden">
          <div className="animate-ticker whitespace-nowrap">
            {settings.tickerTexts.join('  |  ')}{'  |  '}{settings.tickerTexts.join('  |  ')}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <button className="lg:hidden" onClick={() => setMobileMenu(!mobileMenu)}><IconMenu className="w-6 h-6 text-brand-900" /></button>
        <div className="cursor-pointer flex items-center gap-2" onClick={() => setView('home')}>
          <div className="w-10 h-10 rounded-xl bg-brand-900 flex items-center justify-center">
            <span className="text-white font-display text-lg">ت</span>
          </div>
          <span className="font-display text-xl text-brand-900 hidden sm:block">{settings.storeName || 'تای سیز'}</span>
        </div>
        <div className="flex-1 max-w-xl relative">
          <div className="relative">
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو در محصولات..." className="w-full rounded-xl border border-cream-300 bg-cream-50 py-2.5 pr-10 pl-4 text-[13px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all" />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-xl border border-cream-300 shadow-xl z-50 overflow-hidden">
              {searchResults.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-cream-50 cursor-pointer" onClick={() => { setSelectedProduct(p.id); setView('product'); setSearch(''); }}>
                  <img src={p.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                  <div><p className="text-[12px] font-bold text-brand-900">{p.name}</p><p className="text-[10px] text-cream-500">{formatPrice(finalPrice(p.price, p.discount))} تومان</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('home')} className={`hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${view === 'home' ? 'bg-brand-50 text-brand-900' : 'text-brand-700 hover:bg-cream-100'}`}>
            <IconHome className="w-4 h-4" /><span className="hidden md:inline">خانه</span>
          </button>
          <button onClick={() => setView('shop')} className={`hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${view === 'shop' ? 'bg-brand-50 text-brand-900' : 'text-brand-700 hover:bg-cream-100'}`}>
            <IconStore className="w-4 h-4" /><span className="hidden md:inline">فروشگاه</span>
          </button>
          <button onClick={() => setView('blog')} className={`hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] font-bold transition-colors ${view === 'blog' ? 'bg-brand-50 text-brand-900' : 'text-brand-700 hover:bg-cream-100'}`}>
            <IconClipboard className="w-4 h-4" /><span className="hidden md:inline">مجله</span>
          </button>
          <div className="relative">
            <button onClick={() => setView('cart')} className="relative p-2 rounded-xl hover:bg-cream-100 transition-colors">
              <IconCart className="w-5 h-5 text-brand-900" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-coral-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pop">{faNum(cart.length)}</span>}
            </button>
          </div>
          <button onClick={() => setView(customer ? 'account' : 'login')} title={customer ? 'حساب کاربری' : 'ورود / ثبت‌نام'} className="p-2 rounded-xl hover:bg-cream-100 transition-colors">
            {customer
              ? <span className="w-6 h-6 rounded-full bg-accent-500 text-brand-950 text-[10px] font-extrabold flex items-center justify-center">{(customer.name || customer.phone).slice(0, 2)}</span>
              : <IconUser className="w-5 h-5 text-brand-900" />}
          </button>
          <button onClick={() => setView('admin')} className="p-2 rounded-xl hover:bg-cream-100 transition-colors">
            <IconSettings className="w-5 h-5 text-brand-700" />
          </button>
        </div>
      </div>
      {mobileMenu && (
        <div className="lg:hidden bg-white border-t border-cream-200 p-4 animate-rise">
          <button onClick={() => { setView('home'); setMobileMenu(false); }} className="block w-full text-start py-2 text-sm font-bold text-brand-900">صفحه اصلی</button>
          <button onClick={() => { setView('shop'); setMobileMenu(false); }} className="block w-full text-start py-2 text-sm font-bold text-brand-900">فروشگاه</button>
          <button onClick={() => { setView('blog'); setMobileMenu(false); }} className="block w-full text-start py-2 text-sm font-bold text-brand-900">مجله</button>
          <button onClick={() => { setView('cart'); setMobileMenu(false); }} className="block w-full text-start py-2 text-sm font-bold text-brand-900">سبد خرید ({faNum(cart.length)})</button>
        </div>
      )}
    </header>
  );
}

/* ─────────── Home View ─────────── */
function HomeView() {
  const { products, setView, setSelectedProduct, setSelectedPost, articles, settings } = useShop();
  const active = products.filter(p => p.effective);
  const bestSellers = [...active].sort((a, b) => b.sales - a.sales).slice(0, 8);
  const newest = [...active].filter(p => p.isNew).slice(0, 8);
  const bestDiscount = [...active].filter(p => p.discount > 0).sort((a, b) => b.discount - a.discount).slice(0, 8);
  const [tab, setTab] = useState<'best' | 'new' | 'discount'>('best');

  return (
    <div className="animate-fade">
      {/* Hero */}
      <section className="relative bg-gradient-to-l from-brand-900 via-brand-800 to-brand-950 text-white py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-accent-500 blur-3xl animate-floaty" />
          <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-coral-500 blur-3xl animate-floaty" style={{ animationDelay: '2s' }} />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <h1 className="font-display text-3xl sm:text-5xl mb-4">فروشگاه آنلاین <span className="text-accent-500">تای سیز</span></h1>
          <p className="text-brand-200 text-sm sm:text-base max-w-lg mb-6">بهترین پوشاک با کیفیت تولیدی و برندهای معتبر. لباس زیر، تی‌شرت، پیراهن، دمپایی، صندل و جوراب برای تمام سنین.</p>
          <button onClick={() => setView('shop')} className="bg-accent-500 text-brand-950 font-extrabold px-6 py-3 rounded-xl hover:bg-accent-400 transition-colors shadow-lg">مشاهده محصولات</button>
        </div>
      </section>

      {/* Amazing Offers */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-4">
          <IconZap className="w-6 h-6 text-coral-500" />
          <h2 className="font-display text-xl text-brand-900">پیشنهاد شگفت‌انگیز</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {bestDiscount.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <h2 className="font-display text-xl text-brand-900 mb-4">دسته‌بندی محصولات</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {categories.map(c => (
            <div key={c.id} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-cream-50 border border-cream-200 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer" onClick={() => setView('shop')}>
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                <IconPackage className="w-5 h-5 text-brand-700" />
              </div>
              <span className="text-[10px] font-bold text-brand-900 text-center">{c.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Banners */}
      {settings.banners?.filter((b: any) => b.active).map((b: any) => (
        <section key={b.id} className="max-w-7xl mx-auto px-4 py-4">
          <div className="rounded-2xl p-8 text-white" style={{ background: `linear-gradient(135deg, ${b.color1}, ${b.color2})` }}>
            <h3 className="font-display text-2xl mb-2">{b.title}</h3>
            <p className="text-sm opacity-90 mb-4">{b.subtitle}</p>
            <button className="bg-white/20 backdrop-blur px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/30">{b.btnText}</button>
          </div>
        </section>
      ))}

      {/* Best/New/Discount Tabs */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-4 border-b border-cream-300 pb-2">
          {[{ k: 'best', l: 'پرفروش‌ترین' }, { k: 'new', l: 'جدیدترین' }, { k: 'discount', l: 'بیشترین تخفیف' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>{t.l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {(tab === 'best' ? bestSellers : tab === 'new' ? newest : bestDiscount).map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Services */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[{ icon: <IconTruck className="w-6 h-6" />, t: 'ارسال سریع', d: 'ارسال به سراسر کشور' }, { icon: <IconShield className="w-6 h-6" />, t: 'ضمانت اصالت', d: 'تضمین اصل بودن کالا' }, { icon: <IconReturn className="w-6 h-6" />, t: '۷ روز بازگشت', d: 'امکان مرجوعی آسان' }, { icon: <IconPhone className="w-6 h-6" />, t: 'پشتیبانی ۲۴/۷', d: 'پاسخگویی همه روزه' }].map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-cream-50 border border-cream-200">
              <div className="text-brand-700">{s.icon}</div>
              <div><p className="text-[12px] font-bold text-brand-900">{s.t}</p><p className="text-[10px] text-cream-500">{s.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* Brand Strip */}
      <section className="py-8 bg-white border-y border-cream-200">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-display text-lg text-brand-900 mb-4 text-center">برندهای محبوب</h2>
          <div className="overflow-hidden relative">
            <div className="flex animate-marquee gap-8">
              {[...brands, ...brands].map((b, i) => (
                <div key={i} className="flex-shrink-0 px-6 py-3 rounded-xl border border-cream-200 bg-cream-50 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer">
                  <span className="text-[12px] font-bold text-brand-800 whitespace-nowrap">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BookShelf - Horizontal Scroll */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-brand-900">پیشنهاد ویژه تای سیز</h2>
          <button onClick={() => setView('shop')} className="text-[12px] font-bold text-brand-600 hover:text-brand-900 flex items-center gap-1">مشاهده همه <IconChevronLeft className="w-4 h-4" /></button>
        </div>
        <div className="shelf flex gap-4 pb-4">
          {active.filter(p => p.discount > 15).map(p => (
            <div key={p.id} className="shelf-item flex-shrink-0 w-48">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </section>

      {/* Promo Banners */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl p-6 bg-gradient-to-l from-brand-900 to-brand-700 text-white cursor-pointer hover:shadow-xl transition-all" onClick={() => setView('shop')}>
            <h3 className="font-display text-lg mb-1">لباس زیر راحتی</h3>
            <p className="text-[11px] text-brand-200 mb-3">مجموعه جدید با جنس نخ پنبه درجه یک</p>
            <span className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg text-[11px] font-bold">خرید کنید</span>
          </div>
          <div className="rounded-2xl p-6 bg-gradient-to-l from-coral-600 to-coral-400 text-white cursor-pointer hover:shadow-xl transition-all" onClick={() => setView('shop')}>
            <h3 className="font-display text-lg mb-1">پوشاک ورزشی</h3>
            <p className="text-[11px] text-white/80 mb-3">تا ۴۰٪ تخفیف روی محصولات ورزشی</p>
            <span className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg text-[11px] font-bold">مشاهده تخفیف‌ها</span>
          </div>
        </div>
      </section>

      {/* Magazine */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl text-brand-900 mb-4">مجله تای سیز</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {articles.slice(0, 3).map(a => (
            <div key={a.id} className="rounded-2xl overflow-hidden border border-cream-200 hover:shadow-lg transition-all cursor-pointer" onClick={() => { setSelectedPost(a.id); setView('post'); }}>
              {a.image ? (
                <img src={a.image} alt={a.title} className="w-full h-32 object-cover" />
              ) : (
                <div className="h-32" style={{ background: `linear-gradient(135deg, ${a.colors[0]}, ${a.colors[1]})` }} />
              )}
              <div className="p-4">
                <span className="text-[10px] font-bold text-brand-600">{a.cat}</span>
                <h3 className="text-[13px] font-bold text-brand-900 mt-1">{a.title}</h3>
                <p className="text-[11px] text-cream-500 mt-1 line-clamp-2">{a.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─────────── Shop View ─────────── */
function ShopView() {
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

/* ─────────── Product Detail ─────────── */
function ProductDetail() {
  const { products, selectedProduct, reviews, setReviews, setView, addToCart, toggleWishlist, wishlist, addToast } = useShop();
  const product = products.find(p => p.id === selectedProduct);
  const [selSize, setSelSize] = useState('');
  const [selColor, setSelColor] = useState('');
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState('');

  if (!product) return <div className="p-8 text-center">محصول یافت نشد</div>;
  const productReviews = reviews.filter(r => r.productId === product.id && r.status === 'approved');
  const related = products.filter(p => p.category === product.category && p.id !== product.id && p.effective).slice(0, 4);
  const liked = wishlist.includes(product.id);
  const fp = finalPrice(product.price, product.discount);

  const submitReview = async () => {
    if (!reviewText || !reviewAuthor) return;
    const newReview = { id: `r-${Date.now()}`, productId: product.id, author: reviewAuthor, rating: reviewRating, text: reviewText, pros: [], cons: [], status: 'pending' as const, date: new Date().toLocaleDateString('fa-IR') };
    setReviews([...reviews, newReview]);
    try { await api.catalog.submitReview(newReview); } catch {}
    addToast('info', 'نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود');
    setReviewText(''); setReviewAuthor('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade">
      <button onClick={() => setView('shop')} className="text-[12px] text-brand-600 font-bold mb-4 flex items-center gap-1 hover:text-brand-900"><IconChevronRight className="w-4 h-4" /> بازگشت به فروشگاه</button>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-cream-50 border border-cream-200">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
        </div>
        <div>
          <p className="text-[12px] text-brand-600 font-medium">{product.brand}</p>
          <h1 className="text-xl font-extrabold text-brand-900 mt-1">{product.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Stars rating={product.rating} size="md" />
            <span className="text-[11px] text-cream-500">({faNum(productReviews.length)} نظر)</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            {product.discount > 0 && (
              <>
                <span className="bg-coral-500 text-white text-sm font-bold rounded-full px-3 py-1">{faNum(product.discount)}٪</span>
                <span className="text-sm text-cream-500 line-through">{formatPrice(product.price)}</span>
              </>
            )}
            <span className="text-2xl font-extrabold text-brand-900">{formatPrice(fp)} <span className="text-xs font-normal">تومان</span></span>
          </div>
          <p className="text-[13px] text-brand-700 mt-4 leading-7">{product.description}</p>
          {product.colors.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold text-brand-700 mb-2">رنگ: {selColor || product.colors[0].name}</p>
              <div className="flex gap-2">
                {product.colors.map(c => (
                  <button key={c.hex} onClick={() => setSelColor(c.name)} className={`w-8 h-8 rounded-full border-2 transition-all ${(selColor || product.colors[0].name) === c.name ? 'border-brand-900 scale-110' : 'border-cream-300'}`} style={{ background: c.hex }} title={c.name} />
                ))}
              </div>
            </div>
          )}
          {product.sizes.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold text-brand-700 mb-2">سایز:</p>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map(s => (
                  <button key={s} onClick={() => setSelSize(s)} className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${(selSize || product.sizes[0]) === s ? 'bg-brand-900 text-white border-brand-900' : 'border-cream-300 text-brand-700 hover:border-brand-400'}`}>{s}</button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <p className="text-[11px] font-bold text-brand-700">تعداد:</p>
            <div className="flex items-center gap-1 border border-cream-300 rounded-xl overflow-hidden">
              <button onClick={() => setQty(q => Math.min(q + 1, product.stock))} className="px-3 py-1.5 hover:bg-cream-100"><IconPlus className="w-3.5 h-3.5" /></button>
              <span className="px-3 text-[13px] font-bold tnum">{faNum(qty)}</span>
              <button onClick={() => setQty(q => Math.max(q - 1, 1))} className="px-3 py-1.5 hover:bg-cream-100"><IconMinus className="w-3.5 h-3.5" /></button>
            </div>
            <span className="text-[10px] text-cream-500">{faNum(product.stock)} عدد موجود</span>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={() => { addToCart({ product, qty, size: selSize || product.sizes[0], color: selColor || product.colors[0]?.name || '' }); }} className="flex-1 bg-brand-900 text-white py-3 rounded-xl font-extrabold text-sm hover:bg-brand-700 transition-colors flex items-center justify-center gap-2">
              <IconCart className="w-4 h-4" /> افزودن به سبد خرید
            </button>
            <button onClick={() => toggleWishlist(product.id)} className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${liked ? 'border-coral-300 bg-coral-50' : 'border-cream-300 hover:border-brand-400'}`}>
              <IconHeart className={`w-5 h-5 ${liked ? 'text-coral-500' : 'text-brand-700'}`} filled={liked} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[{ icon: <IconTruck className="w-4 h-4" />, t: 'ارسال سریع' }, { icon: <IconShield className="w-4 h-4" />, t: 'ضمانت اصالت' }, { icon: <IconReturn className="w-4 h-4" />, t: '۷ روز بازگشت' }].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 p-2 rounded-lg bg-cream-50 text-[10px] font-bold text-brand-700">{s.icon}{s.t}</div>
            ))}
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="mt-8">
        <div className="flex gap-4 border-b border-cream-300">
          {[{ k: 'desc', l: 'معرفی کالا' }, { k: 'specs', l: 'مشخصات فنی' }, { k: 'reviews', l: `نظرات (${faNum(productReviews.length)})` }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500'}`}>{t.l}</button>
          ))}
        </div>
        <div className="py-4">
          {tab === 'desc' && (
            <div>
              <p className="text-[13px] text-brand-700 leading-7">{product.description}</p>
              {product.features.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {product.features.map((f, i) => <li key={i} className="text-[12px] text-brand-700 flex items-center gap-2"><IconCheck className="w-3.5 h-3.5 text-emerald-500" />{f}</li>)}
                </ul>
              )}
            </div>
          )}
          {tab === 'specs' && (
            <div className="space-y-2">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="flex border-b border-cream-100 py-2">
                  <span className="w-32 text-[12px] font-bold text-brand-700">{k}</span>
                  <span className="text-[12px] text-brand-900">{v}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'reviews' && (
            <div>
              <div className="mb-4 p-4 rounded-xl bg-cream-50 border border-cream-200">
                <h4 className="text-[12px] font-bold text-brand-900 mb-2">ثبت نظر جدید</h4>
                <input value={reviewAuthor} onChange={e => setReviewAuthor(e.target.value)} placeholder="نام شما" className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] mb-2 outline-none" />
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => setReviewRating(s)}><IconStar className={`w-5 h-5 ${s <= reviewRating ? 'text-accent-500' : 'text-cream-300'}`} filled={s <= reviewRating} /></button>)}
                </div>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="نظر خود را بنویسید..." className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] h-20 outline-none resize-none" />
                <button onClick={submitReview} className="mt-2 bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold">ارسال نظر</button>
              </div>
              {productReviews.length === 0 ? <p className="text-[12px] text-cream-500">هنوز نظری ثبت نشده</p> : (
                <div className="space-y-3">
                  {productReviews.map(r => (
                    <div key={r.id} className="p-3 rounded-xl border border-cream-200">
                      <div className="flex items-center justify-between"><span className="text-[12px] font-bold text-brand-900">{r.author}</span><Stars rating={r.rating} /></div>
                      <p className="text-[12px] text-brand-700 mt-1">{r.text}</p>
                      {r.pros.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{r.pros.map((p, i) => <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">+{p}</span>)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Related */}
      {related.length > 0 && (
        <div className="mt-8">
          <h3 className="font-display text-lg text-brand-900 mb-4">محصولات مرتبط</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Cart View ─────────── */
function CartView() {
  const { cart, removeFromCart, updateCartQty, settings, appliedCode, setAppliedCode, validateCode, placeOrder, money, addToast, customer, setCustomer } = useShop();
  const { isAdmin } = useAdmin();
  const [code, setCode] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(() => ({ name: customer?.name || '', mobile: customer?.phone || '', city: '', address: '', postalCode: '' }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [redeemPoints, setRedeemPoints] = useState(0);

  useEffect(() => {
    if (!customer || !api.getToken() || isAdmin) return;
    let active = true;
    api.auth.me().then(({ customer: latest }) => {
      if (active) setCustomer(latest);
    }).catch((error) => {
      if (error.status !== 401) addToast('danger', `به‌روزرسانی موجودی امتیاز ناموفق بود: ${error.message}`);
    });
    return () => { active = false; };
  }, [customer?.id, isAdmin, setCustomer, addToast]);

  const subtotal = cart.reduce((s, i) => s + finalPrice(i.product.price, i.product.discount) * i.qty, 0);
  const discountAmt = appliedCode ? codeAmount(appliedCode, subtotal) : 0;
  const loyaltyEligibleAmount = Math.max(0, subtotal - discountAmt);
  const loyaltyPointValue = customer?.loyaltyPointValue || 0;
  const maxRedeemPoints = customer && loyaltyPointValue > 0
    ? Math.min(
      customer.loyaltyPoints || 0,
      Math.floor(Math.floor(loyaltyEligibleAmount * (customer.loyaltyRedemptionCapPercent ?? 10) / 100) / loyaltyPointValue),
    )
    : 0;
  const appliedRedeemPoints = Math.min(redeemPoints, maxRedeemPoints);
  const loyaltyDiscountAmt = appliedRedeemPoints * loyaltyPointValue;
  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingCost;
  const taxRate = settings.showPricesWithTax ? (settings.vatRate + settings.levyRate) / 100 : 0;
  const tax = Math.round((subtotal - discountAmt - loyaltyDiscountAmt) * taxRate);
  const total = subtotal - discountAmt - loyaltyDiscountAmt + shipping + tax;
  const progressToFree = Math.min(100, (subtotal / settings.freeShippingThreshold) * 100);

  useEffect(() => {
    setRedeemPoints((current) => Math.min(current, maxRedeemPoints));
  }, [maxRedeemPoints]);

  const applyCode = async () => {
    const result = await validateCode(code, subtotal);
    if (result.error) { addToast('danger', result.error); return; }
    setAppliedCode(result.code);
    addToast('success', 'کد تخفیف اعمال شد');
  };

  const submitOrder = async () => {
    const errs: Record<string, string> = {};
    if (!form.name) errs.name = 'نام الزامی است';
    if (!form.mobile || form.mobile.length < 11) errs.mobile = 'شماره موبایل معتبر وارد کنید';
    if (!form.city) errs.city = 'شهر الزامی است';
    if (!form.address) errs.address = 'آدرس الزامی است';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await placeOrder({ ...form, redeemPoints: appliedRedeemPoints }); // کاربر به درگاه پرداخت زرین‌پال هدایت می‌شود
    } catch (e: any) {
      setSubmitting(false);
      setShowCheckout(false);
      addToast('danger', e?.fields ? Object.values(e.fields)[0] as string : (e?.message || 'خطا در ثبت سفارش'));
    }
  };

  if (orderCode) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center animate-fade">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><IconCheck className="w-8 h-8 text-emerald-600" /></div>
      <h2 className="text-xl font-extrabold text-brand-900 mb-2">سفارش ثبت شد!</h2>
      <p className="text-[13px] text-brand-700 mb-4">کد پیگیری سفارش شما:</p>
      <p className="text-2xl font-display text-brand-900 bg-cream-50 rounded-xl py-4 px-6 inline-block">{orderCode}</p>
      <p className="text-[12px] text-cream-500 mt-4">سفارش شما در اسرع وقت پردازش و ارسال خواهد شد.</p>
    </div>
  );

  if (cart.length === 0) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <IconCart className="w-16 h-16 mx-auto text-cream-300 mb-4" />
      <h2 className="text-lg font-bold text-brand-900 mb-2">سبد خرید خالی است</h2>
      <p className="text-[12px] text-cream-500">محصولات مورد نظر خود را به سبد اضافه کنید.</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-fade">
      <h1 className="font-display text-xl text-brand-900 mb-4">سبد خرید ({faNum(cart.length)} کالا)</h1>
      {subtotal < settings.freeShippingThreshold && (
        <div className="mb-4 p-3 rounded-xl bg-accent-50 border border-accent-200">
          <p className="text-[11px] font-bold text-brand-700 mb-1">تا ارسال رایگان: {formatPrice(settings.freeShippingThreshold - subtotal)} تومان دیگر</p>
          <div className="w-full h-2 bg-cream-200 rounded-full overflow-hidden"><div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${progressToFree}%` }} /></div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {cart.map((item, idx) => (
            <div key={idx} className="flex gap-4 p-3 rounded-xl border border-cream-200 bg-white">
              <img src={item.product.image} className="w-20 h-20 rounded-xl object-cover" alt="" />
              <div className="flex-1">
                <h3 className="text-[13px] font-bold text-brand-900">{item.product.name}</h3>
                <p className="text-[10px] text-cream-500">سایز: {item.size} | رنگ: {item.color}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 border border-cream-300 rounded-lg">
                    <button onClick={() => updateCartQty(idx, item.qty + 1)} className="px-2 py-1"><IconPlus className="w-3 h-3" /></button>
                    <span className="px-2 text-[12px] font-bold tnum">{faNum(item.qty)}</span>
                    <button onClick={() => updateCartQty(idx, item.qty - 1)} className="px-2 py-1"><IconMinus className="w-3 h-3" /></button>
                  </div>
                  <span className="text-[13px] font-extrabold text-brand-900">{formatPrice(finalPrice(item.product.price, item.product.discount) * item.qty)} تومان</span>
                </div>
              </div>
              <button onClick={() => removeFromCart(idx)} className="text-coral-500 hover:text-coral-700"><IconTrash className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-cream-300 bg-white p-4 h-fit sticky top-24">
          <h3 className="text-sm font-bold text-brand-900 mb-3">خلاصه سفارش</h3>
          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-cream-500">جمع اقلام</span><span className="font-bold">{formatPrice(subtotal)} تومان</span></div>
            {discountAmt > 0 && <div className="flex justify-between text-emerald-600"><span>تخفیف کد</span><span className="font-bold">-{formatPrice(discountAmt)} تومان</span></div>}
            {loyaltyDiscountAmt > 0 && <div className="flex justify-between text-emerald-600"><span>تخفیف امتیاز ({faNum(appliedRedeemPoints)})</span><span className="font-bold">-{formatPrice(loyaltyDiscountAmt)} تومان</span></div>}
            <div className="flex justify-between"><span className="text-cream-500">هزینه ارسال</span><span className="font-bold">{shipping === 0 ? 'رایگان' : formatPrice(shipping) + ' تومان'}</span></div>
            {tax > 0 && <div className="flex justify-between"><span className="text-cream-500">مالیات</span><span className="font-bold">{formatPrice(tax)} تومان</span></div>}
            <div className="border-t border-cream-200 pt-2 flex justify-between"><span className="font-bold text-brand-900">مبلغ قابل پرداخت</span><span className="font-extrabold text-brand-900 text-[14px]">{formatPrice(total)} تومان</span></div>
          </div>
          <div className="mt-3 flex gap-2">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="کد تخفیف" className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
            <button onClick={applyCode} className="bg-brand-900 text-white px-3 py-2 rounded-xl text-[11px] font-bold">اعمال</button>
          </div>
          {customer && (
            <div className="mt-3 rounded-xl border border-cream-200 bg-cream-50 p-3">
              <div className="flex justify-between text-[11px]">
                <span>امتیاز قابل استفاده</span><span className="font-bold">{faNum(customer.loyaltyPoints || 0)}</span>
              </div>
              <label className="mt-2 block text-[10px] text-cream-500">حداکثر {customer.loyaltyRedemptionCapPercent ?? 10}٪ مبلغ کالای پس از تخفیف</label>
              <input type="number" min="0" max={maxRedeemPoints} step="1" value={redeemPoints} onChange={e => setRedeemPoints(Math.max(0, Math.floor(Number(e.target.value) || 0)))} disabled={maxRedeemPoints === 0} className="mt-1 w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-[12px] disabled:opacity-50" />
              {maxRedeemPoints === 0 && <p className="mt-1 text-[10px] text-cream-500">برای این سفارش امتیاز قابل بازخرید ندارید.</p>}
            </div>
          )}
          <button onClick={() => setShowCheckout(true)} className="w-full mt-4 bg-brand-900 text-white py-3 rounded-xl font-extrabold text-sm hover:bg-brand-700 transition-colors">تکمیل خرید</button>
          <div className="mt-3 space-y-1.5">
            {[{ icon: <IconLock className="w-3.5 h-3.5" />, t: 'پرداخت امن شاپرک' }, { icon: <IconTruck className="w-3.5 h-3.5" />, t: 'ارسال از انبار تهران' }].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-cream-500">{s.icon}{s.t}</div>
            ))}
          </div>
        </div>
      </div>
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCheckout(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-rise" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-brand-900 mb-4">اطلاعات ارسال</h3>
            <div className="space-y-3">
              {[{ k: 'name', l: 'نام و نام خانوادگی', ph: 'نام کامل' }, { k: 'mobile', l: 'شماره موبایل', ph: '۰۹۱۲۱۲۳۴۵۶۷' }, { k: 'city', l: 'شهر', ph: 'تهران' }, { k: 'address', l: 'آدرس کامل', ph: 'آدرس...' }].map(f => (
                <div key={f.k}>
                  <label className="text-[11px] font-bold text-brand-700 mb-1 block">{f.l}</label>
                  <input value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.ph} className={`w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none ${errors[f.k] ? 'border-coral-400' : 'border-cream-300'}`} />
                  {errors[f.k] && <p className="text-[10px] text-coral-600 mt-1">{errors[f.k]}</p>}
                </div>
              ))}
              <div>
                <label className="text-[11px] font-bold text-brand-700 mb-1 block">کد پستی (اختیاری)</label>
                <input value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} placeholder="کد پستی" className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[13px] outline-none" />
              </div>
            </div>
            <button onClick={submitOrder} disabled={submitting} className="w-full mt-4 bg-brand-900 text-white py-3 rounded-xl font-extrabold text-sm disabled:opacity-60">{submitting ? 'در حال انتقال به درگاه پرداخت...' : 'ثبت سفارش و پرداخت'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Blog View ─────────── */
function BlogView() {
  const { articles, setView, setSelectedPost } = useShop();
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade">
      <h1 className="font-display text-xl text-brand-900 mb-6">مجله تای سیز</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map(a => (
          <div key={a.id} className="rounded-2xl overflow-hidden border border-cream-200 hover:shadow-lg transition-all cursor-pointer" onClick={() => { setSelectedPost(a.id); setView('post'); }}>
            {a.image ? (
              <img src={a.image} alt={a.title} className="w-full h-40 object-cover" />
            ) : (
              <div className="h-40" style={{ background: `linear-gradient(135deg, ${a.colors[0]}, ${a.colors[1]})` }} />
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 text-[10px] text-cream-500 mb-1"><span>{a.cat}</span><span>|</span><span>{a.readTime}</span><span>|</span><span>{faNum(a.views)} بازدید</span></div>
              <h3 className="text-[14px] font-bold text-brand-900">{a.title}</h3>
              <p className="text-[12px] text-cream-500 mt-1 line-clamp-2">{a.summary}</p>
              <div className="flex flex-wrap gap-1 mt-2">{a.tags.map(t => <span key={t} className="text-[9px] bg-cream-100 text-brand-700 rounded-full px-2 py-0.5">{t}</span>)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlogPostView() {
  const { articles, selectedPost, setView } = useShop();
  const article = articles.find(a => a.id === selectedPost);
  
  if (!article) return <div className="max-w-7xl mx-auto px-4 py-6 text-center">مقاله یافت نشد</div>;

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-bold text-brand-900 mt-6 mb-3">{line.replace('## ', '')}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-bold text-brand-800 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      } else if (line.startsWith('- ')) {
        return <li key={i} className="text-[14px] text-brand-700 mr-4 mb-1 list-disc">{line.replace('- ', '')}</li>;
      } else if (line.trim()) {
        return <p key={i} className="text-[14px] text-brand-700 leading-7 mb-3">{line}</p>;
      }
      return null;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade">
      <button onClick={() => setView('blog')} className="flex items-center gap-2 text-brand-600 hover:text-brand-900 mb-4 text-[13px] font-bold">
        <IconChevronRight className="w-4 h-4" /> بازگشت به مجله
      </button>
      {article.image && (
        <img src={article.image} alt={article.title} className="w-full h-64 sm:h-80 object-cover rounded-2xl mb-6" />
      )}
      <div className="flex items-center gap-3 text-[11px] text-cream-500 mb-3">
        <span className="bg-brand-100 text-brand-700 px-2 py-1 rounded-lg font-bold">{article.cat}</span>
        <span>{article.date}</span>
        <span>|</span>
        <span>{article.readTime} مطالعه</span>
        <span>|</span>
        <span>{faNum(article.views)} بازدید</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand-900 mb-4">{article.title}</h1>
      <p className="text-[15px] text-brand-600 leading-8 mb-6">{article.summary}</p>
      <div className="prose max-w-none">
        {renderContent(article.content)}
      </div>
      <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-cream-200">
        {article.tags.map(t => (
          <span key={t} className="text-[11px] bg-cream-100 text-brand-700 rounded-full px-3 py-1 font-bold">{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Footer ─────────── */
function Footer() {
  const { settings } = useShop();
  return (
    <footer className="bg-brand-950 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><span className="font-display text-sm">ت</span></div><span className="font-display text-lg">{settings.storeName || 'تای سیز'}</span></div>
          <p className="text-[12px] text-brand-300 leading-6">فروشگاه آنلاین پوشاک تای سیز با سال‌ها تجربه در تولید و فروش انواع پوشاک با کیفیت.</p>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">دسترسی سریع</h4>
          <ul className="space-y-2 text-[12px] text-brand-300"><li>صفحه اصلی</li><li>فروشگاه</li><li>مجله</li><li>درباره ما</li><li>تماس با ما</li></ul>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">خدمات مشتریان</h4>
          <ul className="space-y-2 text-[12px] text-brand-300"><li>راهنمای خرید</li><li>رویه بازگشت</li><li>قوانین و مقررات</li><li>حریم خصوصی</li></ul>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">ارتباط با ما</h4>
          <div className="space-y-2 text-[12px] text-brand-300">
            <p className="flex items-center gap-2"><IconPhone className="w-4 h-4" />{settings.phone}</p>
            <p className="flex items-center gap-2"><IconMail className="w-4 h-4" />{settings.email}</p>
            <p className="flex items-center gap-2"><IconMapPin className="w-4 h-4" />{settings.address}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-[11px] text-brand-400">تمامی حقوق محفوظ است | فروشگاه تای سیز {faNum(new Date().getFullYear())}</div>
    </footer>
  );
}

/* ─────────── Admin Login ─────────── */
function AdminLogin() {
  const { setIsAdmin, isAdmin } = useAdmin();
  const { setView } = useShop();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setErr(''); setLoading(true);
    try {
      const res = await api.auth.adminLogin(user, pass);
      api.setToken(res.token); // توکن ادمین برای فراخوانی‌های محافظت‌شده
      setIsAdmin(true);
    } catch (e: any) {
      setErr(e.message || 'نام کاربری یا رمز عبور اشتباه است');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-brand-600/20 blur-3xl animate-floaty" />
        <div className="absolute bottom-20 left-20 w-72 h-72 rounded-full bg-coral-600/15 blur-3xl animate-floaty" style={{ animationDelay: '3s' }} />
      </div>
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm animate-rise">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-brand-900 flex items-center justify-center mx-auto mb-3"><span className="text-white font-display text-xl">ت</span></div>
          <h2 className="font-display text-xl text-brand-900">پنل مدیریت تای سیز</h2>
          <p className="text-[12px] text-cream-500 mt-1">برای ورود اطلاعات مدیر را وارد کنید</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-brand-700 mb-1 block">نام کاربری</label>
            <input value={user} onChange={e => setUser(e.target.value)} placeholder="نام کاربری" className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-[13px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-brand-700 mb-1 block">رمز عبور</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="رمز عبور" className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-[13px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" onKeyDown={e => e.key === 'Enter' && login()} />
          </div>
          {err && <p className="text-[11px] text-coral-600 font-bold">{err}</p>}
          <button onClick={login} disabled={loading} className="w-full bg-brand-900 text-white py-3 rounded-xl font-extrabold text-sm hover:bg-brand-700 transition-colors shadow-lg shadow-brand-900/25 disabled:opacity-60">{loading ? 'در حال ورود...' : 'ورود به پنل'}</button>
          {import.meta.env.DEV && <button onClick={() => { setUser('admin'); setPass('admin123'); }} className="w-full border border-cream-300 py-2.5 rounded-xl text-[12px] font-bold text-brand-700 hover:border-accent-500 transition-colors">ورود سریع با حساب آزمایشی</button>}
          <button onClick={() => setView('home')} className="w-full text-[12px] text-cream-500 hover:text-brand-700 mt-2">بازگشت به فروشگاه</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Admin Panel ─────────── */
function AdminPanel() {
  const admin = useAdmin();
  const shop = useShop();
  const { isAdmin, setIsAdmin, darkMode, toggleDark, currentRole, adminIdentity, adminSection, setAdminSection } = admin;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const allowedSections = adminIdentity?.sections || [];
  const visibleSection = allowedSections.includes(adminSection)
    ? adminSection
    : allowedSections.includes('home') ? 'home' : allowedSections[0] || 'home';

  if (!isAdmin) return <AdminLogin />;
  if (!adminIdentity) return <div className="min-h-screen grid place-items-center text-sm text-cream-500">در حال بررسی دسترسی مدیر...</div>;

  const sections = [
    { id: 'home', label: 'نمای کلی', icon: <IconHome className="w-5 h-5" /> },
    { id: 'reports', label: 'گزارش‌ها و تحلیل', icon: <IconChart className="w-5 h-5" /> },
    { id: 'orders', label: 'سفارش‌ها', icon: <IconClipboard className="w-5 h-5" /> },
    { id: 'products', label: 'محصولات', icon: <IconPackage className="w-5 h-5" /> },
    { id: 'finance', label: 'امور مالی', icon: <IconDollar className="w-5 h-5" /> },
    { id: 'customers', label: 'مشتریان و CRM', icon: <IconUsers className="w-5 h-5" /> },
    { id: 'reviews', label: 'نظرات کاربران', icon: <IconStar className="w-5 h-5" /> },
    { id: 'discounts', label: 'کدهای تخفیف', icon: <IconTag className="w-5 h-5" /> },
    { id: 'growth', label: 'بازاریابی', icon: <IconRocket className="w-5 h-5" /> },
    { id: 'returns', label: 'مرجوعی‌ها', icon: <IconReturn className="w-5 h-5" /> },
    { id: 'support', label: 'پشتیبانی و تیکت', icon: <IconTicket className="w-5 h-5" /> },
    { id: 'operations', label: 'عملیات', icon: <IconBox className="w-5 h-5" /> },
    { id: 'system', label: 'سیستم و امنیت', icon: <IconShield className="w-5 h-5" /> },
    { id: 'settings', label: 'تنظیمات', icon: <IconSettings className="w-5 h-5" /> },
    { id: 'insights', label: 'تحلیل هوشمند', icon: <IconTrending className="w-5 h-5" /> },
    { id: 'affiliates', label: 'افیلیت و بازاریابان', icon: <IconLink className="w-5 h-5" /> },
    { id: 'pos', label: 'صندوق فروش', icon: <IconStore className="w-5 h-5" /> },
    { id: 'content', label: 'مدیریت محتوا', icon: <IconEdit className="w-5 h-5" /> },
    { id: 'vendors', label: 'فروشندگان', icon: <IconUsers className="w-5 h-5" /> },
    { id: 'logistics', label: 'ارسال و لجستیک', icon: <IconTruck className="w-5 h-5" /> },
    { id: 'tasks', label: 'وظایف و تیم', icon: <IconCalendar className="w-5 h-5" /> },
  ].filter(s => allowedSections.includes(s.id));

  const sectionTitles: Record<string, string> = {};
  sections.forEach(s => sectionTitles[s.id] = s.label);

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-[#10151d]' : 'bg-cream-50'}`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 start-0 z-40 w-64 bg-brand-950 border-e border-white/5 overflow-y-auto transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0'}`}>
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><span className="text-white font-display text-sm">ت</span></div><span className="font-display text-white text-lg">پنل تای سیز</span></div>
        </div>
        <nav className="p-3 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => { setAdminSection(s.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all ${visibleSection === s.id ? 'bg-brand-600/15 text-accent-500 border-r-2 border-accent-500' : 'text-brand-100/70 hover:bg-white/5 hover:text-white'}`}>
              {s.icon}<span>{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/5 mt-4">
          <button onClick={() => { setIsAdmin(false); api.setToken(null); shop.setView('home'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold text-coral-400 hover:bg-white/5"><IconLogout className="w-4 h-4" />خروج</button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:mr-64">
        {/* Topbar */}
        <header className={`sticky top-0 z-30 ${darkMode ? 'bg-[#151b26]/90' : 'bg-white/90'} backdrop-blur-md border-b ${darkMode ? 'border-white/10' : 'border-cream-300'}`}>
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <button className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><IconMenu className="w-5 h-5" /></button>
              <h1 className={`font-display text-xl sm:text-2xl ${darkMode ? 'text-white' : 'text-brand-900'}`}>{sectionTitles[visibleSection] || 'نمای کلی'}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] ${darkMode ? 'text-brand-300' : 'text-cream-500'}`}>{faDateFull()}</span>
              <span className={`rounded-xl border px-2 py-1.5 text-[11px] font-bold ${darkMode ? 'bg-[#1a212c] border-white/10 text-white' : 'border-cream-300 bg-white text-brand-900'}`} title={adminIdentity.username}>
                {adminIdentity.name} · {currentRole}
              </span>
              <button onClick={toggleDark} className={`p-2 rounded-xl ${darkMode ? 'bg-white/5 text-accent-500' : 'bg-cream-100 text-brand-700'}`}>{darkMode ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />}</button>
              <div className="relative">
                <IconBell className={`w-5 h-5 ${darkMode ? 'text-brand-300' : 'text-brand-700'}`} />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-coral-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold animate-pop">{faNum(admin.orders.filter((o: any) => o.status === 'pending').length)}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl animate-fade">
          <AdminContent section={visibleSection} />
        </main>
      </div>
    </div>
  );
}

/* ─────────── Admin Content Router ─────────── */
function AdminContent({ section }: { section: string }) {
  switch (section) {
    case 'home': return <AdminHome />;
    case 'orders': return <AdminOrders />;
    case 'products': return <AdminProducts />;
    case 'reports': return <AdminReports />;
    case 'finance': return <AdminFinance />;
    case 'customers': return <AdminCustomers />;
    case 'reviews': return <AdminReviews />;
    case 'discounts': return <AdminDiscounts />;
    case 'growth': return <AdminGrowth />;
    case 'returns': return <AdminReturns />;
    case 'support': return <AdminSupport />;
    case 'operations': return <AdminOperations />;
    case 'system': return <AdminSystem />;
    case 'settings': return <AdminSettings />;
    case 'insights': return <AdminInsights />;
    case 'affiliates': return <AdminAffiliates />;
    case 'pos': return <AdminPOS />;
    case 'content': return <AdminContentManager />;
    case 'vendors': return <AdminVendors />;
    case 'logistics': return <AdminLogistics />;
    case 'tasks': return <AdminTasks />;
    default: return <AdminHome />;
  }
}

/* ─────────── Admin Home ─────────── */
function AdminHome() {
  const { orders, darkMode } = useAdmin();
  const { products } = useShop();
  const stats = summarize(orders);
  const lowStock = products.filter(p => p.stock <= 5);
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const ds = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds);
    return { day: faNum(d.getDate()), revenue: dayOrders.filter(isPaidOrder).reduce((s: number, o: any) => s + collectedAmount(o), 0) };
  });
  const statusCounts = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => ({
    name: s, value: orders.filter((o: any) => o.status === s).length
  }));
  const statusColors: Record<string, string> = { pending: '#8698ae', processing: '#f59e0b', shipped: '#0ea5e9', delivered: '#1A2238', cancelled: '#E34A4A' };
  const topProducts = [...products].sort((a, b) => b.sales - a.sales).slice(0, 5);
  const maxSales = topProducts[0]?.sales || 1;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ l: 'سفارش‌های امروز', v: faNum(stats.todayOrders), icon: <IconClipboard className="w-5 h-5" />, c: 'bg-blue-50 text-blue-700' },
          { l: 'مشتریان یکتا', v: faNum(stats.uniqueCustomers), icon: <IconUsers className="w-5 h-5" />, c: 'bg-emerald-50 text-emerald-700' },
          { l: 'نرخ تبدیل', v: stats.conversionRate === null ? '—' : `${faNum(stats.conversionRate)}٪`, icon: <IconTrending className="w-5 h-5" />, c: 'bg-purple-50 text-purple-700' },
          { l: 'فروش پرداخت‌شده', v: formatPrice(stats.totalRevenue), icon: <IconDollar className="w-5 h-5" />, c: 'bg-amber-50 text-amber-700' }
        ].map((k, i) => (
          <div key={i} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className={`w-9 h-9 rounded-xl ${k.c} flex items-center justify-center mb-2`}>{k.icon}</div>
            <p className="text-[11px] text-cream-500">{k.l}</p>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-extrabold ${darkMode ? 'text-white' : 'text-brand-900'} mb-1`}>روند فروش ۱۴ روز اخیر</h3>
          <p className="text-[11px] text-cream-500 mb-4">درآمد روزانه به تومان</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={last14}>
              <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1A2238" stopOpacity={0.3} /><stop offset="95%" stopColor="#1A2238" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
              <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
              <Tooltip 
                contentStyle={{ 
                  background: '#1A2238',
                  border: '2px solid #F5C518',
                  borderRadius: 12,
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'Vazirmatn',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  direction: 'rtl'
                }}
                itemStyle={{ color: '#ffffff' }}
                labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#1A2238" fill="url(#colorRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-extrabold ${darkMode ? 'text-white' : 'text-brand-900'} mb-1`}>سفارش‌ها بر اساس وضعیت</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''} labelLine={false}>
                {statusCounts.map((entry, i) => <Cell key={i} fill={statusColors[entry.name]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0D1221', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-extrabold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>آخرین سفارش‌ها</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2 px-2 font-bold text-cream-500">کد</th><th className="text-start py-2 px-2 font-bold text-cream-500">مشتری</th><th className="text-start py-2 px-2 font-bold text-cream-500">مبلغ</th><th className="text-start py-2 px-2 font-bold text-cream-500">وضعیت</th>
              </tr></thead>
              <tbody>{orders.slice(0, 5).map((o: any) => (
                <tr key={o.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                  <td className="py-2 px-2 font-bold tnum">{o.code}</td><td className="py-2 px-2">{o.customer}</td><td className="py-2 px-2 tnum">{formatPrice(o.total)}</td>
                  <td className="py-2 px-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${o.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : o.status === 'cancelled' ? 'bg-coral-100 text-coral-700' : o.status === 'pending' ? 'bg-cream-100 text-brand-700' : 'bg-blue-100 text-blue-700'}`}><span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[o.status] }} />{o.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-extrabold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>پرفروش‌ترین کالاها</h3>
          <div className="space-y-3">
            {topProducts.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <img src={p.image} className="w-9 h-9 rounded-lg object-cover" alt="" />
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-bold truncate ${darkMode ? 'text-white' : 'text-brand-900'}`}>{p.name}</p>
                  <div className="w-full h-1.5 bg-cream-200 rounded-full mt-1"><div className="h-full bg-brand-900 rounded-full" style={{ width: `${(p.sales / maxSales) * 100}%` }} /></div>
                </div>
                <span className="text-[11px] font-bold tnum text-cream-500">{faNum(p.sales)}</span>
              </div>
            ))}
          </div>
          {lowStock.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-coral-50 border border-coral-200">
              <p className="text-[11px] font-bold text-coral-700 flex items-center gap-1"><IconAlert className="w-3.5 h-3.5" />هشدار موجودی کم: {faNum(lowStock.length)} کالا</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Admin Orders ─────────── */
function AdminOrders() {
  const { darkMode, log, orders, setOrders } = useAdmin();
  const { addToast } = useShop();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const filtered = orders.filter((o: any) => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search && !String(o.code||'').includes(search) && !String(o.customer||o.name||'').includes(search) && !String(o.mobile||'').includes(search)) return false;
    return true;
  });
  const statusColors: Record<string, string> = { pending: 'bg-cream-100 text-brand-700', processing: 'bg-amber-100 text-amber-700', shipped: 'bg-blue-100 text-blue-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-coral-100 text-coral-700' };
  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const statusLabels: Record<string, string> = { pending: 'در انتظار', processing: 'در حال پردازش', shipped: 'ارسال شده', delivered: 'تحویل شده', cancelled: 'لغو شده' };
  const changeStatus = async (order: any, status: string) => {
    try {
      const saved = await api.orders.updateStatus(order.id, status);
      setOrders(orders.map((item: any) => item.id === saved.id ? saved : item));
      log(`تغییر وضعیت سفارش ${order.code} به ${statusLabels[status]}`, order.id);
      if (selected?.id === order.id) setSelected(saved);
      addToast('success', 'وضعیت سفارش ذخیره شد');
    } catch (error: any) {
      addToast('danger', `تغییر وضعیت سفارش ناموفق بود: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {['all', ...statuses].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${filter === s ? 'bg-brand-900 text-white' : darkMode ? 'bg-white/5 text-brand-300' : 'bg-cream-100 text-brand-700'}`}>{s === 'all' ? 'همه' : statusLabels[s]}</button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو کد، نام، موبایل..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کد سفارش</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مشتری</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">شهر</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مبلغ</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تاریخ</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عملیات</th>
            </tr></thead>
            <tbody>{filtered.map((o: any) => (
              <tr key={o.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                <td className="py-2.5 px-3 font-bold tnum">{o.code}</td>
                <td className="py-2.5 px-3">{o.customer}</td>
                <td className="py-2.5 px-3">{o.city}</td>
                <td className="py-2.5 px-3 tnum">{formatPrice(o.total)}</td>
                <td className="py-2.5 px-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[o.status]}`}>{statusLabels[o.status]}</span></td>
                <td className="py-2.5 px-3 text-[11px] text-cream-500">{dayLabel(new Date(o.createdAt))}</td>
                <td className="py-2.5 px-3"><button onClick={() => setSelected(o)} className="text-brand-600 hover:text-brand-900"><IconEye className="w-4 h-4" /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-end" onClick={() => setSelected(null)}>
          <div className={`w-full max-w-md h-full overflow-y-auto ${darkMode ? 'bg-[#151b26]' : 'bg-white'} animate-drawer p-6`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>جزئیات سفارش {selected.code}</h3><button onClick={() => setSelected(null)}><IconX className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold text-cream-500 mb-2">تغییر وضعیت:</p>
                <div className="flex flex-wrap gap-1">{statuses.map(s => <button key={s} onClick={() => changeStatus(selected, s)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${selected.status === s ? 'bg-brand-900 text-white' : 'bg-cream-100 text-brand-700'}`}>{statusLabels[s]}</button>)}</div>
              </div>
              <div>
                <p className="text-[11px] font-bold text-cream-500 mb-2">مراحل پردازش:</p>
                <div className="flex items-center gap-1">{['pending', 'processing', 'shipped', 'delivered'].map((s, i) => { const active = statuses.indexOf(selected.status) >= i; const lineActive = statuses.indexOf(selected.status) > i; return (<React.Fragment key={s}><div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${active ? 'bg-brand-900 text-white' : 'bg-cream-200 text-cream-500'}`}>{faNum(i + 1)}</div>{i < 3 && <div className={`flex-1 h-0.5 ${lineActive ? 'bg-brand-900' : 'bg-cream-200'}`}></div>}</React.Fragment>); })}</div>
              </div>
              <div className={`rounded-xl border ${darkMode ? 'border-white/10' : 'border-cream-200'} p-3`}>
                <p className="text-[11px] font-bold text-cream-500 mb-2">اقلام سفارش:</p>
                {selected.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between py-1 text-[12px]"><span>{item.name} x{faNum(item.qty)}</span><span className="tnum">{formatPrice(finalPrice(item.price, item.discount) * item.qty)}</span></div>
                ))}
              </div>
              <div className={`rounded-xl border ${darkMode ? 'border-white/10' : 'border-cream-200'} p-3 space-y-1 text-[12px]`}>
                <p className="font-bold text-cream-500 text-[11px] mb-2">اطلاعات مشتری:</p>
                <p><span className="text-cream-500">نام: </span>{selected.customer}</p>
                <p><span className="text-cream-500">موبایل: </span><span className="tnum">{selected.mobile}</span></p>
                <p><span className="text-cream-500">شهر: </span>{selected.city}</p>
                <p><span className="text-cream-500">آدرس: </span>{selected.address}</p>
              </div>
              <div className={`rounded-xl border ${darkMode ? 'border-white/10' : 'border-cream-200'} p-3 space-y-1 text-[12px]`}>
                <div className="flex justify-between"><span className="text-cream-500">جمع اقلام</span><span className="tnum">{formatPrice(selected.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-cream-500">تخفیف</span><span className="tnum text-coral-600">-{formatPrice(selected.discountAmount)}</span></div>
                <div className="flex justify-between"><span className="text-cream-500">ارسال</span><span className="tnum">{formatPrice(selected.shipping)}</span></div>
                <div className="flex justify-between border-t pt-1 font-bold"><span>مبلغ نهایی</span><span className="tnum">{formatPrice(selected.total)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Admin Products ─────────── */
function AdminProducts() {
  const { darkMode, log, isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ['admin', 'products', 'all'],
    queryFn: () => api.catalog.products('?limit=1000&includeInactive=true'),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const products = productsQuery.data?.items ?? [];
  const setProducts = useCallback((items: any[]) => {
    queryClient.setQueryData(['admin', 'products', 'all'], (current: any) => ({
      ...(current || {}),
      items,
      total: items.length,
    }));
  }, [queryClient]);
  const { setView, setSelectedProduct, setProducts: setShopProducts, addToast } = useShop();
  useEffect(() => {
    if (productsQuery.error) addToast('danger', `بارگذاری محصولات ناموفق بود: ${productsQuery.error.message}`);
  }, [addToast, productsQuery.error]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showLowStockPanel, setShowLowStockPanel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const getThreshold = (p: any) => p.lowStockThreshold || 5;
  const getStockStatus = (p: any): 'out' | 'critical' | 'low' | 'ok' => {
    const threshold = getThreshold(p);
    if (p.stock === 0) return 'out';
    if (p.stock <= threshold * 0.4) return 'critical';
    if (p.stock <= threshold) return 'low';
    return 'ok';
  };

  const filtered = products.filter(p => {
    if (catFilter && p.category !== catFilter) return false;
    if (search && !p.name.includes(search) && !p.brand.includes(search)) return false;
    if (stockFilter === 'low') { const s = getStockStatus(p); if (s !== 'low' && s !== 'critical') return false; }
    if (stockFilter === 'out' && p.stock !== 0) return false;
    if (stockFilter === 'ok' && getStockStatus(p) !== 'ok') return false;
    return true;
  });
  const active = products.filter(p => p.effective).length;
  const lowStockProducts = products.filter(p => { const s = getStockStatus(p); return s === 'low' || s === 'critical'; });
  const lowStock = lowStockProducts.length;
  const outOfStock = products.filter(p => p.stock === 0).length;
  const criticalStock = products.filter(p => getStockStatus(p) === 'critical').length;

  const saveProduct = async () => {
    try {
      const saved = editing.id
        ? await api.catalog.updateProduct(editing.id, editing)
        : await api.catalog.createProduct({ ...editing, id: `p-${Date.now()}` });
      const product = saved?.product || saved;
      const next = editing.id
        ? products.map((item) => item.id === product.id ? product : item)
        : [...products, product];
      setProducts(next);
      setShopProducts(next);
      log(`${editing.id ? 'ویرایش' : 'افزودن'} محصول ${product.name}`, product.id);
      addToast('success', 'محصول ذخیره شد');
      setShowForm(false);
      setEditing(null);
    } catch (error: any) {
      addToast('danger', `ذخیره محصول ناموفق بود: ${error.message}`);
    }
  };
  const deleteProduct = async (id: string) => {
    if (confirm('آیا از حذف این محصول مطمئن هستید؟')) {
      try {
        await api.catalog.deleteProduct(id);
        const next = products.filter((product) => product.id !== id);
        setProducts(next);
        setShopProducts(next);
        log('حذف محصول', id, 'warning');
        addToast('success', 'محصول حذف شد');
      } catch (error: any) {
        addToast('danger', `حذف محصول ناموفق بود: ${error.message}`);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (editing) setEditing({ ...editing, image: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { l: 'کل کالاها', v: faNum(products.length), c: 'bg-blue-50 text-blue-700', icon: <IconPackage className="w-5 h-5" /> },
          { l: 'فعال', v: faNum(active), c: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="w-5 h-5" /> },
          { l: 'کم‌موجود', v: faNum(lowStock), c: 'bg-amber-50 text-amber-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'بحرانی', v: faNum(criticalStock), c: 'bg-coral-50 text-coral-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'ناموجود', v: faNum(outOfStock), c: 'bg-gray-100 text-gray-700', icon: <IconX className="w-5 h-5" /> },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{s.l}</p>
              <div className={`${s.c} p-1.5 rounded-lg`}>{s.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Low Stock Alert Panel */}
      {lowStock > 0 && (
        <div className={`rounded-2xl border-2 ${lowStock > 5 ? 'border-coral-300 bg-coral-50' : 'border-amber-300 bg-amber-50'} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${lowStock > 5 ? 'bg-coral-500' : 'bg-amber-500'} p-2 rounded-lg`}>
                <IconAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`text-[13px] font-bold ${lowStock > 5 ? 'text-coral-700' : 'text-amber-700'}`}>هشدار موجودی کم</h3>
                <p className="text-[10px] text-cream-500">{faNum(lowStock)} محصول نیاز به شارژ مجدد دارند</p>
              </div>
            </div>
            <button onClick={() => setShowLowStockPanel(!showLowStockPanel)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${lowStock > 5 ? 'bg-coral-500 text-white' : 'bg-amber-500 text-white'}`}>
              {showLowStockPanel ? 'بستن' : 'مشاهده'}
            </button>
          </div>
          {showLowStockPanel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
              {lowStockProducts.slice(0, 9).map(p => {
                const status = getStockStatus(p);
                const threshold = getThreshold(p);
                const percentage = Math.min(100, (p.stock / threshold) * 100);
                return (
                  <div key={p.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-200 bg-white'} p-3 flex items-center gap-3`}>
                    <img src={p.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${status === 'critical' ? 'bg-coral-500' : 'bg-amber-500'}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className={`tnum text-[10px] font-bold ${status === 'critical' ? 'text-coral-600' : 'text-amber-600'}`}>{faNum(p.stock)}/{faNum(threshold)}</span>
                      </div>
                    </div>
                    <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600 flex-shrink-0">
                      <IconEdit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو محصول..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="">همه دسته‌ها</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value as any)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه وضعیت‌ها</option>
          <option value="low">کم‌موجود</option>
          <option value="out">ناموجود</option>
          <option value="ok">موجودی کافی</option>
        </select>
        <button onClick={() => { setEditing({ name: '', category: 'underwear', subcategory: 'briefs', brand: 'تای سیز', price: 0, discount: 0, rating: 0, image: '', book: [], colors: [], sizes: [], stock: 0, sales: 0, isNew: true, effective: true, description: '', features: [], specs: {}, sku: '', commission: 8, vendor: '', lowStockThreshold: 5 }); setShowForm(true); }} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1"><IconPlus className="w-4 h-4" />افزودن محصول</button>
      </div>

      {/* Products Table */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تصویر</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نام</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">برند</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">قیمت</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">موجودی</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت موجودی</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نمایش</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عملیات</th>
            </tr></thead>
            <tbody>{filtered.map(p => {
              const status = getStockStatus(p);
              const threshold = getThreshold(p);
              const percentage = Math.min(100, (p.stock / threshold) * 100);
              const statusConfig = {
                out: { label: 'ناموجود', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
                critical: { label: 'بحرانی', color: 'bg-coral-100 text-coral-700', dot: 'bg-coral-500' },
                low: { label: 'کم‌موجود', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
                ok: { label: 'موجود', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
              }[status];
              return (
              <tr key={p.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} ${status === 'critical' ? (darkMode ? 'bg-coral-950/20' : 'bg-coral-50/50') : status === 'low' ? (darkMode ? 'bg-amber-950/20' : 'bg-amber-50/30') : ''}`}>
                <td className="py-2 px-3"><img src={p.image} className="w-9 h-9 rounded-lg object-cover" alt="" /></td>
                <td className="py-2 px-3 font-bold">{p.name}</td>
                <td className="py-2 px-3">{p.brand}</td>
                <td className="py-2 px-3 tnum">{formatPrice(finalPrice(p.price, p.discount))}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className={`tnum font-bold ${status === 'critical' ? 'text-coral-600' : status === 'low' ? 'text-amber-600' : status === 'out' ? 'text-gray-500' : ''}`}>{faNum(p.stock)}</span>
                    <div className="w-16 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${status === 'critical' ? 'bg-coral-500' : status === 'low' ? 'bg-amber-500' : status === 'out' ? 'bg-gray-400' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="py-2 px-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                    {statusConfig.label}
                  </span>
                </td>
                <td className="py-2 px-3"><button onClick={async () => {
                  const updated = { ...p, effective: !p.effective };
                  try {
                    await api.catalog.updateProduct(p.id, updated);
                    const next = products.map((item) => item.id === p.id ? updated : item);
                    setProducts(next);
                    setShopProducts(next);
                    log(`${updated.effective ? 'فعال' : 'غیرفعال'} کردن محصول ${p.name}`, p.id);
                  } catch (error: any) {
                    addToast('danger', `تغییر وضعیت محصول ناموفق بود: ${error.message}`);
                  }
                }} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.effective ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{p.effective ? 'فعال' : 'غیرفعال'}</button></td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600"><IconEdit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-coral-50 text-coral-500"><IconTrash className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
      {showForm && editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>{editing.id ? 'ویرایش محصول' : 'افزودن محصول'}</h3>
            <div className="space-y-3">
              <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">نام محصول</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">دسته‌بندی</label><select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">برند</label><input value={editing.brand} onChange={e => setEditing({ ...editing, brand: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">قیمت (تومان)</label><input type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">تخفیف (٪)</label><input type="number" value={editing.discount} onChange={e => setEditing({ ...editing, discount: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">موجودی</label><input type="number" value={editing.stock} onChange={e => setEditing({ ...editing, stock: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
              </div>
              <div className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-amber-200 bg-amber-50'} p-3`}>
                <label className="text-[11px] font-bold text-amber-700 mb-1 flex items-center gap-1"><IconAlert className="w-3.5 h-3.5" /> حد هشدار موجودی</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={editing.lowStockThreshold || 5} onChange={e => setEditing({ ...editing, lowStockThreshold: +e.target.value })} className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] outline-none" min="1" />
                  <span className="text-[10px] text-amber-600">عدد</span>
                </div>
                <p className="text-[10px] text-cream-500 mt-1">وقتی موجودی به این عدد برسد، هشدار نمایش داده می‌شود</p>
              </div>
              <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">توضیحات</label><textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none h-20 resize-none" /></div>
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">تصویر محصول</label>
                <div className="flex items-center gap-3">
                  {editing.image && <img src={editing.image} className="w-16 h-16 rounded-xl object-cover" alt="" />}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <button onClick={() => fileRef.current?.click()} className="border border-cream-300 rounded-xl px-3 py-2 text-[11px] font-bold flex items-center gap-1 hover:border-brand-400"><IconUpload className="w-4 h-4" />آپلود تصویر</button>
                </div>
              </div>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={editing.isNew} onChange={e => setEditing({ ...editing, isNew: e.target.checked })} />جدید</label>
                <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={editing.effective} onChange={e => setEditing({ ...editing, effective: e.target.checked })} />فعال در سایت</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={saveProduct} className="flex-1 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px]">ذخیره</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-cream-300 text-[12px] font-bold">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Simplified Admin Sections ─────────── */
function AdminReports() {
  const { orders, darkMode, abandoned, searchTerms } = useAdmin();
  const { settings } = useShop();
  const [period, setPeriod] = useState<'7' | '14' | '30'>('14');
  const pl = computePL(orders, settings);
  const channels = channelStats(orders);
  const funnel = funnelStages(orders);
  const bn = bottleneck(funnel);
  
  const days = parseInt(period);
  const lastDays = Array.from({ length: days }, (_, i) => { 
    const d = new Date(); 
    d.setDate(d.getDate() - (days - 1 - i)); 
    const ds = d.toISOString().slice(0, 10); 
    const dayOrders = orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds && isPaidOrder(o));
    return { 
      day: faNum(d.getDate()), 
      date: ds,
      revenue: dayOrders.reduce((s: number, o: any) => s + collectedAmount(o), 0),
      orders: dayOrders.length,
      customers: new Set(dayOrders.map((o: any) => o.mobile)).size
    }; 
  });

  // محاسبه نرخ رشد
  const currentPeriodRevenue = lastDays.slice(-7).reduce((s, d) => s + d.revenue, 0);
  const previousPeriodRevenue = lastDays.slice(-14, -7).reduce((s, d) => s + d.revenue, 0);
  const growthRate = previousPeriodRevenue > 0 ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100) : 0;

  // تحلیل وضعیت سفارش‌ها
  const statusDistribution = [
    { name: 'تحویل شده', value: orders.filter((o: any) => o.status === 'delivered').length, color: '#10b981' },
    { name: 'در حال ارسال', value: orders.filter((o: any) => o.status === 'shipped').length, color: '#3b82f6' },
    { name: 'در حال پردازش', value: orders.filter((o: any) => o.status === 'processing').length, color: '#f59e0b' },
    { name: 'در انتظار', value: orders.filter((o: any) => o.status === 'pending').length, color: '#8b5cf6' },
    { name: 'لغو شده', value: orders.filter((o: any) => o.status === 'cancelled').length, color: '#ef4444' },
  ].filter(s => s.value > 0);

  // سبدهای رها شده
  const abandonedValue = abandoned.reduce((s: number, a: any) => s + a.value, 0);
  const recoveredCount = abandoned.filter((a: any) => a.recovered).length;
  const recoveryRate = abandoned.length > 0 ? (recoveredCount / abandoned.length * 100) : 0;

  const channelColors = ['#1A2238', '#F5C518', '#E34A4A', '#10b981', '#8b5cf6'];

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">گزارش سود و زیان برآوردی است: بهای تمام‌شده و برخی هزینه‌ها بر اساس فرض‌های ثابت محاسبه می‌شوند. برای گزارش حسابداری، دادهٔ بهای خرید و هزینه‌های واقعی باید ثبت و دسته‌بندی شوند.</p>
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>گزارش‌ها و تحلیل</h2>
        <div className="flex gap-2">
          {[{ k: '7', l: '۷ روز' }, { k: '14', l: '۱۴ روز' }, { k: '30', l: '۳۰ روز' }].map(p => (
            <button key={p.k} onClick={() => setPeriod(p.k as any)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${period === p.k ? 'bg-brand-900 text-white shadow-lg shadow-brand-900/25' : darkMode ? 'bg-white/5 text-brand-300' : 'bg-cream-100 text-brand-700'}`}>{p.l}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards with Growth */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'درآمد ناخالص', v: formatPrice(pl.grossSales), c: 'bg-blue-50 text-blue-700', icon: <IconDollar className="w-5 h-5" />, growth: growthRate },
          { l: 'سود خالص برآوردی', v: formatPrice(pl.netProfit), c: 'bg-emerald-50 text-emerald-700', icon: <IconTrending className="w-5 h-5" />, growth: 0 },
          { l: 'حاشیه سود', v: `${faNum(pl.margin)}٪`, c: 'bg-purple-50 text-purple-700', icon: <IconChart className="w-5 h-5" />, growth: 0 },
          { l: 'میانگین سفارش', v: formatPrice(orders.length ? pl.netRevenue / orders.length : 0), c: 'bg-amber-50 text-amber-700', icon: <IconCart className="w-5 h-5" />, growth: 0 },
        ].map((k, i) => (
          <div key={i} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 hover:shadow-lg transition-all`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={`${k.c} p-1.5 rounded-lg`}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
            {k.growth !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${k.growth > 0 ? 'text-emerald-600' : 'text-coral-600'}`}>
                <IconTrending className="w-3 h-3" />
                <span className="tnum">{faNum(Math.abs(k.growth).toFixed(1))}٪</span>
                <span>نسبت به دوره قبل</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Revenue & Profit Chart */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>روند فروش پرداخت‌شده</h3>
            <p className="text-[10px] text-cream-500 mt-0.5">{faNum(days)} روز اخیر</p>
          </div>
          <div className="flex gap-3 text-[10px]">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-brand-900"></div><span>درآمد</span></div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={lastDays}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1A2238" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#1A2238" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
            <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} tickFormatter={(v) => formatPrice(v / 1000000) + 'M'} />
            <Tooltip 
              contentStyle={{ 
                background: '#1A2238',
                border: '2px solid #F5C518',
                borderRadius: 12,
                padding: '10px 14px',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: '600',
                fontFamily: 'Vazirmatn',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                direction: 'rtl'
              }}
              itemStyle={{ color: '#ffffff' }}
              labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
              formatter={(value: any) => [formatPrice(value) + ' تومان', '']}
            />
            <Area type="monotone" dataKey="revenue" fill="url(#colorRevenue)" stroke="#1A2238" strokeWidth={2} name="درآمد" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Channel Analysis */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>تحلیل کانال‌های جذب</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channels} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={false}>
                    {channels.map((_, i) => <Cell key={i} fill={channelColors[i % channelColors.length]} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1A2238',
                      border: '2px solid #F5C518',
                      borderRadius: 12,
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: '600',
                      fontFamily: 'Vazirmatn',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      direction: 'rtl'
                    }}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
                    formatter={(value: any, name: any, props: any) => {
                      return [formatPrice(value) + ' تومان', props.payload.name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {channels.map((ch, i) => {
                const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);
                const percentage = totalRevenue > 0 ? ((ch.revenue / totalRevenue) * 100).toFixed(1) : '0';
                const aov = ch.orders > 0 ? ch.revenue / ch.orders : 0;
                return (
                  <div key={i} className={`rounded-xl p-3 ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} hover:shadow-md transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: channelColors[i % channelColors.length] }}>
                        <span className="text-white font-bold text-sm">{faNum(i + 1)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[12px] font-bold truncate">{ch.name}</p>
                          <span className="tnum text-[11px] font-extrabold" style={{ color: channelColors[i % channelColors.length] }}>{faNum(percentage)}٪</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-cream-500">
                          <span className="tnum">{faNum(ch.orders)} سفارش</span>
                          <span className="tnum">AOV: {formatPrice(aov)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: channelColors[i % channelColors.length] }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>توزیع وضعیت سفارش‌ها</h3>
              <p className="text-[10px] text-cream-500 mt-0.5">مجموع: {faNum(orders.length)} سفارش</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {statusDistribution.map((entry, i) => (
                      <linearGradient key={i} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={entry.color} stopOpacity={1}/>
                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.7}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie 
                    data={statusDistribution} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={50} 
                    outerRadius={80} 
                    paddingAngle={3}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}٪`}
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, i) => <Cell key={i} fill={`url(#gradient-${i})`} stroke={entry.color} strokeWidth={2} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1A2238',
                      border: '2px solid #F5C518',
                      borderRadius: 12,
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: '600',
                      fontFamily: 'Vazirmatn',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      direction: 'rtl'
                    }}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
                    formatter={(value: any, name: any) => {
                      return [faNum(value) + ' سفارش', name];
                    }}
                  />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-brand-900 dark:fill-white" style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {faNum(orders.length)}
                  </text>
                  <text x="50%" y="50%" dy="20" textAnchor="middle" className="fill-cream-500" style={{ fontSize: '10px' }}>
                    سفارش
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {statusDistribution.map((status, i) => {
                const percentage = orders.length > 0 ? ((status.value / orders.length) * 100).toFixed(1) : '0';
                return (
                  <div key={i} className={`rounded-xl p-2.5 ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} hover:shadow-md transition-all`}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: status.color }}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold truncate">{status.name}</p>
                      </div>
                      <div className="text-left">
                        <p className="tnum text-[12px] font-extrabold" style={{ color: status.color }}>{faNum(status.value)}</p>
                        <p className="tnum text-[9px] text-cream-500">{faNum(percentage)}٪</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>قیف تبدیل خرید</h3>
            <p className="text-[10px] text-cream-500 mt-0.5">نیازمند ثبت رویدادهای بازدید و سبد خرید</p>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold ${darkMode ? 'bg-coral-900/30 text-coral-300' : 'bg-coral-50 text-coral-700'}`}>
            {bn ? `گلوگاه: ${bn}` : 'دادهٔ قیف موجود نیست'}
          </div>
        </div>
        <div className="space-y-3">
          {funnel.length === 0 && <p className="py-6 text-center text-[11px] text-cream-500">آمار بازدید، افزودن به سبد و پرداخت هنوز جمع‌آوری نمی‌شود؛ برای جلوگیری از نمایش تخمین ساختگی، قیف خالی است.</p>}
          {funnel.map((f, i) => {
            const width = (f.rate / 100) * 100;
            const colors = ['bg-brand-900', 'bg-blue-600', 'bg-purple-600', 'bg-emerald-600'];
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold">{f.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="tnum text-[11px] font-bold">{faNum(f.count)}</span>
                    <span className="tnum text-[10px] text-cream-500">({faNum(f.rate)}٪)</span>
                  </div>
                </div>
                <div className="relative h-8 bg-cream-100 rounded-lg overflow-hidden">
                  <div className={`absolute inset-y-0 right-0 ${colors[i % colors.length]} rounded-lg transition-all duration-500 flex items-center justify-end px-3`} style={{ width: `${width}%` }}>
                    {width > 20 && <span className="text-white text-[10px] font-bold tnum">{faNum(f.rate)}٪</span>}
                  </div>
                </div>
                {i < funnel.length - 1 && (
                  <div className="flex items-center justify-center my-1">
                    <IconChevronDown className="w-4 h-4 text-cream-400" />
                    <span className="text-[9px] text-cream-500 mx-1">نرخ تبدیل: {faNum(funnel[i + 1].rate)}٪</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Abandoned Carts & Search Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Abandoned Carts */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>سبدهای خرید رها شده</h3>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${darkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
              {faNum(abandoned.length)} سبد
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3 text-center`}>
              <p className="text-[10px] text-cream-500">ارزش در خطر</p>
              <p className="tnum text-[13px] font-extrabold text-amber-700">{formatPrice(abandonedValue)}</p>
            </div>
            <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3 text-center`}>
              <p className="text-[10px] text-cream-500">بازیابی شده</p>
              <p className="tnum text-[13px] font-extrabold text-emerald-700">{faNum(recoveredCount)}</p>
            </div>
            <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3 text-center`}>
              <p className="text-[10px] text-cream-500">نرخ بازیابی</p>
              <p className="tnum text-[13px] font-extrabold text-brand-900">{faNum(recoveryRate.toFixed(1))}٪</p>
            </div>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {abandoned.slice(0, 5).map((a: any) => (
              <div key={a.id} className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'}`}>
                <div>
                  <p className="text-[11px] font-bold">{a.customer}</p>
                  <p className="text-[9px] text-cream-500">{faNum(a.items)} قلم | {dayLabel(new Date(a.date))}</p>
                </div>
                <span className="tnum text-[11px] font-bold">{formatPrice(a.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Search Terms */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>پرجستجوترین عبارات</h3>
          <div className="flex flex-wrap gap-2">
            {searchTerms.slice(0, 12).map((t: any, i: number) => {
              const size = Math.max(10, 14 - i);
              return (
                <span key={i} className={`px-3 py-1.5 rounded-full font-bold transition-all hover:scale-105 ${t.trending ? 'bg-brand-900 text-white shadow-lg shadow-brand-900/25' : darkMode ? 'bg-white/10 text-brand-300' : 'bg-cream-100 text-brand-700'}`} style={{ fontSize: `${size}px` }}>
                  {t.term}
                  <span className="tnum opacity-70 ms-1 text-[9px]">({faNum(t.count)})</span>
                </span>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-cream-200">
            <p className="text-[10px] text-cream-500 mb-2">پیشنهاد بر اساس جستجوها:</p>
            <div className="flex flex-wrap gap-1">
              {searchTerms.filter((t: any) => t.trending).slice(0, 3).map((t: any, i: number) => (
                <span key={i} className="text-[9px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-bold">{t.term}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Orders Chart */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>تعداد سفارش‌های روزانه</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={lastDays}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
            <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
            <Tooltip 
              contentStyle={{ 
                background: '#1A2238',
                border: '2px solid #F5C518',
                borderRadius: 12,
                padding: '10px 14px',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: '600',
                fontFamily: 'Vazirmatn',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                direction: 'rtl'
              }}
              itemStyle={{ color: '#ffffff' }}
              labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
            />
            <Bar dataKey="orders" fill="#1A2238" radius={[8, 8, 0, 0]} name="تعداد سفارش" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AdminInvoices() {
  const { orders, invoices, setInvoices, darkMode, log } = useAdmin();
  const { settings, addToast } = useShop();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = invoices.filter((inv: any) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (search && !inv.number.includes(search) && !inv.customer.includes(search)) return false;
    return true;
  });

  const settleInvoice = async (invoice: any) => {
    const paymentReference = window.prompt('شماره پیگیری درگاه یا رسید بانکی را وارد کنید:');
    if (!paymentReference?.trim()) return;
    try {
      const saved = await api.finance.invoices.update(invoice.id, {
        ...invoice, status: 'paid', paymentReference: paymentReference.trim(),
      });
      setInvoices(invoices.map((item: any) => item.id === saved.id ? saved : item));
      setSelectedInvoice((current: any) => current?.id === saved.id ? saved : current);
      log(`ثبت تسویه فاکتور ${saved.number}`, saved.id);
      addToast('success', 'تسویه فاکتور با مرجع پرداخت ثبت شد');
    } catch (error: any) {
      addToast('danger', `ثبت تسویه ناموفق بود: ${error.message}`);
    }
  };

  const printInvoice = (inv: any) => {
    const order = orders.find((o: any) => o.id === inv.orderId);
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8">
<title>فاکتور ${inv.number}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Vazirmatn', Tahoma, sans-serif; direction: rtl; background: #fff; color: #1A2238; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1A2238; padding-bottom: 20px; margin-bottom: 30px; }
  .logo-section { flex: 1; }
  .logo { font-size: 32px; font-weight: bold; color: #1A2238; margin-bottom: 8px; }
  .store-info { font-size: 11px; color: #666; line-height: 1.8; }
  .invoice-info { text-align: left; }
  .invoice-title { font-size: 24px; font-weight: bold; color: #1A2238; margin-bottom: 10px; }
  .invoice-number { font-size: 14px; color: #666; margin-bottom: 5px; }
  .invoice-date { font-size: 12px; color: #666; }
  .customer-section { background: #f9f6eb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
  .customer-title { font-size: 13px; font-weight: bold; color: #1A2238; margin-bottom: 12px; }
  .customer-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; }
  .customer-info div { display: flex; gap: 8px; }
  .customer-info strong { color: #1A2238; min-width: 80px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  thead { background: linear-gradient(135deg, #1A2238 0%, #2d4a85 100%); color: white; }
  th { padding: 12px 8px; text-align: right; font-size: 11px; font-weight: bold; }
  td { padding: 10px 8px; border-bottom: 1px solid #e8e1cc; font-size: 12px; text-align: right; }
  tbody tr:nth-child(even) { background: #f9f6eb; }
  .text-left { text-align: left; }
  .totals { margin-top: 20px; }
  .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #e8e1cc; }
  .total-row.final { font-size: 16px; font-weight: bold; color: #1A2238; border-top: 2px solid #1A2238; border-bottom: none; margin-top: 10px; padding-top: 15px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #1A2238; text-align: center; font-size: 11px; color: #666; line-height: 1.8; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: bold; }
  .badge-paid { background: #d1fae5; color: #065f46; }
  .badge-pending { background: #fef3c7; color: #92400e; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <div class="logo">فروشگاه اینترنتی پوشاک تای سیز</div>
      <div class="store-info">
        <div>تلفن: ${settings.phone}</div>
        <div>ایمیل: ${settings.email}</div>
        <div>آدرس: ${settings.address}</div>
      </div>
    </div>
    <div class="invoice-info">
      <div class="invoice-title">فاکتور فروش</div>
      <div class="invoice-number">شماره فاکتور: ${inv.number}</div>
      <div class="invoice-date">تاریخ: ${faDateFull(new Date(inv.date))}</div>
      <div style="margin-top: 8px;"><span class="badge ${inv.status === 'paid' ? 'badge-paid' : 'badge-pending'}">${inv.status === 'paid' ? 'پرداخت شده' : 'در انتظار پرداخت'}</span></div>
    </div>
  </div>

  <div class="customer-section">
    <div class="customer-title">مشخصات مشتری</div>
    <div class="customer-info">
      <div><strong>نام:</strong> <span>${inv.customer}</span></div>
      <div><strong>موبایل:</strong> <span>${order?.mobile || '-'}</span></div>
      <div><strong>شهر:</strong> <span>${order?.city || '-'}</span></div>
      <div><strong>آدرس:</strong> <span>${order?.address || '-'}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>ردیف</th>
        <th>شرح کالا</th>
        <th>تعداد</th>
        <th>قیمت واحد (تومان)</th>
        <th>تخفیف (٪)</th>
        <th>قیمت نهایی (تومان)</th>
      </tr>
    </thead>
    <tbody>
      ${order?.items?.map((item: any, idx: number) => {
        const finalPrice = item.price * (1 - item.discount / 100);
        const totalPrice = finalPrice * item.qty;
        return `
          <tr>
            <td>${faNum(idx + 1)}</td>
            <td>${item.name}</td>
            <td class="text-left">${faNum(item.qty)}</td>
            <td class="text-left">${formatPrice(item.price)}</td>
            <td class="text-left">${faNum(item.discount)}٪</td>
            <td class="text-left">${formatPrice(totalPrice)}</td>
          </tr>
        `;
      }).join('') || ''}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>جمع کل کالاها:</span>
      <span>${formatPrice(order?.subtotal || 0)} تومان</span>
    </div>
    <div class="total-row">
      <span>تخفیف:</span>
      <span>${formatPrice(order?.discountAmount || 0)} تومان</span>
    </div>
    <div class="total-row">
      <span>هزینه ارسال:</span>
      <span>${formatPrice(order?.shipping || 0)} تومان</span>
    </div>
    <div class="total-row">
      <span>مالیات و عوارض:</span>
      <span>${formatPrice(order?.tax || 0)} تومان</span>
    </div>
    <div class="total-row final">
      <span>مبلغ قابل پرداخت:</span>
      <span>${formatPrice(order?.total || 0)} تومان</span>
    </div>
  </div>

  <div class="footer">
    <div>از خرید شما متشکریم | فروشگاه اینترنتی پوشاک تای سیز</div>
    <div>این فاکتور معتبر و مورد تأیید می‌باشد</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    log(`چاپ فاکتور ${inv.number}`, inv.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو شماره فاکتور یا نام مشتری..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه وضعیت‌ها</option>
          <option value="paid">پرداخت شده</option>
          <option value="pending">در انتظار</option>
        </select>
      </div>

      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">شماره فاکتور</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مشتری</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مبلغ</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تاریخ</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv: any) => (
                <tr key={inv.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                  <td className="py-2.5 px-3 font-bold">{inv.number}</td>
                  <td className="py-2.5 px-3">{inv.customer}</td>
                  <td className="py-2.5 px-3 tnum">{formatPrice(inv.amount)}</td>
                  <td className="py-2.5 px-3 text-[11px] text-cream-500">{dayLabel(new Date(inv.date))}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-600' : 'bg-amber-600'}`}></span>
                      {inv.status === 'paid' ? 'پرداخت شده' : 'در انتظار'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      <button onClick={() => setSelectedInvoice(inv)} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600" title="مشاهده">
                        <IconEye className="w-4 h-4" />
                      </button>
                      <button onClick={() => printInvoice(inv)} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600" title="چاپ">
                        <IconPrint className="w-4 h-4" />
                      </button>
                      {inv.status !== 'paid' && (
                        <button onClick={() => settleInvoice(inv)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="ثبت تسویه با مرجع پرداخت">
                          <IconCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>فاکتور {selectedInvoice.number}</h3>
              <button onClick={() => setSelectedInvoice(null)}><IconX className="w-5 h-5" /></button>
            </div>
            <InvoicePreview invoice={selectedInvoice} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => printInvoice(selectedInvoice)} className="flex-1 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-2">
                <IconPrint className="w-4 h-4" /> چاپ فاکتور
              </button>
              {selectedInvoice.status !== 'paid' && (
                <button onClick={() => settleInvoice(selectedInvoice)} className="px-4 py-2.5 rounded-xl border border-cream-300 text-[12px] font-bold">
                  ثبت تسویه فاکتور
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoicePreview({ invoice }: { invoice: any }) {
  const { orders } = useAdmin();
  const { settings } = useShop();
  const order = orders.find((o: any) => o.id === invoice.orderId);

  return (
    <div className="border border-cream-300 rounded-xl p-6 bg-white">
      <div className="flex justify-between items-start border-b-2 border-brand-900 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-brand-900 mb-2">فروشگاه اینترنتی پوشاک تای سیز</h2>
          <div className="text-[11px] text-cream-500 space-y-1">
            <p>تلفن: {settings.phone}</p>
            <p>ایمیل: {settings.email}</p>
            <p>آدرس: {settings.address}</p>
          </div>
        </div>
        <div className="text-left">
          <h3 className="text-lg font-bold text-brand-900 mb-2">فاکتور فروش</h3>
          <p className="text-[12px] text-cream-500">شماره: {invoice.number}</p>
          <p className="text-[12px] text-cream-500">تاریخ: {faDateFull(new Date(invoice.date))}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {invoice.status === 'paid' ? 'پرداخت شده' : 'در انتظار پرداخت'}
          </span>
        </div>
      </div>

      <div className="bg-cream-50 rounded-xl p-4 mb-6">
        <h4 className="text-[12px] font-bold text-brand-900 mb-2">مشخصات مشتری</h4>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div><span className="text-cream-500">نام: </span>{invoice.customer}</div>
          <div><span className="text-cream-500">موبایل: </span>{order?.mobile || '-'}</div>
          <div><span className="text-cream-500">شهر: </span>{order?.city || '-'}</div>
          <div><span className="text-cream-500">آدرس: </span>{order?.address || '-'}</div>
        </div>
      </div>

      <table className="w-full text-[11px] mb-6">
        <thead>
          <tr className="bg-brand-900 text-white">
            <th className="py-2 px-2 text-right">ردیف</th>
            <th className="py-2 px-2 text-right">شرح کالا</th>
            <th className="py-2 px-2 text-right">تعداد</th>
            <th className="py-2 px-2 text-right">قیمت واحد</th>
            <th className="py-2 px-2 text-right">تخفیف</th>
            <th className="py-2 px-2 text-right">قیمت نهایی</th>
          </tr>
        </thead>
        <tbody>
          {order?.items?.map((item: any, idx: number) => {
            const finalPrice = item.price * (1 - item.discount / 100);
            const totalPrice = finalPrice * item.qty;
            return (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-cream-50' : 'bg-white'}>
                <td className="py-2 px-2">{faNum(idx + 1)}</td>
                <td className="py-2 px-2">{item.name}</td>
                <td className="py-2 px-2 tnum">{faNum(item.qty)}</td>
                <td className="py-2 px-2 tnum">{formatPrice(item.price)}</td>
                <td className="py-2 px-2 tnum">{faNum(item.discount)}٪</td>
                <td className="py-2 px-2 tnum font-bold">{formatPrice(totalPrice)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="space-y-2 text-[12px]">
        <div className="flex justify-between py-1 border-b border-cream-200">
          <span>جمع کل:</span>
          <span className="tnum">{formatPrice(order?.subtotal || 0)} تومان</span>
        </div>
        <div className="flex justify-between py-1 border-b border-cream-200">
          <span>تخفیف:</span>
          <span className="tnum text-coral-600">-{formatPrice(order?.discountAmount || 0)} تومان</span>
        </div>
        <div className="flex justify-between py-1 border-b border-cream-200">
          <span>هزینه ارسال:</span>
          <span className="tnum">{formatPrice(order?.shipping || 0)} تومان</span>
        </div>
        <div className="flex justify-between py-1 border-b border-cream-200">
          <span>مالیات و عوارض:</span>
          <span className="tnum">{formatPrice(order?.tax || 0)} تومان</span>
        </div>
        <div className="flex justify-between py-2 font-bold text-[14px] text-brand-900 border-t-2 border-brand-900 mt-2">
          <span>مبلغ قابل پرداخت:</span>
          <span className="tnum">{formatPrice(order?.total || 0)} تومان</span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t-2 border-brand-900 text-center text-[11px] text-cream-500">
        <p>از خرید شما متشکریم | فروشگاه اینترنتی پوشاک تای سیز</p>
      </div>
    </div>
  );
}

function AdminFinance() {
  const { orders, invoices, setInvoices, expenses, setExpenses, bankTx, darkMode, log } = useAdmin();
  const { settings } = useShop();
  const pl = computePL(orders, settings);
  const [tab, setTab] = useState<'overview' | 'invoices' | 'expenses' | 'cashflow' | 'bank' | 'metrics'>('overview');
  const [showExpense, setShowExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: '', category: 'سایر', amount: 0, note: '' });
  const [expenseFilter, setExpenseFilter] = useState('all');
  const cf = cashflowForecast(orders);

  // محاسبه شاخص‌های مالی
  const totalExpenses = expenses.reduce((s: number, e: any) => s + e.amount, 0);
  const totalBankIn = bankTx.filter((t: any) => t.type === 'in').reduce((s: number, t: any) => s + t.amount, 0);
  const totalBankOut = bankTx.filter((t: any) => t.type === 'out').reduce((s: number, t: any) => s + t.amount, 0);
  const netCashFlow = totalBankIn - totalBankOut;
  const grossMargin = pl.grossSales > 0 ? (pl.grossProfit / pl.grossSales * 100) : 0;
  const netMargin = pl.netRevenue > 0 ? (pl.netProfit / pl.netRevenue * 100) : 0;
  const expenseRatio = pl.netRevenue > 0 ? (totalExpenses / pl.netRevenue * 100) : 0;

  // دسته‌بندی هزینه‌ها
  const expenseByCategory = expenses.reduce((acc: any, e: any) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const filteredExpenses = expenseFilter === 'all' ? expenses : expenses.filter((e: any) => e.category === expenseFilter);

  const exportPL = () => { 
    const data = [
      { 'عنوان': 'یادداشت', 'مبلغ (تومان)': 'بهای تمام‌شده و برخی هزینه‌ها برآوردی هستند؛ خروجی حسابداری نیست' },
      { 'عنوان': 'فروش ناخالص', 'مبلغ (تومان)': pl.grossSales },
      { 'عنوان': 'تخفیفات', 'مبلغ (تومان)': -pl.discounts },
      { 'عنوان': 'بازپرداخت مرجوعی', 'مبلغ (تومان)': -pl.refunds },
      { 'عنوان': 'درآمد خالص', 'مبلغ (تومان)': pl.netRevenue },
      { 'عنوان': 'بهای تمام‌شده', 'مبلغ (تومان)': -pl.cogs },
      { 'عنوان': 'سود ناخالص', 'مبلغ (تومان)': pl.grossProfit },
      { 'عنوان': 'کارمزد درگاه', 'مبلغ (تومان)': -pl.gatewayFee },
      { 'عنوان': 'هزینه ارسال', 'مبلغ (تومان)': -pl.shippingCost },
      { 'عنوان': 'هزینه بسته‌بندی', 'مبلغ (تومان)': -pl.packagingCost },
      { 'عنوان': 'هزینه‌های جاری', 'مبلغ (تومان)': -pl.operatingCosts },
      { 'عنوان': 'سود خالص', 'مبلغ (تومان)': pl.netProfit },
    ];
    downloadFile(toExcel(data, 'صورت سود و زیان'), 'profit-loss.xls', 'application/vnd.ms-excel'); 
  };

  const tooltipStyle: any = { 
    background: '#1A2238',
    border: '2px solid #F5C518',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    direction: 'rtl' as const
  };

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">سود و حاشیهٔ سود در این بخش برآوردی است و نباید مبنای گزارش حسابداری یا تصمیم پرداخت قرار گیرد. هزینه‌های واقعی ثبت‌شده و تراکنش‌های بانکی در زبانه‌های جداگانه قابل مشاهده‌اند.</p>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'درآمد خالص ثبت‌شده', v: formatPrice(pl.netRevenue), c: 'bg-blue-50 text-blue-700', icon: <IconDollar className="w-5 h-5" /> },
          { l: 'سود خالص برآوردی', v: formatPrice(pl.netProfit), c: 'bg-emerald-50 text-emerald-700', icon: <IconTrending className="w-5 h-5" /> },
          { l: 'جریان نقدی ثبت‌شده', v: formatPrice(netCashFlow), c: netCashFlow >= 0 ? 'bg-green-50 text-green-700' : 'bg-coral-50 text-coral-700', icon: <IconChart className="w-5 h-5" /> },
          { l: 'حاشیه سود برآوردی', v: `${faNum(netMargin.toFixed(1))}٪`, c: 'bg-purple-50 text-purple-700', icon: <IconStar className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 hover:shadow-lg transition-all`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={`${k.c} p-1.5 rounded-lg`}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[
          { k: 'overview', l: 'صورت سود و زیان', icon: <IconChart className="w-4 h-4" /> },
          { k: 'metrics', l: 'شاخص‌های مالی', icon: <IconStar className="w-4 h-4" /> },
          { k: 'cashflow', l: 'جریان نقدی', icon: <IconTrending className="w-4 h-4" /> },
          { k: 'expenses', l: 'هزینه‌ها', icon: <IconDollar className="w-4 h-4" /> },
          { k: 'invoices', l: 'فاکتورها', icon: <IconClipboard className="w-4 h-4" /> },
          { k: 'bank', l: 'تراکنش‌های بانکی', icon: <IconDollar className="w-4 h-4" /> }
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 flex items-center gap-1.5 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>
            {t.icon}{t.l}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>صورت سود و زیان</h3>
                <p className="text-[10px] text-cream-500 mt-0.5">تحلیل کامل درآمد و هزینه‌ها</p>
              </div>
              <button onClick={exportPL} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-900 text-white text-[11px] font-bold shadow-lg shadow-brand-900/25"><IconDownload className="w-3.5 h-3.5" />خروجی اکسل</button>
            </div>
            
            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side - P&L Statement */}
              <div className="space-y-1">
                {[
                  { l: 'فروش ناخالص', v: pl.grossSales, type: 'income' },
                  { l: 'تخفیفات', v: -pl.discounts, type: 'deduction' },
                  { l: 'بازپرداخت‌های مرجوعی', v: -pl.refunds, type: 'deduction' },
                  { l: 'درآمد خالص', v: pl.netRevenue, type: 'subtotal' },
                  { l: 'بهای تمام‌شده کالا', v: -pl.cogs, type: 'deduction' },
                  { l: 'سود ناخالص', v: pl.grossProfit, type: 'subtotal' },
                  { l: 'کارمزد درگاه پرداخت', v: -pl.gatewayFee, type: 'expense' },
                  { l: 'هزینه ارسال', v: -pl.shippingCost, type: 'expense' },
                  { l: 'هزینه بسته‌بندی', v: -pl.packagingCost, type: 'expense' },
                  { l: 'هزینه‌های جاری', v: -pl.operatingCosts, type: 'expense' },
                  { l: 'سود خالص', v: pl.netProfit, type: 'total' },
                ].map((r, i) => (
                  <div key={i} className={`flex justify-between items-center py-2 px-3 rounded-lg ${
                    r.type === 'total' ? 'bg-emerald-50 border-2 border-emerald-200' :
                    r.type === 'subtotal' ? 'bg-blue-50 border border-blue-200' :
                    r.type === 'deduction' ? 'bg-coral-50/50' :
                    r.type === 'expense' ? 'bg-amber-50/50' : ''
                  }`}>
                    <span className={`text-[12px] ${r.type === 'total' ? 'font-extrabold text-emerald-700' : r.type === 'subtotal' ? 'font-bold text-blue-700' : 'text-brand-700'}`}>{r.l}</span>
                    <span className={`tnum text-[13px] ${
                      r.type === 'total' ? 'font-extrabold text-emerald-700' :
                      r.type === 'subtotal' ? 'font-bold text-blue-700' :
                      r.v < 0 ? 'text-coral-600' : 'text-brand-900'
                    }`}>
                      {r.v < 0 ? '-' : ''}{formatPrice(Math.abs(r.v))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Right Side - Visual Charts */}
              <div className="space-y-4">
                {/* Revenue vs Costs Chart */}
                <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-4`}>
                  <h4 className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>نسبت درآمد به هزینه</h4>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'سود خالص', value: Math.max(0, pl.netProfit), color: '#10b981' },
                            { name: 'هزینه‌ها', value: pl.cogs + pl.gatewayFee + pl.shippingCost + pl.packagingCost + pl.operatingCosts, color: '#ef4444' }
                          ]}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={2}
                        >
                          {[
                            { name: 'سود خالص', value: Math.max(0, pl.netProfit), color: '#10b981' },
                            { name: 'هزینه‌ها', value: pl.cogs + pl.gatewayFee + pl.shippingCost + pl.packagingCost + pl.operatingCosts, color: '#ef4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={tooltipStyle}
                          itemStyle={{ color: '#ffffff' }}
                          labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
                          formatter={(value: any) => [formatPrice(value) + ' تومان', '']}
                        />
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-brand-900 dark:fill-white" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                          {faNum(netMargin.toFixed(0))}٪
                        </text>
                        <text x="50%" y="50%" dy="18" textAnchor="middle" className="fill-cream-500" style={{ fontSize: '9px' }}>
                          حاشیه سود
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3`}>
                    <p className="text-[10px] text-cream-500 mb-1">حاشیه سود ناخالص</p>
                    <p className="text-[16px] font-extrabold text-blue-700 tnum">{faNum(grossMargin.toFixed(1))}٪</p>
                    <div className="mt-2 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${grossMargin}%` }}></div>
                    </div>
                  </div>
                  <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3`}>
                    <p className="text-[10px] text-cream-500 mb-1">نسبت هزینه به درآمد</p>
                    <p className="text-[16px] font-extrabold text-amber-700 tnum">{faNum(expenseRatio.toFixed(1))}٪</p>
                    <div className="mt-2 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, expenseRatio)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'metrics' && (
        <div className="space-y-4">
          {/* Financial Ratios */}
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>شاخص‌های مالی کلیدی</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { l: 'حاشیه سود ناخالص', v: `${faNum(grossMargin.toFixed(1))}٪`, desc: 'سود ناخالص / فروش ناخالص', color: 'text-blue-700', bg: 'bg-blue-50' },
                { l: 'حاشیه سود خالص', v: `${faNum(netMargin.toFixed(1))}٪`, desc: 'سود خالص / درآمد خالص', color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { l: 'نسبت هزینه به درآمد', v: `${faNum(expenseRatio.toFixed(1))}٪`, desc: 'هزینه‌ها / درآمد خالص', color: 'text-amber-700', bg: 'bg-amber-50' },
                { l: 'میانگین ارزش سفارش', v: formatPrice(orders.length ? pl.netRevenue / orders.length : 0), desc: 'درآمد خالص / تعداد سفارش', color: 'text-purple-700', bg: 'bg-purple-50' },
              ].map((m, i) => (
                <div key={i} className={`rounded-xl ${m.bg} p-4`}>
                  <p className="text-[11px] text-cream-500 mb-2">{m.l}</p>
                  <p className={`text-[20px] font-extrabold ${m.color} tnum mb-1`}>{m.v}</p>
                  <p className="text-[9px] text-cream-500">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>ترکیب هزینه‌ها</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(expenseByCategory).map(([name, value]) => ({ name, value: value as number }))}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}٪)`}
                    >
                      {Object.entries(expenseByCategory).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#1A2238', '#F5C518', '#E34A4A', '#10b981', '#8b5cf6', '#f59e0b'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: '#ffffff' }}
                      labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
                      formatter={(value: any) => [formatPrice(value) + ' تومان', '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>جزئیات هزینه‌ها</h3>
              <div className="space-y-2">
                {Object.entries(expenseByCategory).map(([category, amount], i) => {
                  const percentage = totalExpenses > 0 ? ((amount as number / totalExpenses) * 100) : 0;
                  return (
                    <div key={i} className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-bold">{category}</span>
                        <span className="tnum text-[12px] font-bold">{formatPrice(amount as number)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-cream-200 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-900 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="tnum text-[10px] text-cream-500 w-10">{faNum(percentage.toFixed(1))}٪</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 'invoices' && <AdminInvoices />}
      {tab === 'expenses' && (
        <div className="space-y-4">
          {/* Expense Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">کل هزینه‌ها</p>
              <p className="text-lg font-extrabold tnum text-coral-700">{formatPrice(totalExpenses)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">تعداد هزینه‌ها</p>
              <p className="text-lg font-extrabold tnum">{faNum(expenses.length)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">میانگین هزینه</p>
              <p className="text-lg font-extrabold tnum">{formatPrice(expenses.length ? totalExpenses / expenses.length : 0)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">بیشترین دسته</p>
              <p className="text-sm font-extrabold">{(Object.entries(expenseByCategory) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowExpense(true)} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1 shadow-lg shadow-brand-900/25"><IconPlus className="w-4 h-4" />ثبت هزینه جدید</button>
            <select value={expenseFilter} onChange={e => setExpenseFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
              <option value="all">همه دسته‌ها</option>
              {Object.keys(expenseByCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Expenses Table */}
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عنوان</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">دسته‌بندی</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مبلغ</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تاریخ</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">یادداشت</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e: any) => (
                    <tr key={e.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                      <td className="py-2.5 px-3 font-bold">{e.title}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cream-100 text-brand-700">{e.category}</span>
                      </td>
                      <td className="py-2.5 px-3 tnum font-bold text-coral-700">{formatPrice(e.amount)}</td>
                      <td className="py-2.5 px-3 text-[11px] text-cream-500">{dayLabel(new Date(e.date))}</td>
                      <td className="py-2.5 px-3 text-[11px] text-cream-500">{e.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showExpense && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowExpense(false)}>
              <div className={`w-full max-w-md rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>ثبت هزینه جدید</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-cream-500 mb-1 block">عنوان هزینه</label>
                    <input value={newExpense.title} onChange={e => setNewExpense({ ...newExpense, title: e.target.value })} placeholder="مثلاً: تبلیغات اینستاگرام" className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-cream-500 mb-1 block">دسته‌بندی</label>
                    <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100">
                      <option>تبلیغات</option><option>حقوق</option><option>اجاره</option><option>بسته‌بندی</option><option>حمل‌ونقل</option><option>کارمزد درگاه</option><option>سایر</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-cream-500 mb-1 block">مبلغ (تومان)</label>
                    <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: +e.target.value })} placeholder="0" className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-cream-500 mb-1 block">یادداشت (اختیاری)</label>
                    <textarea value={newExpense.note} onChange={e => setNewExpense({ ...newExpense, note: e.target.value })} placeholder="توضیحات اضافی..." className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none h-20 resize-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setExpenses([...expenses, { ...newExpense, id: `exp-${Date.now()}`, date: new Date().toISOString() }]); setShowExpense(false); setNewExpense({ title: '', category: 'سایر', amount: 0, note: '' }); log('ثبت هزینه جدید', newExpense.title); }} className="flex-1 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px] shadow-lg shadow-brand-900/25">ذخیره هزینه</button>
                  <button onClick={() => setShowExpense(false)} className="px-4 py-2.5 rounded-xl border border-cream-300 text-[12px] font-bold">انصراف</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {tab === 'cashflow' && (
        <div className="space-y-4">
          {/* Cash Flow Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-cream-500">ورودی کل</p>
                <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-lg"><IconTrending className="w-4 h-4" /></div>
              </div>
              <p className="text-lg font-extrabold tnum text-emerald-700">{formatPrice(totalBankIn)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-cream-500">خروجی کل</p>
                <div className="bg-coral-50 text-coral-700 p-1.5 rounded-lg"><IconTrending className="w-4 h-4" /></div>
              </div>
              <p className="text-lg font-extrabold tnum text-coral-700">{formatPrice(totalBankOut)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-cream-500">جریان خالص</p>
                <div className={`${netCashFlow >= 0 ? 'bg-green-50 text-green-700' : 'bg-coral-50 text-coral-700'} p-1.5 rounded-lg`}><IconChart className="w-4 h-4" /></div>
              </div>
              <p className={`text-lg font-extrabold tnum ${netCashFlow >= 0 ? 'text-green-700' : 'text-coral-700'}`}>{formatPrice(netCashFlow)}</p>
            </div>
          </div>

          {/* Cash Flow Chart */}
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>پیش‌بینی جریان نقدی</h3>
                <p className="text-[10px] text-cream-500 mt-0.5">نیازمند دادهٔ واقعی تراکنش‌ها و تعهدات آینده</p>
              </div>
              <div className="flex gap-3 text-[10px]">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-brand-900"></div><span>ورودی</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-coral-500"></div><span>خروجی</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-accent-500"></div><span>مانده</span></div>
              </div>
            </div>
            {cf.length ? <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cf}>
                  <defs>
                    <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A2238" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1A2238" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} tickFormatter={(v) => v.slice(5)} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} tickFormatter={(v) => formatPrice(v / 1000000) + 'M'} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
                    formatter={(value: any) => [formatPrice(value) + ' تومان', '']}
                  />
                  <Bar dataKey="inflow" fill="url(#colorInflow)" name="ورودی" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="outflow" fill="#E34A4A" name="خروجی" radius={[8, 8, 0, 0]} />
                  <Line type="monotone" dataKey="balance" stroke="#F5C518" strokeWidth={3} name="مانده" dot={{ fill: '#F5C518', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div> : <p className="py-10 text-center text-[11px] text-cream-500">تا زمان اتصال داده‌های بانکی و ثبت هزینه‌های آینده، پیش‌بینی قابل اتکا وجود ندارد.</p>}
          </div>
        </div>
      )}
      {tab === 'bank' && (
        <div className="space-y-4">
          {/* Bank Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-cream-500">کل ورودی</p>
                <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-lg"><IconTrending className="w-4 h-4" /></div>
              </div>
              <p className="text-lg font-extrabold tnum text-emerald-700">{formatPrice(totalBankIn)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-cream-500">کل خروجی</p>
                <div className="bg-coral-50 text-coral-700 p-1.5 rounded-lg"><IconTrending className="w-4 h-4" /></div>
              </div>
              <p className="text-lg font-extrabold tnum text-coral-700">{formatPrice(totalBankOut)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">تعداد تراکنش</p>
              <p className="text-lg font-extrabold tnum">{faNum(bankTx.length)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">تطابق یافته</p>
              <p className="text-lg font-extrabold tnum text-emerald-700">{faNum(bankTx.filter((t: any) => t.matched).length)}</p>
            </div>
          </div>

          {/* Bank Transactions Table */}
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
            <div className="p-5 border-b border-cream-200">
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>تراکنش‌های بانکی</h3>
              <p className="text-[10px] text-cream-500 mt-0.5">لیست تمام تراکنش‌های ورودی و خروجی</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نوع</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">روش پرداخت</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مبلغ</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تاریخ</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کد پیگیری</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت تطابق</th>
                  </tr>
                </thead>
                <tbody>
                  {bankTx.map((tx: any) => (
                    <tr key={tx.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${tx.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-coral-100 text-coral-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'in' ? 'bg-emerald-600' : 'bg-coral-600'}`}></span>
                          {tx.type === 'in' ? 'ورودی' : 'خروجی'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold">{tx.method}</td>
                      <td className="py-2.5 px-3 tnum font-bold">{formatPrice(tx.amount)}</td>
                      <td className="py-2.5 px-3 text-[11px] text-cream-500">{dayLabel(new Date(tx.date))}</td>
                      <td className="py-2.5 px-3 tnum text-[11px] font-mono text-brand-700">{tx.ref || '-'}</td>
                      <td className="py-2.5 px-3">
                        {tx.matched ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                            <IconCheck className="w-3 h-3" />
                            تطابق یافته
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                            <IconClock className="w-3 h-3" />
                            در انتظار
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminCustomers() {
  const { darkMode, log, adminIdentity, isAdmin, orders } = useAdmin();
  const { addToast } = useShop();
  const customersQuery = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: () => api.customers.list(),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const registeredCustomers = customersQuery.data?.items ?? [];
  useEffect(() => {
    if (customersQuery.error) addToast('danger', `بارگذاری حساب‌های مشتریان ناموفق بود: ${customersQuery.error.message}`);
  }, [addToast, customersQuery.error]);
  const orderCustomers = aggregateCustomers(orders);
  const orderCustomersByMobile = new Map(orderCustomers.map((customer) => [customer.mobile, customer]));
  const registeredPhones = new Set(registeredCustomers.map((customer) => customer.phone));
  const customers = [
    ...registeredCustomers.map((record) => ({
      ...(orderCustomersByMobile.get(record.phone) || {
        id: record.id, name: record.name, mobile: record.phone, city: '',
        orders: record.orderCount, totalSpent: record.totalSpent,
        segment: 'جدید', lastOrder: record.lastOrder || record.created_at,
      }),
      name: record.name || orderCustomersByMobile.get(record.phone)?.name,
      loyalty: record.loyalty,
    })),
    ...orderCustomers.filter((customer) => !registeredPhones.has(customer.mobile)).map((customer) => ({ ...customer, loyalty: 0 })),
  ];
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [notes, setNotes] = useState<Record<string, { id: string; note: string; createdAt: string }[]>>({});
  const [newNote, setNewNote] = useState('');
  useEffect(() => {
    if (!selectedCustomer?.mobile) return;
    api.customers.notes(selectedCustomer.mobile).then(({ items }) => {
      setNotes((current) => ({ ...current, [selectedCustomer.mobile]: items }));
    }).catch((error) => {
      addToast('danger', `بارگذاری یادداشت‌های مشتری ناموفق بود: ${error.message}`);
    });
  }, [selectedCustomer?.mobile, addToast]);

  const filtered = customers.filter(c => {
    if (segmentFilter !== 'all' && c.segment !== segmentFilter) return false;
    if (search && !c.name.includes(search) && !c.mobile.includes(search) && !c.city.includes(search)) return false;
    return true;
  });

  const segments = {
    all: customers.length,
    'VIP': customers.filter(c => c.segment === 'VIP').length,
    'وفادار': customers.filter(c => c.segment === 'وفادار').length,
    'جدید': customers.filter(c => c.segment === 'جدید').length,
  };

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const avgOrderValue = customers.length ? totalRevenue / customers.reduce((s, c) => s + c.orders, 0) : 0;

  const exportCustomers = () => {
    const data = filtered.map(c => ({
      'نام': c.name,
      'موبایل': c.mobile,
      'شهر': c.city,
      'تعداد سفارش': c.orders,
      'مجموع خرید (تومان)': c.totalSpent,
      'امتیاز وفاداری': c.loyalty ?? 'در دسترس نیست',
      'دسته': c.segment,
      'آخرین خرید': dayLabel(new Date(c.lastOrder))
    }));
    downloadFile(toExcel(data, 'گزارش مشتریان'), 'customers.xls', 'application/vnd.ms-excel');
    log('خروجی گزارش مشتریان', 'customers');
  };

  const addNote = async (customerMobile: string) => {
    if (!newNote.trim()) return;
    try {
      const item = await api.customers.addNote(customerMobile, newNote.trim());
      setNotes((current) => ({ ...current, [customerMobile]: [item, ...(current[customerMobile] || [])] }));
      log('افزودن یادداشت مشتری', customerMobile);
    } catch (error: any) {
      addToast('danger', `ذخیره یادداشت ناموفق بود: ${error.message}`);
      return;
    }
    setNewNote('');
  };

  const customerOrders = selectedCustomer ? orders.filter((o: any) => o.mobile === selectedCustomer.mobile) : [];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'کل مشتریان', v: faNum(customers.length), c: 'bg-blue-50 text-blue-700', icon: <IconUsers className="w-5 h-5" /> },
          { l: 'درآمد کل', v: formatPrice(totalRevenue), c: 'bg-emerald-50 text-emerald-700', icon: <IconDollar className="w-5 h-5" /> },
          { l: 'میانگین سفارش', v: formatPrice(avgOrderValue), c: 'bg-purple-50 text-purple-700', icon: <IconChart className="w-5 h-5" /> },
          { l: 'مشتریان VIP', v: faNum(segments['VIP']), c: 'bg-amber-50 text-amber-700', icon: <IconStar className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Segment Distribution */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>توزیع مشتریان بر اساس دسته</h3>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(segments).map(([seg, count]) => (
            <div key={seg} className="text-center">
              <div className={`h-2 rounded-full mb-2 ${seg === 'VIP' ? 'bg-purple-500' : seg === 'وفادار' ? 'bg-emerald-500' : seg === 'جدید' ? 'bg-blue-500' : 'bg-brand-500'}`} style={{ width: `${customers.length ? (count / customers.length) * 100 : 0}%` }}></div>
              <p className="text-[11px] font-bold text-brand-900">{seg === 'all' ? 'همه' : seg}</p>
              <p className="text-[13px] font-extrabold tnum text-brand-700">{faNum(count)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو نام، موبایل، شهر..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
        <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه دسته‌ها</option>
          <option value="VIP">VIP</option>
          <option value="وفادار">وفادار</option>
          <option value="جدید">جدید</option>
        </select>
        <button onClick={exportCustomers} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-cream-300 text-[11px] font-bold">
          <IconDownload className="w-4 h-4" /> خروجی اکسل
        </button>
      </div>

      {/* Customers Table */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نام</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">موبایل</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">شهر</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">سفارش‌ها</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مجموع خرید</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">امتیاز</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">دسته</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                  <td className="py-2.5 px-3 font-bold">{c.name}</td>
                  <td className="py-2.5 px-3 tnum">{c.mobile}</td>
                  <td className="py-2.5 px-3">{c.city}</td>
                  <td className="py-2.5 px-3 tnum">{faNum(c.orders)}</td>
                  <td className="py-2.5 px-3 tnum">{formatPrice(c.totalSpent)}</td>
                  <td className="py-2.5 px-3 tnum">{c.loyalty === null ? '—' : faNum(c.loyalty)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.segment === 'VIP' ? 'bg-purple-100 text-purple-700' : c.segment === 'وفادار' ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-brand-700'}`}>
                      {c.segment}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <button onClick={() => setSelectedCustomer(c)} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600">
                      <IconEye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-end" onClick={() => setSelectedCustomer(null)}>
          <div className={`w-full max-w-md h-full overflow-y-auto ${darkMode ? 'bg-[#151b26]' : 'bg-white'} animate-drawer p-6`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>پروفایل مشتری</h3>
              <button onClick={() => setSelectedCustomer(null)}><IconX className="w-5 h-5" /></button>
            </div>

            {/* Customer Info */}
            <div className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-cream-50'} p-4 mb-4`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                  <IconUser className="w-6 h-6 text-brand-700" />
                </div>
                <div>
                  <h4 className="font-bold text-brand-900">{selectedCustomer.name}</h4>
                  <p className="text-[11px] text-cream-500">{selectedCustomer.mobile}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-cream-500">شهر: </span>{selectedCustomer.city}</div>
                <div><span className="text-cream-500">تعداد سفارش: </span><span className="tnum font-bold">{faNum(selectedCustomer.orders)}</span></div>
                <div><span className="text-cream-500">مجموع خرید: </span><span className="tnum font-bold">{formatPrice(selectedCustomer.totalSpent)}</span></div>
                <div><span className="text-cream-500">امتیاز وفاداری: </span><span className="tnum font-bold">{selectedCustomer.loyalty === null ? 'در دسترس نیست' : faNum(selectedCustomer.loyalty)}</span></div>
              </div>
            </div>

            {/* Order History */}
            <div className="mb-4">
              <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>تاریخچه سفارش‌ها</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {customerOrders.map((o: any) => (
                  <div key={o.id} className={`rounded-lg border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-white'} p-3`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold">{o.code}</span>
                      <span className="text-[10px] text-cream-500">{dayLabel(new Date(o.createdAt))}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="tnum">{formatPrice(o.total)} تومان</span>
                      <span className={`text-[10px] font-bold ${o.status === 'delivered' ? 'text-emerald-600' : o.status === 'cancelled' ? 'text-coral-600' : 'text-amber-600'}`}>
                        {o.status === 'delivered' ? 'تحویل شده' : o.status === 'cancelled' ? 'لغو شده' : 'در حال پردازش'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>یادداشت‌ها</h4>
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {(notes[selectedCustomer.mobile] || []).map((item) => (
                  <div key={item.id} className={`rounded-lg border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-cream-50'} p-2 text-[11px]`}>
                    <p>{item.note}</p>
                    <time className="block mt-1 text-[9px] text-cream-500">{dayLabel(new Date(item.createdAt))}</time>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="یادداشت جدید..." className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                <button onClick={() => addNote(selectedCustomer.mobile)} className="px-3 py-2 rounded-xl bg-brand-900 text-white text-[12px] font-bold">
                  <IconPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminReviews() {
  const { darkMode, log, isAdmin } = useAdmin();
  const { products, addToast } = useShop();
  const queryClient = useQueryClient();
  const reviewsQuery = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: () => api.catalog.reviews('', ''),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const reviews = reviewsQuery.data?.items ?? [];
  const setReviews = useCallback((items: any[]) => {
    queryClient.setQueryData(['admin', 'reviews'], { items });
    void queryClient.invalidateQueries({ queryKey: ['catalog', 'reviews'] });
  }, [queryClient]);
  useEffect(() => {
    if (reviewsQuery.error) addToast('danger', `بارگذاری دیدگاه‌ها ناموفق بود: ${reviewsQuery.error.message}`);
  }, [addToast, reviewsQuery.error]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [reply, setReply] = useState('');

  const filtered = reviews.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (ratingFilter > 0 && r.rating < ratingFilter) return false;
    if (search && !r.author.includes(search) && !r.text.includes(search)) return false;
    return true;
  });

  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    avgRating: reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length * 100) : 0
  }));

  const handleApprove = async (id: string) => {
    try {
      const saved = await api.catalog.updateReview(id, { status: 'approved' });
      setReviews(reviews.map((item) => item.id === id ? saved : item));
      log('تأیید نظر', id);
    } catch (error: any) {
      addToast('danger', `تأیید دیدگاه ناموفق بود: ${error.message}`);
    }
  };
  const handleReject = async (id: string) => {
    try {
      const saved = await api.catalog.updateReview(id, { status: 'rejected' });
      setReviews(reviews.map((item) => item.id === id ? saved : item));
      log('رد نظر', id, 'warning');
    } catch (error: any) {
      addToast('danger', `رد دیدگاه ناموفق بود: ${error.message}`);
    }
  };
  const handleReply = async () => {
    if (!reply.trim() || !selectedReview) return;
    try {
      const saved = await api.catalog.updateReview(selectedReview.id, { reply });
      setReviews(reviews.map((item) => item.id === selectedReview.id ? saved : item));
      setSelectedReview(saved);
      setReply('');
      log('پاسخ به نظر', selectedReview.id);
    } catch (error: any) {
      addToast('danger', `ثبت پاسخ ناموفق بود: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { l: 'کل نظرات', v: faNum(stats.total), c: 'bg-blue-50 text-blue-700', icon: <IconClipboard className="w-5 h-5" /> },
          { l: 'در انتظار بررسی', v: faNum(stats.pending), c: 'bg-amber-50 text-amber-700', icon: <IconClock className="w-5 h-5" /> },
          { l: 'تأیید شده', v: faNum(stats.approved), c: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="w-5 h-5" /> },
          { l: 'رد شده', v: faNum(stats.rejected), c: 'bg-coral-50 text-coral-700', icon: <IconX className="w-5 h-5" /> },
          { l: 'میانگین امتیاز', v: faNum(stats.avgRating.toFixed(1)), c: 'bg-purple-50 text-purple-700', icon: <IconStar className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Rating Distribution */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>توزیع امتیازات</h3>
        <div className="space-y-2">
          {ratingDistribution.map(r => (
            <div key={r.star} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-16">
                <IconStar className="w-4 h-4 text-amber-500" filled />
                <span className="text-[12px] font-bold">{faNum(r.star)}</span>
              </div>
              <div className="flex-1 h-2.5 bg-cream-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${r.percentage}%` }}></div>
              </div>
              <span className="tnum text-[11px] font-bold w-12 text-left">{faNum(r.count)} ({faNum(r.percentage.toFixed(0))}٪)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو در نظرات..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
        <select value={filter} onChange={e => setFilter(e.target.value as any)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="approved">تأیید شده</option>
          <option value="rejected">رد شده</option>
        </select>
        <select value={ratingFilter} onChange={e => setRatingFilter(+e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value={0}>همه امتیازات</option>
          <option value={5}>۵ ستاره</option>
          <option value={4}>۴ ستاره و بالاتر</option>
          <option value={3}>۳ ستاره و بالاتر</option>
          <option value={2}>۲ ستاره و بالاتر</option>
          <option value={1}>۱ ستاره</option>
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filtered.map(r => {
          const product = products.find(p => p.id === r.productId);
          return (
            <div key={r.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 hover:shadow-lg transition-all`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                    <IconUser className="w-5 h-5 text-brand-700" />
                  </div>
                  <div>
                    <p className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{r.author}</p>
                    <p className="text-[10px] text-cream-500">{product?.name || 'محصول نامشخص'} | {dayLabel(new Date(r.date))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <IconStar key={i} className={`w-4 h-4 ${i < r.rating ? 'text-amber-500' : 'text-cream-300'}`} filled={i < r.rating} />)}</div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-coral-100 text-coral-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status === 'approved' ? 'تأیید شده' : r.status === 'rejected' ? 'رد شده' : 'در انتظار'}
                  </span>
                </div>
              </div>
              
              <p className={`text-[12px] ${darkMode ? 'text-brand-200' : 'text-brand-700'} mb-3 leading-6`}>{r.text}</p>
              
              {r.pros && r.pros.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-emerald-700 mb-1">نقاط قوت:</p>
                  <div className="flex flex-wrap gap-1">{r.pros.map((p: any, i: number) => <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">{p}</span>)}</div>
                </div>
              )}
              
              {r.cons && r.cons.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-coral-700 mb-1">نقاط ضعف:</p>
                  <div className="flex flex-wrap gap-1">{r.cons.map((c: any, i: number) => <span key={i} className="text-[10px] bg-coral-50 text-coral-700 rounded-full px-2 py-0.5">{c}</span>)}</div>
                </div>
              )}

              {r.reply && (
                <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-brand-50'} p-3 mb-3`}>
                  <p className="text-[10px] font-bold text-brand-700 mb-1">پاسخ مدیر:</p>
                  <p className="text-[11px] text-brand-700">{r.reply}</p>
                </div>
              )}

              <div className="flex gap-2">
                {r.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(r.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-bold hover:bg-emerald-200 transition-colors">
                      <IconCheck className="w-3.5 h-3.5" /> تأیید
                    </button>
                    <button onClick={() => handleReject(r.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-coral-100 text-coral-700 text-[11px] font-bold hover:bg-coral-200 transition-colors">
                      <IconX className="w-3.5 h-3.5" /> رد
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedReview(r)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cream-100 text-brand-700 text-[11px] font-bold hover:bg-cream-200 transition-colors">
                  <IconEye className="w-3.5 h-3.5" /> جزئیات
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedReview(null)}>
          <div className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>جزئیات نظر</h3>
              <button onClick={() => setSelectedReview(null)}><IconX className="w-5 h-5" /></button>
            </div>

            <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-4 mb-4`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                  <IconUser className="w-6 h-6 text-brand-700" />
                </div>
                <div>
                  <p className="font-bold">{selectedReview.author}</p>
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <IconStar key={i} className={`w-4 h-4 ${i < selectedReview.rating ? 'text-amber-500' : 'text-cream-300'}`} filled={i < selectedReview.rating} />)}</div>
                </div>
              </div>
              <p className="text-[12px] leading-6">{selectedReview.text}</p>
            </div>

            {selectedReview.reply ? (
              <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-brand-50'} p-4`}>
                <p className="text-[11px] font-bold text-brand-700 mb-2">پاسخ مدیر:</p>
                <p className="text-[12px]">{selectedReview.reply}</p>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-2 block">پاسخ به نظر:</label>
                <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="پاسخ خود را بنویسید..." className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none h-24 resize-none" />
                <button onClick={handleReply} className="w-full mt-2 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px]">ارسال پاسخ</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDiscounts() {
  const { darkMode, log, isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const discountsQuery = useQuery({
    queryKey: ['admin', 'discounts'],
    queryFn: () => api.catalog.discounts(),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const discountCodes = discountsQuery.data?.items ?? [];
  const { setDiscountCodes: setShopDiscountCodes, addToast } = useShop();
  const setDiscountCodes = useCallback((items: any[]) => {
    queryClient.setQueryData(['admin', 'discounts'], { items });
    setShopDiscountCodes(items);
  }, [queryClient, setShopDiscountCodes]);
  useEffect(() => {
    if (discountsQuery.data) setShopDiscountCodes(discountsQuery.data.items);
  }, [discountsQuery.data, setShopDiscountCodes]);
  useEffect(() => {
    if (discountsQuery.error) addToast('danger', `بارگذاری کدهای تخفیف ناموفق بود: ${discountsQuery.error.message}`);
  }, [addToast, discountsQuery.error]);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const freshForm = () => ({ code: '', type: 'percent', value: 10, maxUses: 100, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), active: true });
  const [form, setForm] = useState(freshForm);

  const stats = {
    total: discountCodes.length,
    active: discountCodes.filter((c: any) => c.active).length,
    expired: discountCodes.filter((c: any) => new Date(c.expiresAt) < new Date()).length,
    totalUses: discountCodes.reduce((s: number, c: any) => s + c.usedCount, 0),
    totalDiscount: discountCodes.reduce((s: number, c: any) => {
      return s + (c.type === 'percent' ? c.usedCount * c.value * 10000 : c.usedCount * c.value);
    }, 0),
  };

  const filtered = discountCodes.filter((c: any) => {
    if (search && !c.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'active' && !c.active) return false;
    if (statusFilter === 'inactive' && c.active) return false;
    if (statusFilter === 'expired' && new Date(c.expiresAt) >= new Date()) return false;
    return true;
  });

  const save = async () => {
    try {
      const saved = editingCode
        ? await api.catalog.updateDiscount(editingCode.id, { ...editingCode, ...form })
        : await api.catalog.createDiscount({ ...form, code: form.code.trim().toUpperCase() });
      const next = editingCode
        ? discountCodes.map((item: any) => item.id === saved.id ? saved : item)
        : [...discountCodes, saved];
      setDiscountCodes(next);
      setShopDiscountCodes(next);
      log(`${editingCode ? 'ویرایش' : 'ایجاد'} کد تخفیف ${saved.code}`, saved.id);
      addToast('success', 'کد تخفیف ذخیره شد');
      setShowForm(false);
      setEditingCode(null);
      setForm(freshForm());
    } catch (error: any) {
      addToast('danger', `ذخیره کد تخفیف ناموفق بود: ${error.message}`);
    }
  };

  const handleEdit = (code: any) => {
    setEditingCode(code);
    setForm({ code: code.code, type: code.type, value: code.value, maxUses: code.maxUses, expiresAt: code.expiresAt, active: code.active });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('آیا از حذف این کد تخفیف مطمئن هستید؟')) {
      try {
        await api.catalog.deleteDiscount(id);
        const next = discountCodes.filter((item: any) => item.id !== id);
        setDiscountCodes(next);
        setShopDiscountCodes(next);
        log('حذف کد تخفیف', id, 'warning');
      } catch (error: any) {
        addToast('danger', `حذف کد تخفیف ناموفق بود: ${error.message}`);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { l: 'کل کدها', v: faNum(stats.total), c: 'bg-blue-50 text-blue-700', icon: <IconTag className="w-5 h-5" /> },
          { l: 'فعال', v: faNum(stats.active), c: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="w-5 h-5" /> },
          { l: 'منقضی شده', v: faNum(stats.expired), c: 'bg-coral-50 text-coral-700', icon: <IconClock className="w-5 h-5" /> },
          { l: 'کل استفاده', v: faNum(stats.totalUses), c: 'bg-purple-50 text-purple-700', icon: <IconUsers className="w-5 h-5" /> },
          { l: 'تخفیف داده شده', v: formatPrice(stats.totalDiscount), c: 'bg-amber-50 text-amber-700', icon: <IconDollar className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setEditingCode(null); setForm(freshForm()); setShowForm(true); }} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1 shadow-lg shadow-brand-900/25"><IconPlus className="w-4 h-4" />ایجاد کد تخفیف جدید</button>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو کد تخفیف..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="inactive">غیرفعال</option>
          <option value="expired">منقضی شده</option>
        </select>
      </div>

      {/* Discount Codes Table */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کد</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نوع</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مقدار</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">میزان استفاده</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">انقضا</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const usagePercentage = (c.usedCount / c.maxUses) * 100;
                const isExpired = new Date(c.expiresAt) < new Date();
                return (
                  <tr key={c.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-brand-700 bg-cream-100 px-2 py-1 rounded">{c.code}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.type === 'percent' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {c.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 tnum font-bold">
                      {c.type === 'percent' ? `${faNum(c.value)}٪` : formatPrice(c.value)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-cream-200 rounded-full overflow-hidden w-20">
                          <div className={`h-full rounded-full ${usagePercentage > 80 ? 'bg-coral-500' : usagePercentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, usagePercentage)}%` }}></div>
                        </div>
                        <span className="tnum text-[10px]">{faNum(c.usedCount)}/{faNum(c.maxUses)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <span className={isExpired ? 'text-coral-600 font-bold' : ''}>{c.expiresAt}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button onClick={async () => {
                        const updated = { ...c, active: !c.active };
                        try {
                          const saved = await api.catalog.updateDiscount(c.id, updated);
                          const next = discountCodes.map((item: any) => item.id === c.id ? saved : item);
                          setDiscountCodes(next);
                          setShopDiscountCodes(next);
                          log(`${saved.active ? 'فعال' : 'غیرفعال'} کردن کد ${c.code}`, c.id);
                        } catch (error: any) {
                          addToast('danger', `تغییر وضعیت کد تخفیف ناموفق بود: ${error.message}`);
                        }
                      }} className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.active && !isExpired ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>
                        {isExpired ? 'منقضی' : c.active ? 'فعال' : 'غیرفعال'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600"><IconEdit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-coral-50 text-coral-500"><IconTrash className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditingCode(null); }}>
          <div className={`w-full max-w-md rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>{editingCode ? 'ویرایش کد تخفیف' : 'ایجاد کد تخفیف جدید'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">کد تخفیف</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="مثلاً: WELCOME20" className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none font-mono uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-cream-500 mb-1 block">نوع تخفیف</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none">
                    <option value="percent">درصدی (٪)</option>
                    <option value="fixed">مبلغ ثابت (تومان)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-cream-500 mb-1 block">مقدار {form.type === 'percent' ? '(٪)' : '(تومان)'}</label>
                  <input type="number" value={form.value} onChange={e => setForm({ ...form, value: +e.target.value })} placeholder="0" className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-cream-500 mb-1 block">سقف استفاده</label>
                  <input type="number" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: +e.target.value })} placeholder="100" className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-cream-500 mb-1 block">تاریخ انقضا</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="active" className="text-[12px] font-bold">فعال باشد</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={save} className="flex-1 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px] shadow-lg shadow-brand-900/25">{editingCode ? 'بروزرسانی' : 'ایجاد کد تخفیف'}</button>
              <button onClick={() => { setShowForm(false); setEditingCode(null); }} className="px-4 py-2.5 rounded-xl border border-cream-300 text-[12px] font-bold">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Remaining admin sections - simplified but functional */
function AdminGrowth() {
  const { campaigns, automations, loyalty, setLoyalty, darkMode, log, isAdmin } = useAdmin();
  const { discountCodes, setDiscountCodes: setShopDiscountCodes, addToast } = useShop();
  const queryClient = useQueryClient();
  const discountsQuery = useQuery({
    queryKey: ['admin', 'discounts'],
    queryFn: () => api.catalog.discounts(),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const setDiscountCodes = useCallback((items: any[]) => {
    queryClient.setQueryData(['admin', 'discounts'], { items });
    setShopDiscountCodes(items);
  }, [queryClient, setShopDiscountCodes]);
  const [tab, setTab] = useState<'campaigns' | 'codes' | 'automation' | 'loyalty' | 'ab'>('campaigns');
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', type: 'percent', value: 10, maxUses: 100, expiresAt: '' });
  useEffect(() => {
    if (discountsQuery.data) setShopDiscountCodes(discountsQuery.data.items);
  }, [discountsQuery.data, setShopDiscountCodes]);
  useEffect(() => {
    if (discountsQuery.error) addToast('danger', `بارگذاری کدهای تخفیف ناموفق بود: ${discountsQuery.error.message}`);
  }, [addToast, discountsQuery.error]);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'کمپین خودکار فعال', v: faNum(0), c: 'bg-cream-100 text-cream-700', icon: <IconRocket className="w-5 h-5" /> },
          { l: 'تعریف کمپین', v: faNum(campaigns.length), c: 'bg-blue-50 text-blue-700', icon: <IconTrending className="w-5 h-5" /> },
          { l: 'کدهای تخفیف', v: faNum(discountCodes.length), c: 'bg-purple-50 text-purple-700', icon: <IconTag className="w-5 h-5" /> },
          { l: 'اتوماسیون‌های تعریف‌شده', v: faNum(automations.length), c: 'bg-amber-50 text-amber-700', icon: <IconSend className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[{ k: 'campaigns', l: 'کمپین‌ها' }, { k: 'codes', l: 'کدهای تخفیف' }, { k: 'automation', l: 'اتوماسیون' }, { k: 'loyalty', l: 'باشگاه وفاداری' }, { k: 'ab', l: 'آزمایش A/B' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>{t.l}</button>
        ))}
      </div>

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <div className="space-y-3">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">طبق سیاست فعلی فروشگاه، کمپین‌های خودکار در checkout غیرفعال‌اند؛ فقط کد تخفیفی که در checkout اعتبارسنجی شده باشد روی قیمت اعمال می‌شود.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {campaigns.map((c: any) => (
              <div key={c.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 hover:shadow-lg transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.type === 'tiered' ? 'bg-purple-100 text-purple-700' : c.type === 'bogo' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                    {c.type === 'tiered' ? 'پلکانی' : c.type === 'bogo' ? 'یکی بخر یکی ببر' : 'ارسال رایگان'}
                  </span>
                  <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[10px] font-bold text-cream-500">غیرفعال در checkout</span>
                </div>
                <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>{c.name}</h4>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cream-500">اعمال خودکار: خاموش</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discount Codes Tab */}
      {tab === 'codes' && (
        <div className="space-y-3">
          <button onClick={() => setShowCodeForm(true)} className="flex items-center gap-2 bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold shadow-lg shadow-brand-900/25">
            <IconPlus className="w-4 h-4" /> ایجاد کد تخفیف جدید
          </button>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
            <table className="w-full text-[12px]">
              <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کد</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نوع</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مقدار</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">استفاده / سقف</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">انقضا</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت</th>
              </tr></thead>
              <tbody>{discountCodes.map((c: any) => (
                <tr key={c.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'}`}>
                  <td className="py-2.5 px-3 font-bold font-mono text-brand-700">{c.code}</td>
                  <td className="py-2.5 px-3">{c.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'}</td>
                  <td className="py-2.5 px-3 tnum">{c.type === 'percent' ? `${faNum(c.value)}٪` : formatPrice(c.value)}</td>
                  <td className="py-2.5 px-3 tnum">{faNum(c.usedCount)} / {faNum(c.maxUses)}</td>
                  <td className="py-2.5 px-3 text-[11px] text-cream-500">{c.expiresAt}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{c.active ? 'فعال' : 'غیرفعال'}</span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {showCodeForm && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCodeForm(false)}>
              <div className={`w-full max-w-sm rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
                <h3 className="font-bold mb-4">ایجاد کد تخفیف</h3>
                <div className="space-y-3">
                  <input value={newCode.code} onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} placeholder="کد تخفیف" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                  <select value={newCode.type} onChange={e => setNewCode({ ...newCode, type: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none">
                    <option value="percent">درصدی</option><option value="fixed">مبلغ ثابت</option>
                  </select>
                  <input type="number" value={newCode.value} onChange={e => setNewCode({ ...newCode, value: +e.target.value })} placeholder="مقدار" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                  <input type="number" value={newCode.maxUses} onChange={e => setNewCode({ ...newCode, maxUses: +e.target.value })} placeholder="سقف استفاده" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                  <input type="date" value={newCode.expiresAt} onChange={e => setNewCode({ ...newCode, expiresAt: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                </div>
                <button onClick={async () => {
                  try {
                    const saved = await api.catalog.createDiscount({ ...newCode, code: newCode.code.trim().toUpperCase(), active: true });
                    setDiscountCodes([...discountCodes, saved]);
                    setShowCodeForm(false);
                    setNewCode({ code: '', type: 'percent', value: 10, maxUses: 100, expiresAt: '' });
                    log('ایجاد کد تخفیف', saved.code);
                    addToast('success', 'کد تخفیف ذخیره شد');
                  } catch (error: any) {
                    addToast('danger', `ایجاد کد تخفیف ناموفق بود: ${error.message}`);
                  }
                }} className="w-full mt-4 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px]">ذخیره</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Automation Tab */}
      {tab === 'automation' && (
        <div className="space-y-3">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">ارسال پیام خودکار طبق سیاست فعلی خاموش است؛ هیچ رویدادی پیامک ارسال نمی‌کند و فعال‌سازی تا تعیین رضایت مشتری و provider مجاز نیست.</p>
          {automations.map((a: any) => (
            <div key={a.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.channel === 'sms' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    <IconSend className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{a.name}</h4>
                    <p className="text-[10px] text-cream-500">رویداد: {a.event} | کانال: {a.channel}</p>
                  </div>
                </div>
                <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[10px] font-bold text-cream-500">خاموش؛ بدون ارسال</span>
              </div>
              <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3 text-[11px] text-brand-700 mb-2`}>{a.template}</div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-cream-500">ارسال واقعی: {faNum(0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loyalty Tab */}
      {tab === 'loyalty' && (
        <div className="space-y-4">
          {loyalty ? <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>تنظیمات امتیازدهی</h3>
            <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-800">امتیاز پس از تأیید پرداخت ثبت می‌شود. بازخرید در checkout تا سقف درصد مبلغ کالای پس از تخفیف اعمال می‌شود؛ مالیات و ارسال مشمول امتیاز نیستند.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">امتیاز به ازای هر ۱۰۰۰ تومان</label>
                <input type="number" min="0" step="1" value={loyalty.pointsPerThousand} onChange={e => setLoyalty({ ...loyalty, pointsPerThousand: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">ارزش هر امتیاز (تومان)</label>
                <input type="number" min="0" step="1" value={loyalty.pointValue} onChange={e => setLoyalty({ ...loyalty, pointValue: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">سقف بازخرید از مبلغ کالا (٪)</label>
                <input type="number" min="0" max="100" step="1" value={loyalty.redemptionCapPercent ?? 10} onChange={e => setLoyalty({ ...loyalty, redemptionCapPercent: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              </div>
            </div>
          </div> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">تنظیمات وفاداری در دسترس نیست یا هنوز بارگذاری نشده است.</p>}
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>اعضای باشگاه</h3>
            {loyalty?.members?.length ? (
              <div className="space-y-2">
                {loyalty.members.map((member: any) => (
                  <div key={member.id} className={`flex items-center justify-between rounded-xl p-3 ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'}`}>
                    <div><p className="text-[12px] font-bold">{member.name || 'بدون نام'}</p><p className="text-[10px] text-cream-500">{member.phone}</p></div>
                    <span className="text-[12px] font-bold tnum">{faNum(member.points)} امتیاز</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-[11px] text-cream-500">هنوز امتیاز وفاداری برای حساب مشتریان ثبت نشده است.</p>}
          </div>
        </div>
      )}

      {/* A/B Test Tab */}
      {tab === 'ab' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>آزمایش A/B</h3>
          <p className="text-[11px] leading-5 text-cream-500">تا زمان پیاده‌سازی تخصیص تصادفی کاربران و ثبت رخدادهای بازدید و خرید، دادهٔ آزمایش و نتیجهٔ برنده‌ای برای نمایش وجود ندارد.</p>
        </div>
      )}
    </div>
  );
}

function AdminReturns() {
  const { rmas, setRmas, orders, darkMode, log } = useAdmin();
  const { addToast } = useShop();
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const statusFlow = ['requested', 'approved', 'quality_check', 'returned', 'refunded'];
  const statusLabels: Record<string, string> = { requested: 'درخواست', approved: 'تأیید شده', quality_check: 'بررسی کیفیت', returned: 'تحویل کالا (بدون تغییر موجودی)', refunded: 'بازگشت وجه', rejected: 'رد شده' };
  const statusColors: Record<string, string> = { requested: 'bg-amber-100 text-amber-700', approved: 'bg-blue-100 text-blue-700', quality_check: 'bg-purple-100 text-purple-700', returned: 'bg-indigo-100 text-indigo-700', refunded: 'bg-emerald-100 text-emerald-700', rejected: 'bg-coral-100 text-coral-700' };

  const paidOrders = orders.filter(isPaidOrder);
  const selectedOrder = paidOrders.find((order: any) => order.id === orderId);
  const selectedItems = selectedOrder?.items || [];
  const selectedLine = selectedItems.find((item: any) => item.productId === productId);
  const openCreate = () => {
    setOrderId(paidOrders[0]?.id || '');
    setProductId(paidOrders[0]?.items?.[0]?.productId || '');
    setQuantity(1);
    setReason('');
    setShowCreate(true);
  };
  const createRma = () => {
    if (!selectedOrder || !selectedLine || !reason.trim() || !Number.isSafeInteger(quantity) || quantity < 1) {
      addToast('danger', 'سفارش، کالا، تعداد و دلیل مرجوعی را کامل کنید');
      return;
    }
    const rma = {
      id: `rma-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderId: selectedOrder.id,
      orderCode: selectedOrder.code,
      productId,
      productName: selectedLine.name,
      quantity,
      customer: selectedOrder.customer,
      mobile: selectedOrder.mobile,
      reason: reason.trim(),
      status: 'requested',
      date: new Date().toISOString(),
    };
    setRmas([rma, ...rmas]);
    log(`ثبت درخواست مرجوعی ${rma.id}`, rma.id);
    setShowCreate(false);
  };
  const advanceRma = (rma: any) => {
    if (rma.status === 'returned') {
      const amountText = window.prompt('مبلغ بازپرداخت واقعی به تومان را وارد کنید');
      if (amountText === null) return;
      const refundAmount = Number(amountText.replace(/[,\s]/g, ''));
      if (!Number.isSafeInteger(refundAmount) || refundAmount <= 0) {
        addToast('danger', 'مبلغ باید عدد صحیح و بیشتر از صفر باشد');
        return;
      }
      const refundReference = window.prompt('مرجع واقعی حواله انجام‌شده را وارد کنید');
      if (refundReference === null) return;
      if (!refundReference.trim()) {
        addToast('danger', 'ثبت بازپرداخت بدون مرجع حواله ممکن نیست');
        return;
      }
      setRmas(rmas.map((item: any) => item.id === rma.id
        ? { ...item, status: 'refunded', refundAmount, refundReference: refundReference.trim() }
        : item));
      log(`ثبت بازپرداخت مرجوعی ${rma.id}`, rma.id);
      return;
    }
    const nextStatus = statusFlow[statusFlow.indexOf(rma.status) + 1];
    if (!nextStatus) return;
    setRmas(rmas.map((item: any) => item.id === rma.id ? { ...item, status: nextStatus } : item));
    log(`پیشبرد مرجوعی ${rma.id}`, rma.id);
  };
  const filtered = rmas.filter((r: any) => filter === 'all' || r.status === filter);
  const reasonStats = rmas.reduce((acc: Record<string, number>, r: any) => { acc[r.reason] = (acc[r.reason] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-cream-500">ثبت بازپرداخت نیازمند مبلغ و مرجع حواله واقعی است؛ اصلاح موجودی انبار باید جداگانه انجام شود.</p>
        <button onClick={openCreate} disabled={!paidOrders.length} className="rounded-xl bg-brand-900 px-4 py-2 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">ثبت مرجوعی جدید</button>
      </div>
      {showCreate && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className="mb-3 text-sm font-bold">درخواست مرجوعی برای سفارش پرداخت‌شده</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-[11px]">سفارش
              <select value={orderId} onChange={(event) => {
                const nextOrder = paidOrders.find((order: any) => order.id === event.target.value);
                setOrderId(event.target.value);
                setProductId(nextOrder?.items?.[0]?.productId || '');
                setQuantity(1);
              }} className="w-full rounded-lg border border-cream-300 bg-transparent p-2">
                {paidOrders.map((order: any) => <option key={order.id} value={order.id}>{order.code} — {order.customer}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[11px]">کالا
              <select value={productId} onChange={(event) => { setProductId(event.target.value); setQuantity(1); }} className="w-full rounded-lg border border-cream-300 bg-transparent p-2">
                {selectedItems.map((item: any) => <option key={item.productId} value={item.productId}>{item.name} (حداکثر {item.qty})</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[11px]">تعداد
              <input type="number" min={1} max={selectedLine?.qty || 1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="w-full rounded-lg border border-cream-300 bg-transparent p-2" />
            </label>
            <label className="space-y-1 text-[11px]">دلیل مرجوعی
              <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} className="w-full rounded-lg border border-cream-300 bg-transparent p-2" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="rounded-lg px-3 py-2 text-[11px]">انصراف</button>
            <button onClick={createRma} className="rounded-lg bg-brand-900 px-4 py-2 text-[11px] font-bold text-white">ثبت درخواست</button>
          </div>
        </div>
      )}
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'کل مرجوعی‌ها', v: faNum(rmas.length), c: 'bg-blue-50 text-blue-700' },
          { l: 'در انتظار بررسی', v: faNum(rmas.filter((r: any) => r.status === 'requested').length), c: 'bg-amber-50 text-amber-700' },
          { l: 'تکمیل شده', v: faNum(rmas.filter((r: any) => r.status === 'refunded').length), c: 'bg-emerald-50 text-emerald-700' },
          { l: 'رد شده', v: faNum(rmas.filter((r: any) => r.status === 'rejected').length), c: 'bg-coral-50 text-coral-700' },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <p className="text-[10px] text-cream-500">{k.l}</p>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Reason Analysis */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>تحلیل دلایل بازگشت</h3>
        <div className="space-y-2">
          {Object.entries(reasonStats).map(([reason, count]) => (
            <div key={reason} className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-brand-700 w-32">{reason}</span>
              <div className="flex-1 h-3 bg-cream-200 rounded-full overflow-hidden">
                <div className="h-full bg-coral-500 rounded-full" style={{ width: `${(count / rmas.length) * 100}%` }}></div>
              </div>
              <span className="tnum text-[11px] font-bold text-cream-500 w-8">{faNum(count)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {['all', 'requested', 'approved', 'quality_check', 'returned', 'refunded', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${filter === s ? 'bg-brand-900 text-white' : darkMode ? 'bg-white/5 text-brand-300' : 'bg-cream-100 text-brand-700'}`}>
            {s === 'all' ? 'همه' : statusLabels[s] || s}
          </button>
        ))}
      </div>

      {/* RMA List */}
      <div className="space-y-3">
        {filtered.map((r: any) => (
          <div key={r.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 hover:shadow-md transition-all`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{r.productName}</h4>
                <p className="text-[11px] text-cream-500 mt-1">مشتری: {r.customer} | تاریخ: {dayLabel(new Date(r.date))}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${statusColors[r.status]}`}>{statusLabels[r.status] || r.status}</span>
            </div>
            
            {/* Workflow Progress */}
            <div className="flex items-center gap-1 mb-3">
              {statusFlow.map((step, i) => {
                const currentIdx = statusFlow.indexOf(r.status);
                const isActive = i <= currentIdx && r.status !== 'rejected';
                return (
                  <React.Fragment key={step}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${isActive ? 'bg-brand-900 text-white' : 'bg-cream-200 text-cream-500'}`}>{faNum(i + 1)}</div>
                    {i < statusFlow.length - 1 && <div className={`flex-1 h-0.5 ${isActive && i < currentIdx ? 'bg-brand-900' : 'bg-cream-200'}`}></div>}
                  </React.Fragment>
                );
              })}
            </div>

            <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3 mb-3`}>
              {r.orderCode && <p className="mb-1 text-[11px]"><span className="text-cream-500">سفارش: </span><span className="font-bold">{r.orderCode}</span></p>}
              <p className="text-[11px]"><span className="text-cream-500">دلیل: </span><span className="font-bold">{r.reason}</span></p>
              {r.status === 'refunded' && <p className="mt-1 text-[11px]"><span className="text-cream-500">بازپرداخت ثبت‌شده: </span><span className="font-bold">{faNum(r.refundAmount)} ریال · مرجع {r.refundReference}</span></p>}
            </div>

            {r.status !== 'refunded' && r.status !== 'rejected' && (
              <div className="flex gap-2">
                <button onClick={() => advanceRma(r)} className="flex-1 bg-brand-900 text-white py-2 rounded-xl text-[11px] font-bold">{r.status === 'returned' ? 'ثبت بازپرداخت واقعی' : 'مرحله بعدی'}</button>
                {['requested', 'approved', 'quality_check'].includes(r.status) && <button onClick={() => { setRmas(rmas.map((x: any) => x.id === r.id ? { ...x, status: 'rejected' } : x)); log(`رد مرجوعی ${r.id}`, r.id, 'warning'); }} className="px-4 py-2 rounded-xl bg-coral-100 text-coral-700 text-[11px] font-bold">رد درخواست</button>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminSupport() {
  const { tickets, setTickets, darkMode, log } = useAdmin();
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filtered = tickets.filter((t: any) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  const stats = {
    open: tickets.filter((t: any) => t.status === 'open').length,
    pending: tickets.filter((t: any) => t.status === 'pending').length,
    answered: tickets.filter((t: any) => t.status === 'answered').length,
    closed: tickets.filter((t: any) => t.status === 'closed').length,
  };

  const priorityColors: Record<string, string> = { high: 'bg-coral-100 text-coral-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' };
  const priorityLabels: Record<string, string> = { high: 'فوری', medium: 'متوسط', low: 'کم' };
  const statusLabels: Record<string, string> = { open: 'باز', pending: 'در انتظار', answered: 'پاسخ داده شده', closed: 'بسته' };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'تیکت‌های باز', v: faNum(stats.open), c: 'bg-coral-50 text-coral-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'در انتظار پاسخ', v: faNum(stats.pending), c: 'bg-amber-50 text-amber-700', icon: <IconClock className="w-5 h-5" /> },
          { l: 'پاسخ داده شده', v: faNum(stats.answered), c: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="w-5 h-5" /> },
          { l: 'بسته شده', v: faNum(stats.closed), c: 'bg-blue-50 text-blue-700', icon: <IconClipboard className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه وضعیت‌ها</option>
          <option value="open">باز</option>
          <option value="pending">در انتظار</option>
          <option value="answered">پاسخ داده شده</option>
          <option value="closed">بسته</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه اولویت‌ها</option>
          <option value="high">فوری</option>
          <option value="medium">متوسط</option>
          <option value="low">کم</option>
        </select>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filtered.map((t: any) => (
          <div key={t.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 cursor-pointer hover:shadow-lg transition-all`} onClick={() => setSelected(t)}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{t.subject}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${priorityColors[t.priority]}`}>{priorityLabels[t.priority]}</span>
                </div>
                <p className="text-[11px] text-cream-500">{t.customer} | {t.mobile}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${t.status === 'open' ? 'bg-coral-100 text-coral-700' : t.status === 'answered' ? 'bg-emerald-100 text-emerald-700' : t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-cream-100 text-cream-500'}`}>
                {statusLabels[t.status]}
              </span>
            </div>
            <p className="text-[12px] text-brand-700 line-clamp-2">{t.message}</p>
            <div className="flex items-center justify-between mt-3 text-[10px] text-cream-500">
              <span>{dayLabel(new Date(t.createdAt))}</span>
              <span>{t.assignee || 'بدون مسئول'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className={`w-full max-w-lg rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise max-h-[85vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{selected.subject}</h3>
              <button onClick={() => setSelected(null)}><IconX className="w-5 h-5" /></button>
            </div>

            {/* Ticket Info */}
            <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-4 mb-4`}>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-cream-500">مشتری: </span><span className="font-bold">{selected.customer}</span></div>
                <div><span className="text-cream-500">موبایل: </span><span className="tnum">{selected.mobile}</span></div>
                <div><span className="text-cream-500">اولویت: </span><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${priorityColors[selected.priority]}`}>{priorityLabels[selected.priority]}</span></div>
                <div><span className="text-cream-500">مسئول: </span><span className="font-bold">{selected.assignee || '-'}</span></div>
              </div>
            </div>

            {/* Chat History */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {selected.replies?.map((r: any, i: number) => (
                <div key={i} className={`p-3 rounded-xl text-[12px] ${r.from === 'customer' ? (darkMode ? 'bg-[#1a212c]' : 'bg-cream-50') : (darkMode ? 'bg-brand-900/20' : 'bg-brand-50')}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[10px] text-cream-500">{r.from === 'customer' ? 'مشتری' : 'پشتیبانی'}</span>
                    <span className="text-[9px] text-cream-500">{dayLabel(new Date(r.date))}</span>
                  </div>
                  <p className="text-brand-700">{r.text}</p>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="flex gap-2">
              <input value={reply} onChange={e => setReply(e.target.value)} placeholder="پاسخ خود را بنویسید..." className="flex-1 rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
              <button onClick={() => {
                if (!reply.trim()) return;
                const updated = tickets.map((t: any) => t.id === selected.id ? { ...t, replies: [...(t.replies || []), { from: 'support', text: reply, date: new Date().toISOString() }], status: 'answered' } : t);
                setTickets(updated);
                setSelected({ ...selected, status: 'answered', replies: [...(selected.replies || []), { from: 'support', text: reply, date: new Date().toISOString() }] });
                setReply('');
                log(`پاسخ به تیکت ${selected.subject}`, selected.id);
              }} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1">
                <IconSend className="w-4 h-4" /> ارسال
              </button>
            </div>

            {/* Status Change */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-cream-200">
              {['open', 'pending', 'answered', 'closed'].map(s => (
                <button key={s} onClick={() => { setTickets(tickets.map((t: any) => t.id === selected.id ? { ...t, status: s } : t)); setSelected({ ...selected, status: s }); log(`تغییر وضعیت تیکت به ${statusLabels[s]}`, selected.id); }} className={`flex-1 py-2 rounded-xl text-[10px] font-bold ${selected.status === s ? 'bg-brand-900 text-white' : 'bg-cream-100 text-brand-700'}`}>
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminOperations() {
  const { orders, darkMode } = useAdmin();
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const ds = d.toISOString().slice(0, 10); return { day: faNum(d.getDate()), count: orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds).length, revenue: orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds).reduce((s: number, o: any) => s + (o.total || 0), 0) }; });
  
  const avgProcessingTime = 2.5; // hours
  const deliveredOrders = orders.filter((o: any) => o.status === 'delivered');
  const pendingOrders = orders.filter((o: any) => o.status === 'pending' || o.status === 'processing');
  const successRate = orders.length ? (deliveredOrders.length / orders.length * 100).toFixed(1) : 0;

  const operators = [
    { name: 'اپراتور ۱', processed: 45, avgTime: 120 },
    { name: 'اپراتور ۲', processed: 38, avgTime: 135 },
    { name: 'اپراتور ۳', processed: 52, avgTime: 110 },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'سفارش پردازش‌شده', v: faNum(deliveredOrders.length), c: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="w-5 h-5" /> },
          { l: 'در انتظار پردازش', v: faNum(pendingOrders.length), c: 'bg-amber-50 text-amber-700', icon: <IconClock className="w-5 h-5" /> },
          { l: 'میانگین زمان (ساعت)', v: faNum(avgProcessingTime), c: 'bg-blue-50 text-blue-700', icon: <IconClock className="w-5 h-5" /> },
          { l: 'نرخ موفقیت', v: `${faNum(successRate)}٪`, c: 'bg-purple-50 text-purple-700', icon: <IconTrending className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>سفارش‌های ۷ روز اخیر</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
              <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
              <Tooltip contentStyle={{ background: '#0D1221', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11 }} />
              <Bar dataKey="count" fill="#1A2238" radius={[4, 4, 0, 0]} name="تعداد سفارش" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>درآمد ۷ روز اخیر</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
              <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} tickFormatter={(v) => formatPrice(v / 1000000) + 'M'} />
              <Tooltip 
                contentStyle={{ 
                  background: '#1A2238',
                  border: '2px solid #F5C518',
                  borderRadius: 12,
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: '600',
                  fontFamily: 'Vazirmatn',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  direction: 'rtl'
                }}
                itemStyle={{ color: '#ffffff' }}
                labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
                formatter={(value: any) => [formatPrice(value) + ' تومان', '']}
              />
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5C518" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#F5C518" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="revenue" stroke="#F5C518" fillOpacity={1} fill="url(#colorRevenue)" name="درآمد" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operator Performance */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>عملکرد اپراتورها</h3>
        <div className="space-y-3">
          {operators.map((op, i) => (
            <div key={i} className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                    <IconUser className="w-5 h-5 text-brand-700" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-brand-900">{op.name}</p>
                    <p className="text-[10px] text-cream-500">میانگین زمان: {faNum(op.avgTime)} دقیقه</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-extrabold tnum text-brand-900">{faNum(op.processed)}</p>
                  <p className="text-[10px] text-cream-500">سفارش پردازش‌شده</p>
                </div>
              </div>
              <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-900 rounded-full" style={{ width: `${(op.processed / 60) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>آخرین سفارش‌ها</h3>
        <div className="space-y-2">
          {orders.slice(0, 5).map((o: any) => (
            <div key={o.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'}`}>
              <div>
                <p className="text-[12px] font-bold">{o.code}</p>
                <p className="text-[10px] text-cream-500">{o.customer} | {dayLabel(new Date(o.createdAt))}</p>
              </div>
              <div className="text-left">
                <p className="tnum text-[12px] font-bold">{formatPrice(o.total)}</p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${o.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : o.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {o.status === 'delivered' ? 'تحویل شده' : o.status === 'pending' ? 'در انتظار' : 'در حال پردازش'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminSystem() {
  const { roles, audit, loginHistory, errorLog, setErrorLog, integrations, darkMode, log, setIsAdmin, adminIdentity } = useAdmin();
  const [tab, setTab] = useState<'roles' | 'users' | 'audit' | 'security' | 'integrations' | 'backup'>('roles');
  const [auditFilter, setAuditFilter] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [search, setSearch] = useState('');
  const backupRef = useRef<HTMLInputElement>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [userForm, setUserForm] = useState({ id: '', username: '', name: '', roleId: '', password: '' });
  const [userError, setUserError] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState('');

  const loadAdminUsers = () => {
    setUsersLoading(true);
    api.admin.users.list().then(({ items }) => setAdminUsers(items)).catch((error) => {
      setUserError(error instanceof Error ? error.message : 'بارگذاری حساب‌های مدیر ناموفق بود');
    }).finally(() => setUsersLoading(false));
  };

  useEffect(() => {
    if (tab === 'users') loadAdminUsers();
  }, [tab]);

  const saveAdminUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setUserError('');
    try {
      const ownRoleChanged = userForm.id === adminIdentity?.id && userForm.roleId !== adminIdentity.roleId;
      if (userForm.id) {
        const { id, password, ...fields } = userForm;
        await api.admin.users.update(id, { ...fields, ...(password ? { password } : {}) });
      } else {
        await api.admin.users.create(userForm);
      }
      if (ownRoleChanged) {
        window.location.reload();
        return;
      }
      setUserForm({ id: '', username: '', name: '', roleId: '', password: '' });
      loadAdminUsers();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'ذخیره حساب مدیر ناموفق بود');
    }
  };

  const deleteAdminUser = async (id: string) => {
    if (!window.confirm('حساب مدیر حذف شود؟ این عملیات قابل بازگشت نیست.')) return;
    setUserError('');
    try {
      await api.admin.users.delete(id);
      loadAdminUsers();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'حذف حساب مدیر ناموفق بود');
    }
  };

  const stats = {
    totalAudit: audit.length,
    warnings: audit.filter((a: any) => a.severity === 'warning').length,
    criticals: audit.filter((a: any) => a.severity === 'critical').length,
    failedLogins: loginHistory.filter((l: any) => !l.success).length,
    activeErrors: errorLog.filter((e: any) => !e.resolved).length,
    configuredIntegrations: integrations.length,
  };

  const filteredAudit = audit.filter((a: any) => {
    if (auditFilter !== 'all' && a.severity !== auditFilter) return false;
    if (search && !a.action.includes(search) && !a.actor.includes(search)) return false;
    return true;
  });

  const exportBackup = async () => {
    setBackupBusy(true);
    setBackupError('');
    try {
      const data = await api.admin.backup.export();
      downloadFile(JSON.stringify(data, null, 2), `tasis-database-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
      log('خروجی پشتیبان پایگاه‌داده', 'system');
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'تهیه فایل پشتیبان ناموفق بود');
    } finally {
      setBackupBusy(false);
    }
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('فایل پشتیبان بیش از حد بزرگ است');
      e.target.value = '';
      return;
    }
    if (!window.confirm('بازیابی، تمام داده‌های عملیاتی پایگاه‌داده فعلی را جایگزین می‌کند. حساب مدیر جاری حفظ می‌شود. فایل شامل اطلاعات مشتری و hash رمزها است و باید محرمانه نگهداری شود. ادامه می‌دهید؟')) {
      e.target.value = '';
      return;
    }
    setBackupBusy(true);
    setBackupError('');
    try {
      const data = JSON.parse(await file.text());
      await api.admin.backup.restore(data);
      alert('بازیابی پایگاه‌داده انجام شد. صفحه دوباره بارگذاری می‌شود.');
      window.location.reload();
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'بازیابی فایل پشتیبان ناموفق بود');
    } finally {
      setBackupBusy(false);
      e.target.value = '';
    }
  };

  const clearErrors = () => {
    setErrorLog([]);
    log('پاک‌سازی خطاهای فنی', 'system');
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { l: 'کل رویدادها', v: faNum(stats.totalAudit), c: 'bg-blue-50 text-blue-700', icon: <IconClipboard className="w-5 h-5" /> },
          { l: 'هشدارها', v: faNum(stats.warnings), c: 'bg-amber-50 text-amber-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'بحرانی', v: faNum(stats.criticals), c: 'bg-coral-50 text-coral-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'ورود ناموفق', v: faNum(stats.failedLogins), c: 'bg-purple-50 text-purple-700', icon: <IconLock className="w-5 h-5" /> },
          { l: 'خطاهای فعال', v: faNum(stats.activeErrors), c: 'bg-coral-50 text-coral-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'یکپارچگی‌های تعریف‌شده', v: faNum(stats.configuredIntegrations), c: 'bg-emerald-50 text-emerald-700', icon: <IconLink className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[
          { k: 'roles', l: 'نقش‌ها و دسترسی‌ها', icon: <IconUsers className="w-4 h-4" /> },
          { k: 'users', l: 'حساب‌های مدیر', icon: <IconUser className="w-4 h-4" /> },
          { k: 'audit', l: 'لاگ رویدادها', icon: <IconClipboard className="w-4 h-4" /> },
          { k: 'security', l: 'امنیت و ورودها', icon: <IconShield className="w-4 h-4" /> },
          { k: 'integrations', l: 'یکپارچگی‌ها', icon: <IconLink className="w-4 h-4" /> },
          { k: 'backup', l: 'پشتیبان‌گیری', icon: <IconDownload className="w-4 h-4" /> }
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 flex items-center gap-1.5 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>
            {t.icon}{t.l}
          </button>
        ))}
      </div>

      {/* Roles Tab */}
      {tab === 'roles' && (
        <div className="space-y-4">
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-800">دسترسی حساب‌ها براساس نقش اختصاص‌یافته در سرور اعمال می‌شود. دسترسی مؤثر پس از تغییر نقش در درخواست بعدی به‌روزرسانی خواهد شد.</p>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>نقش‌های سیستمی</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roles.map((r: any) => (
                <div key={r.id} className={`rounded-xl border-2 ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-cream-50'} p-4 hover:shadow-lg transition-all`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: r.color }}>
                        <IconUsers className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{r.name}</p>
                        <p className="text-[10px] text-cream-500">{faNum(r.sections.length)} بخش قابل دسترسی</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.sections.slice(0, 5).map((s: string) => (
                      <span key={s} className="text-[9px] bg-white rounded-full px-2 py-0.5 text-brand-700">{s}</span>
                    ))}
                    {r.sections.length > 5 && <span className="text-[9px] bg-white rounded-full px-2 py-0.5 text-brand-700">+{faNum(r.sections.length - 5)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <form onSubmit={saveAdminUser} className={`grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`md:col-span-2 text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{userForm.id ? 'ویرایش حساب مدیر' : 'ایجاد حساب مدیر'}</h3>
            <input required disabled={Boolean(userForm.id)} value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} placeholder="نام کاربری" className="rounded-xl border border-cream-300 px-3 py-2 text-[12px]" />
            <input required value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} placeholder="نام نمایشی" className="rounded-xl border border-cream-300 px-3 py-2 text-[12px]" />
            <select required value={userForm.roleId} onChange={e => setUserForm({ ...userForm, roleId: e.target.value })} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px]">
              <option value="">انتخاب نقش</option>
              {roles.map((role: any) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            <input required={!userForm.id} type="password" minLength={12} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder={userForm.id ? 'رمز جدید (اختیاری، حداقل ۱۲ کاراکتر)' : 'رمز عبور (حداقل ۱۲ کاراکتر)'} className="rounded-xl border border-cream-300 px-3 py-2 text-[12px]" />
            {userError && <p className="md:col-span-2 text-[12px] font-bold text-coral-600">{userError}</p>}
            <div className="md:col-span-2 flex gap-2">
              <button disabled={usersLoading} className="rounded-xl bg-brand-900 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50">{userForm.id ? 'ذخیره تغییرات' : 'ایجاد حساب'}</button>
              {userForm.id && <button type="button" onClick={() => setUserForm({ id: '', username: '', name: '', roleId: '', password: '' })} className="rounded-xl border border-cream-300 px-4 py-2 text-[12px] font-bold">انصراف</button>}
            </div>
          </form>
          <div className={`overflow-x-auto rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'}`}>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-cream-300 text-start"><th className="p-3 text-start">نام کاربری</th><th className="p-3 text-start">نام</th><th className="p-3 text-start">نقش</th><th className="p-3 text-start">عملیات</th></tr></thead>
              <tbody>{adminUsers.map((user: any) => (
                <tr key={user.id} className="border-b border-cream-100">
                  <td className="p-3">{user.username}{user.id === adminIdentity?.id ? ' (شما)' : ''}</td>
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.roleName || 'بدون نقش'}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => setUserForm({ id: user.id, username: user.username, name: user.name, roleId: user.roleId || '', password: '' })} className="font-bold text-brand-700">ویرایش</button>
                    <button disabled={user.id === adminIdentity?.id} onClick={() => deleteAdminUser(user.id)} className="font-bold text-coral-600 disabled:opacity-40">حذف</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {usersLoading && <p className="p-4 text-[11px] text-cream-500">در حال بارگذاری...</p>}
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو در رویدادها..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
            <select value={auditFilter} onChange={e => setAuditFilter(e.target.value as any)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
              <option value="all">همه شدت‌ها</option>
              <option value="normal">عادی</option>
              <option value="warning">هشدار</option>
              <option value="critical">بحرانی</option>
            </select>
            <button onClick={() => downloadFile(toExcel(filteredAudit.map((a: any) => ({ 'رویداد': a.action, 'کاربر': a.actor, 'نقش': a.role, 'هدف': a.target, 'شدت': a.severity, 'تاریخ': dayLabel(new Date(a.at)) })), 'لاگ رویدادها'), 'audit-log.xls', 'application/vnd.ms-excel')} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-cream-300 text-[11px] font-bold"><IconDownload className="w-3.5 h-3.5" />خروجی اکسل</button>
          </div>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">رویداد</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کاربر</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نقش</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">هدف</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">شدت</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.slice(0, 50).map((a: any) => (
                    <tr key={a.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                      <td className="py-2.5 px-3 font-bold">{a.action}</td>
                      <td className="py-2.5 px-3">{a.actor}</td>
                      <td className="py-2.5 px-3 text-[11px]">{a.role}</td>
                      <td className="py-2.5 px-3 text-[11px] font-mono">{a.target}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${a.severity === 'critical' ? 'bg-coral-100 text-coral-700' : a.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {a.severity === 'critical' ? 'بحرانی' : a.severity === 'warning' ? 'هشدار' : 'عادی'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-cream-500">{dayLabel(new Date(a.at))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {tab === 'security' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>تاریخچه ورود کاربران</h3>
            <div className="space-y-2">
              {loginHistory.map((l: any) => (
                <div key={l.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${l.success ? 'bg-emerald-100' : 'bg-coral-100'}`}>
                      <IconUser className={`w-5 h-5 ${l.success ? 'text-emerald-700' : 'text-coral-700'}`} />
                    </div>
                    <div>
                      <p className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{l.user}</p>
                      <p className="text-[10px] text-cream-500">{l.role} | {l.ip} | {l.browser}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${l.success ? 'bg-emerald-100 text-emerald-700' : 'bg-coral-100 text-coral-700'}`}>
                      {l.success ? 'موفق' : 'ناموفق'}
                    </span>
                    <p className="text-[10px] text-cream-500 mt-1">{dayLabel(new Date(l.time))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>خطاهای فنی</h3>
              {errorLog.length > 0 && (
                <button onClick={clearErrors} className="px-3 py-1.5 rounded-xl bg-coral-100 text-coral-700 text-[11px] font-bold">پاک‌سازی همه</button>
              )}
            </div>
            {errorLog.length === 0 ? (
              <p className="text-[12px] text-cream-500 text-center py-8">هیچ خطای فنی ثبت نشده است</p>
            ) : (
              <div className="space-y-2">
                {errorLog.map((e: any) => (
                  <div key={e.id} className={`flex items-center justify-between p-3 rounded-xl ${e.resolved ? (darkMode ? 'bg-[#1a212c]' : 'bg-cream-50') : 'bg-coral-50 border border-coral-200'}`}>
                    <div className="flex items-center gap-3">
                      <IconAlert className={`w-5 h-5 ${e.resolved ? 'text-cream-500' : 'text-coral-600'}`} />
                      <div>
                        <p className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{e.message}</p>
                        <p className="text-[10px] text-cream-500">{dayLabel(new Date(e.time))}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${e.resolved ? 'bg-emerald-100 text-emerald-700' : 'bg-coral-100 text-coral-700'}`}>
                      {e.resolved ? 'حل شده' : 'فعال'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {tab === 'integrations' && (
        <div className="space-y-3">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">وضعیت‌های این فهرست اتصال زنده را تأیید نمی‌کنند. سلامت سرویس‌ها باید از پیکربندی امن سرور و آزمون اتصال واقعی بررسی شود؛ این پنل هنوز آزمون اتصال ندارد.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {integrations.map((i: any) => (
            <div key={i.id} className={`rounded-2xl border-2 ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-200 bg-white'} p-5 hover:shadow-lg transition-all`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cream-100">
                    <IconLink className="w-6 h-6 text-cream-500" />
                  </div>
                  <div>
                    <p className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{i.name}</p>
                    <p className="text-[10px] text-cream-500">{i.type === 'payment' ? 'درگاه پرداخت' : 'سرویس ارسال'}</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 text-[11px] font-bold">تأییدنشده</span>
              </div>
              <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cream-500">تعداد تراکنش:</span>
                  <span className="font-bold">نامشخص</span>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Backup Tab */}
      {tab === 'backup' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
              <IconDownload className="w-6 h-6 text-brand-700" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>پشتیبان‌گیری و بازیابی</h3>
              <p className="text-[11px] text-cream-500">نسخه کامل جداول PostgreSQL</p>
            </div>
          </div>
          <p className="text-[12px] text-brand-700 leading-6">فایل پشتیبان شامل تمام جداول عملیاتی، اطلاعات مشتریان و hash رمز حساب‌های مدیر است. فایل را رمزگذاری و در محل امن نگهداری کنید؛ این قابلیت جایگزین نسخه پشتیبان زمان‌بندی‌شده و خارج از سرور نیست.</p>
          {backupError && <p className="rounded-xl bg-coral-50 p-3 text-[12px] font-bold text-coral-700">{backupError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button disabled={backupBusy} onClick={exportBackup} className="flex items-center justify-center gap-2 bg-brand-900 text-white px-4 py-3 rounded-xl text-[12px] font-bold shadow-lg shadow-brand-900/25 hover:bg-brand-950 transition-colors disabled:opacity-50">
              <IconDownload className="w-5 h-5" />{backupBusy ? 'در حال انجام...' : 'دانلود فایل پشتیبان'}
            </button>
            <input ref={backupRef} type="file" accept=".json" onChange={importBackup} className="hidden" />
            <button disabled={backupBusy} onClick={() => backupRef.current?.click()} className="flex items-center justify-center gap-2 border-2 border-brand-900 text-brand-900 px-4 py-3 rounded-xl text-[12px] font-bold hover:bg-brand-50 transition-colors disabled:opacity-50">
              <IconUpload className="w-5 h-5" />بازیابی از فایل
            </button>
          </div>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <IconAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold text-amber-700 mb-1">توجه مهم</p>
                <p className="text-[11px] text-amber-600 leading-5">بازیابی در تراکنش انجام می‌شود و در صورت نامعتبر بودن هر جدول، همه تغییرها rollback می‌شوند. حساب جاری و نقش مدیر سیستمی آن حفظ خواهد شد. برای آمادگی پروداکشن، ذخیره‌سازی خارج از سرور و زمان‌بندی خودکار backup همچنان لازم است.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminSettings() {
  const { darkMode } = useAdmin();
  const { settings, setSettings: setShopSettings, addToast } = useShop();
  const [form, setForm] = useState({ ...settings });
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setForm({ ...settings }); }, [settings]);

  const save = async () => {
    try {
      const saved = await api.catalog.updateSettings(form);
      setShopSettings(saved);
      addToast('success', 'تنظیمات فروشگاه ذخیره شد');
    } catch (error: any) {
      addToast('danger', `ذخیره تنظیمات ناموفق بود: ${error.message}`);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onload = (ev) => setForm({ ...form, logo: ev.target?.result as string }); reader.readAsDataURL(file); }
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>اطلاعات فروشگاه</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">نام فروشگاه</label><input value={form.storeName} onChange={e => setForm({ ...form, storeName: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">تلفن پشتیبانی</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">ایمیل</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">آدرس</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
        </div>
        <div className="mt-4">
          <label className="text-[11px] font-bold text-cream-500 mb-1 block">لوگوی سایت</label>
          <div className="flex items-center gap-3">
            {form.logo && <img src={form.logo} className="w-12 h-12 rounded-xl object-cover" alt="logo" />}
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button onClick={() => logoRef.current?.click()} className="border border-cream-300 rounded-xl px-3 py-2 text-[11px] font-bold flex items-center gap-1"><IconUpload className="w-4 h-4" />آپلود لوگو</button>
          </div>
        </div>
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>هزینه‌های ارسال</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">آستانه ارسال رایگان (تومان)</label><input type="number" value={form.freeShippingThreshold} onChange={e => setForm({ ...form, freeShippingThreshold: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">هزینه ارسال عادی (تومان)</label><input type="number" value={form.shippingCost} onChange={e => setForm({ ...form, shippingCost: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
        </div>
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>مالیات و کارمزدها</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">مالیات بر ارزش افزوده (٪)</label><input type="number" value={form.vatRate} onChange={e => setForm({ ...form, vatRate: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">کارمزد درگاه (٪)</label><input type="number" value={form.gatewayFee} onChange={e => setForm({ ...form, gatewayFee: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
        </div>
        <label className="flex items-center gap-2 mt-3 text-[12px]"><input type="checkbox" checked={form.showPricesWithTax} onChange={e => setForm({ ...form, showPricesWithTax: e.target.checked })} />نمایش قیمت‌ها با احتساب مالیات</label>
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>نوار اطلاعیه</h3>
        <label className="flex items-center gap-2 text-[12px] mb-2"><input type="checkbox" checked={form.tickerTexts?.length > 0} onChange={e => setForm({ ...form, tickerTexts: e.target.checked ? ['ارسال رایگان برای خرید بالای ۱.۵ میلیون تومان'] : [] })} />نمایش نوار اطلاعیه</label>
        <input value={form.tickerTexts?.join(' | ') || ''} onChange={e => setForm({ ...form, tickerTexts: e.target.value.split('|').map(s => s.trim()).filter(Boolean) })} placeholder="متن‌ها با | جدا شوند" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>بنرهای صفحه اصلی</h3>
        <p className="text-[11px] text-cream-500">بنرهای فعال از بخش «مدیریت محتوا» مدیریت می‌شوند و پس از ذخیره در صفحه اصلی نمایش داده خواهند شد.</p>
      </div>
      <div className={`rounded-2xl border border-coral-200 bg-coral-50 p-5`}>
        <h3 className="text-sm font-bold text-coral-700 mb-2">تنظیمات محلی این مرورگر</h3>
        <p className="text-[11px] text-coral-600 mb-3">پاک‌سازی فقط نشست ورود و ترجیحات محلی این مرورگر را حذف می‌کند؛ سفارش‌ها و داده‌های پایگاه‌داده سرور تغییر نمی‌کنند.</p>
        <button onClick={() => { if (confirm('نشست ادمین و ترجیحات ذخیره‌شده فقط در این مرورگر پاک شوند؟ داده‌های سرور دست‌نخورده می‌مانند.')) { localStorage.clear(); window.location.reload(); } }} className="bg-coral-500 text-white px-4 py-2 rounded-xl text-[12px] font-bold">پاک‌سازی داده‌های محلی</button>
      </div>
      <button onClick={save} className="bg-brand-900 text-white px-6 py-3 rounded-xl font-extrabold text-sm shadow-lg shadow-brand-900/25">ذخیره تنظیمات</button>
    </div>
  );
}

function AdminInsights() {
  const { orders, darkMode, searchTerms } = useAdmin();
  const { products } = useShop();
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const ds = d.toISOString().slice(0, 10); return { day: faNum(d.getDate()), revenue: orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds).reduce((s: number, o: any) => s + (o.total || 0), 0) }; });
  const avg = last7.reduce((a, b) => a + b.revenue, 0) / 7;
  const slope = (last7[6].revenue - last7[0].revenue) / 7;
  const forecast = Array.from({ length: 7 }, (_, i) => ({ day: faNum(i + 8), value: Math.max(0, Math.round(avg + slope * (i + 1))) }));
  const stdDev = Math.sqrt(last7.reduce((s, d) => s + (d.revenue - avg) ** 2, 0) / 7);
  const anomalies = last7.filter(d => Math.abs(d.revenue - avg) > 1.5 * stdDev && d.revenue > 0);
  const stockRisks = products.filter(p => p.stock > 0 && p.sales > 0 && p.stock / (p.sales / 30) < 7).sort((a, b) => (a.stock / (a.sales / 30)) - (b.stock / (b.sales / 30)));

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'روند فروش', v: slope > 0 ? 'صعودی' : slope < 0 ? 'نزولی' : 'ثابت', c: slope > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-coral-50 text-coral-700', icon: <IconTrending className="w-5 h-5" /> },
          { l: 'ناهنجاری‌ها', v: faNum(anomalies.length), c: 'bg-amber-50 text-amber-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'هشدار موجودی', v: faNum(stockRisks.length), c: 'bg-coral-50 text-coral-700', icon: <IconPackage className="w-5 h-5" /> },
          { l: 'پیش‌بینی هفته', v: formatPrice(forecast.reduce((a, b) => a + b.value, 0)), c: 'bg-blue-50 text-blue-700', icon: <IconChart className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-cream-500">{k.l}</p><div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div></div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Forecast Chart */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>پیش‌بینی فروش ۷ روز آینده</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={forecast}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
            <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} tickFormatter={(v) => formatPrice(v / 1000000) + 'M'} />
            <Tooltip contentStyle={{ background: '#0D1221', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11 }} formatter={(v: any) => formatPrice(v) + ' تومان'} />
            <defs><linearGradient id="colorFc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F5C518" stopOpacity={0.8}/><stop offset="95%" stopColor="#F5C518" stopOpacity={0}/></linearGradient></defs>
            <Area type="monotone" dataKey="value" stroke="#F5C518" fillOpacity={1} fill="url(#colorFc)" name="پیش‌بینی" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-3 mt-4 text-center">
          <div><p className="text-[10px] text-cream-500">میانگین روزانه</p><p className="tnum text-[13px] font-bold">{formatPrice(avg)}</p></div>
          <div><p className="text-[10px] text-cream-500">پیشنهاد انبار</p><p className={`text-[13px] font-bold ${slope > 0 ? 'text-emerald-600' : 'text-coral-600'}`}>{slope > 0 ? 'افزایش موجودی' : 'کاهش سفارش'}</p></div>
          <div><p className="text-[10px] text-cream-500">اوج تقاضا</p><p className="text-[13px] font-bold">{slope > 0 ? 'پایان هفته' : 'اوایل هفته'}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Anomalies */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>ناهنجاری‌های شناسایی‌شده</h3>
          {anomalies.length > 0 ? (
            <div className="space-y-2">{anomalies.map((a, i) => (
              <div key={i} className={`p-3 rounded-xl ${a.revenue > avg ? 'bg-emerald-50 border border-emerald-200' : 'bg-coral-50 border border-coral-200'}`}>
                <div className="flex items-center justify-between"><span className="text-[11px] font-bold">{a.revenue > avg ? 'رشد غیرمنتظره' : 'افت غیرمنتظره'}</span><span className="text-[10px] text-cream-500">روز {a.day}</span></div>
                <p className="tnum text-[13px] font-extrabold mt-1">{formatPrice(a.revenue)} تومان</p>
              </div>
            ))}</div>
          ) : <p className="text-[12px] text-cream-500 text-center py-4">ناهنجاری شناسایی نشد</p>}
        </div>

        {/* Stock Risks */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>هشدار اتمام موجودی</h3>
          {stockRisks.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">{stockRisks.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl bg-coral-50 border border-coral-200">
                <img src={p.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                <div className="flex-1"><p className="text-[11px] font-bold">{p.name}</p><p className="text-[10px] text-cream-500">{p.brand}</p></div>
                <div className="text-left"><p className="tnum text-[12px] font-extrabold text-coral-600">{faNum(p.stock)}</p><p className="text-[9px] text-cream-500">روز باقی: {faNum(Math.max(1, Math.round(p.stock / (p.sales / 30))))}</p></div>
              </div>
            ))}</div>
          ) : <p className="text-[12px] text-cream-500 text-center py-4">همه محصولات موجودی کافی دارند</p>}
        </div>
      </div>

      {/* Search Terms */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>پرجستجوترین عبارات کاربران</h3>
        <div className="flex flex-wrap gap-2">
          {searchTerms.slice(0, 12).map((t: any, i: number) => (
            <span key={i} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${t.trending ? 'bg-brand-900 text-white' : darkMode ? 'bg-white/10 text-brand-300' : 'bg-cream-100 text-brand-700'}`}>
              {t.term} <span className="tnum opacity-70">({faNum(t.count)})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminAffiliates() {
  const { affiliates, setAffiliates, payouts, setPayouts, affConf, setAffConf, darkMode, log } = useAdmin();
  const { addToast } = useShop();
  const [tab, setTab] = useState<'affiliates' | 'payouts' | 'config' | 'tools'>('affiliates');
  const [linkDestination, setLinkDestination] = useState(window.location.origin);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [commissionReviews, setCommissionReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (tab !== 'payouts') return;
    setLoadingReviews(true);
    api.affiliate.reviewQueue()
      .then((result) => setCommissionReviews(result.items))
      .catch((error: any) => addToast('danger', `بارگذاری پورسانت‌های در انتظار بررسی ناموفق بود: ${error.message}`))
      .finally(() => setLoadingReviews(false));
  }, [tab, addToast]);
  
  const totalSales = affiliates.reduce((s: number, a: any) => s + a.sales, 0);
  const totalCommission = affiliates.reduce((s: number, a: any) => s + a.commission, 0);
  const flaggedCount = affiliates.filter((a: any) => a.flagged).length;
  const levelColors: Record<string, string> = { silver: 'bg-gray-100 text-gray-700', gold: 'bg-amber-100 text-amber-700', platinum: 'bg-purple-100 text-purple-700' };
  const levelLabels: Record<string, string> = { silver: 'نقره‌ای', gold: 'طلایی', platinum: 'پلاتینیوم' };
  const addAffiliate = () => {
    const name = window.prompt('نام بازاریاب را وارد کنید:')?.trim();
    if (!name) return;
    const mobile = window.prompt('شماره موبایل بازاریاب را وارد کنید:')?.trim();
    if (!mobile) return;
    const id = `af-${crypto.randomUUID()}`;
    const refCode = `AF${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    setAffiliates([...affiliates, { id, name, mobile, refCode, level: 'silver', active: true, flagged: false, clicks: 0, orders: 0, sales: 0, commission: 0 }]);
    log(`ایجاد بازاریاب ${name}`, id);
  };
  const generateAffiliateLink = () => {
    const affiliate = affiliates.find((item: any) => item.id === selectedAffiliateId && item.active);
    if (!affiliate) return;
    try {
      const target = new URL(linkDestination, window.location.origin);
      if (target.origin !== window.location.origin) throw new Error('invalid_origin');
      target.searchParams.set('ref', affiliate.refCode);
      setGeneratedLink(target.toString());
    } catch {
      window.alert('آدرس مقصد باید در همین دامنهٔ فروشگاه باشد');
    }
  };
  const copyAffiliateLink = async () => {
    if (!navigator.clipboard) {
      window.prompt('لینک را کپی کنید:', generatedLink);
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedLink);
      window.alert('لینک کپی شد');
    } catch {
      window.prompt('کپی خودکار در دسترس نیست؛ لینک را کپی کنید:', generatedLink);
    }
  };
  const availablePayoutAmount = (affiliate: any) => {
    const reserved = payouts
      .filter((payout: any) => payout.affiliateId === affiliate.id && ['pending', 'paid'].includes(payout.status))
      .reduce((sum: number, payout: any) => sum + Number(payout.amount || 0), 0);
    return Math.max(0, Number(affiliate.commission || 0) - reserved - Number(affiliate.reviewRequiredCommission || 0));
  };
  const createAffiliatePayout = (affiliate: any) => {
    const amount = availablePayoutAmount(affiliate);
    if (amount < Number(affConf?.minWithdraw || 0)) return;
    setPayouts([...payouts, {
      id: `po-${crypto.randomUUID()}`,
      source: 'affiliate_commission',
      affiliateId: affiliate.id,
      amount,
      status: 'pending',
      tracking: '',
      date: new Date().toISOString(),
    }]);
  };
  const resolveCommissionReview = async (commission: any, decision: 'approved' | 'rejected') => {
    try {
      await api.affiliate.reviewCommission(commission.id, decision);
      const [reviewResult, affiliateResult, payoutResult] = await Promise.all([
        api.affiliate.reviewQueue(),
        api.affiliate.affiliates.list(),
        api.affiliate.payouts.list(),
      ]);
      setCommissionReviews(reviewResult.items);
      setAffiliates(affiliateResult.items);
      setPayouts(payoutResult.items);
      const outcome = decision === 'approved' ? 'تأیید شد و برای تسویه آزاد شد' : 'رد شد و از مبلغ پورسانت کسر شد';
      log(`بررسی پورسانت سفارش ${commission.orderCode}: ${outcome}`, commission.id, decision === 'approved' ? 'info' : 'warning');
      addToast('success', `پورسانت سفارش ${commission.orderCode} ${outcome}`);
    } catch (error: any) {
      addToast('danger', `ثبت نتیجه بررسی پورسانت ناموفق بود: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'کل بازاریابان', v: faNum(affiliates.length), c: 'bg-blue-50 text-blue-700', icon: <IconUsers className="w-5 h-5" /> },
          { l: 'فروش کل', v: formatPrice(totalSales), c: 'bg-emerald-50 text-emerald-700', icon: <IconTrending className="w-5 h-5" /> },
          { l: 'پورسانت کل', v: formatPrice(totalCommission), c: 'bg-purple-50 text-purple-700', icon: <IconDollar className="w-5 h-5" /> },
          { l: 'هشدار تقلب', v: faNum(flaggedCount), c: 'bg-coral-50 text-coral-700', icon: <IconAlert className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-cream-500">{k.l}</p><div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div></div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[{ k: 'affiliates', l: 'بازاریابان' }, { k: 'payouts', l: 'تسویه‌ها' }, { k: 'config', l: 'پیکربندی پورسانت' }, { k: 'tools', l: 'ابزار تبلیغاتی' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>{t.l}</button>
        ))}
      </div>

      {/* Affiliates Tab */}
      {tab === 'affiliates' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
          <div className="flex justify-end p-3">
            <button onClick={addAffiliate} className="rounded-xl bg-brand-900 px-4 py-2 text-[11px] font-bold text-white">افزودن بازاریاب</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نام</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کد معرف</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">سطح</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کلیک</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">سفارش</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نرخ تبدیل</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">فروش</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">پورسانت</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت</th>
              </tr></thead>
              <tbody>{affiliates.map((a: any) => {
                const convRate = a.clicks > 0 ? ((a.orders / a.clicks) * 100).toFixed(1) : '0';
                return (
                <tr key={a.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} ${a.flagged ? 'bg-coral-50/50' : ''}`}>
                  <td className="py-2.5 px-3 font-bold">{a.name}{a.flagged && <IconAlert className="w-3 h-3 text-coral-500 inline me-1" />}</td>
                  <td className="py-2.5 px-3 tnum font-mono text-brand-700">{a.refCode}</td>
                  <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${levelColors[a.level]}`}>{levelLabels[a.level]}</span></td>
                  <td className="py-2.5 px-3 tnum">{faNum(a.clicks)}</td>
                  <td className="py-2.5 px-3 tnum">{faNum(a.orders)}</td>
                  <td className="py-2.5 px-3 tnum">{faNum(convRate)}٪</td>
                  <td className="py-2.5 px-3 tnum">{formatPrice(a.sales)}</td>
                  <td className="py-2.5 px-3 tnum font-bold">{formatPrice(a.commission)}</td>
                  <td className="py-2.5 px-3">
                    <button onClick={() => { setAffiliates(affiliates.map((x: any) => x.id === a.id ? { ...x, active: !x.active } : x)); log(`${a.active ? 'مسدود' : 'فعال'} کردن بازاریاب ${a.name}`, a.id); }} className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${a.active ? 'bg-emerald-100 text-emerald-700' : 'bg-coral-100 text-coral-700'}`}>{a.active ? 'فعال' : 'مسدود'}</button>
                  </td>
                </tr>);
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {tab === 'payouts' && (
        <div className="space-y-3">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
            ثبت پرداخت فقط ثبت دستیِ حواله‌ای است که خارج از سامانه انجام شده؛ انتقال بانکی از این پنل انجام یا تأیید نمی‌شود. پورسانت سفارش‌های دارای بازپرداخت تا بررسی دستی قابل تسویه نیست و پورسانت‌های قبلاً پرداخت‌شده خودکار پس گرفته نمی‌شوند.
          </p>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <h3 className="mb-3 text-[12px] font-bold">پورسانت‌های قابل تسویه</h3>
            {affiliates.filter((affiliate: any) => availablePayoutAmount(affiliate) > 0 && availablePayoutAmount(affiliate) >= Number(affConf?.minWithdraw || 0)).map((affiliate: any) => {
              const available = availablePayoutAmount(affiliate);
              return (
                <div key={affiliate.id} className="mb-2 flex items-center justify-between rounded-lg bg-cream-50 p-3">
                  <span className="text-[11px]">{affiliate.name} · {formatPrice(available)} تومان</span>
                  <button onClick={() => createAffiliatePayout(affiliate)} className="rounded-lg bg-brand-900 px-3 py-1.5 text-[10px] font-bold text-white">ایجاد درخواست تسویه</button>
                </div>
              );
            })}
            {affiliates.some((affiliate: any) => Number(affiliate.reviewRequiredCommission || 0) > 0) && (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
                <p>پورسانت سفارش‌های مرجوعی تا بررسی دستی از مبلغ قابل تسویه خارج است. اگر پیش‌تر در تسویهٔ در انتظار رزرو شده، آن تسویه را رد کنید تا پورسانت‌های عادی آزاد شوند.</p>
                {affiliates.filter((affiliate: any) => Number(affiliate.reviewRequiredCommission || 0) > 0).map((affiliate: any) => (
                  <p key={affiliate.id} className="mt-1 font-bold">{affiliate.name}: {formatPrice(affiliate.reviewRequiredCommission)} تومان در انتظار بررسی</p>
                ))}
              </div>
            )}
          </div>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <h3 className="mb-1 text-[12px] font-bold">پورسانت‌های متوقف‌شده برای بررسی مرجوعی</h3>
            <p className="mb-3 text-[10px] leading-5 text-cream-500">تأیید، پورسانت را دوباره قابل تسویه می‌کند؛ رد استحقاق، پورسانت پرداخت‌نشده را از مانده حذف می‌کند. پورسانت حواله‌شدهٔ قبلی تغییر نمی‌کند. اگر پورسانت در تسویهٔ درانتظار رزرو شده باشد، ابتدا همان تسویه را رد کنید.</p>
            {loadingReviews ? <p className="text-[11px] text-cream-500">در حال بارگذاری...</p> : commissionReviews.length === 0 ? (
              <p className="text-[11px] text-cream-500">پورسانت متوقف‌شده‌ای برای بررسی وجود ندارد.</p>
            ) : commissionReviews.map((commission: any) => (
              <div key={commission.id} className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3">
                <div className="text-[11px]">
                  <p className="font-bold">{commission.affiliateName} · سفارش {commission.orderCode}</p>
                  <p className="mt-1 text-cream-600">بازپرداخت ثبت‌شده: {formatPrice(commission.refundedAmount)} تومان · پورسانت متوقف‌شده: {formatPrice(commission.commissionAmount)} تومان</p>
                  {commission.payoutId && <p className="mt-1 font-bold text-amber-800">در تسویهٔ درانتظار رزرو شده است؛ ابتدا تسویه را رد کنید.</p>}
                </div>
                {!commission.payoutId && (
                  <div className="flex gap-2">
                    <button onClick={() => resolveCommissionReview(commission, 'approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-bold text-white">تأیید و آزادسازی</button>
                    <button onClick={() => resolveCommissionReview(commission, 'rejected')} className="rounded-lg bg-coral-100 px-3 py-2 text-[10px] font-bold text-coral-700">رد استحقاق</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {payouts.map((p: any) => {
            const aff = affiliates.find((a: any) => a.id === p.affiliateId);
            return (
              <div key={p.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 flex items-center justify-between hover:shadow-md transition-all`}>
                <div>
                  <p className="text-[12px] font-bold">{aff?.name || 'نامشخص'}</p>
                  <p className="text-[10px] text-cream-500 mt-1">تاریخ: {dayLabel(new Date(p.date))} | کد پیگیری: {p.tracking || '-'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tnum text-[13px] font-extrabold">{formatPrice(p.amount)} تومان</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : p.status === 'rejected' ? 'bg-coral-100 text-coral-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.status === 'paid' ? 'پرداخت شده' : p.status === 'rejected' ? 'رد شده' : p.reviewRequired ? 'توقف تا بررسی مرجوعی' : 'در انتظار'}
                  </span>
                  {p.status === 'pending' && (
                    <div className="flex gap-1">
                          {!p.reviewRequired && <button onClick={() => {
                            const reference = window.prompt('پس از انجام حواله خارج از سامانه، شماره پیگیری بانکی را وارد کنید:');
                            if (!reference?.trim()) return;
                            setPayouts((current) => current.map((x: any) => x.id === p.id ? { ...x, status: 'paid', tracking: reference.trim() } : x));
                            log(`ثبت پرداخت پورسانت ${aff?.name}`, p.id);
                          }} className="px-2 py-1 rounded-lg bg-brand-900 text-white text-[10px] font-bold">ثبت حواله انجام‌شده</button>}
                      <button onClick={() => { setPayouts((current) => current.map((x: any) => x.id === p.id ? { ...x, status: 'rejected' } : x)); }} className="px-2 py-1 rounded-lg bg-coral-100 text-coral-700 text-[10px] font-bold">رد</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Config Tab */}
      {tab === 'config' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>پیکربندی پورسانت</h3>
          {affConf ? <div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">نرخ پایه (٪)</label><input type="number" value={affConf.baseRate} onChange={e => setAffConf({ ...affConf, baseRate: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
            <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">اعتبار کوکی (روز)</label><input type="number" value={affConf.cookieDays} onChange={e => setAffConf({ ...affConf, cookieDays: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
            <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">حداقل مبلغ برداشت</label><input type="number" value={affConf.minWithdraw} onChange={e => setAffConf({ ...affConf, minWithdraw: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
            <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">سقف پورسانت هر سفارش</label><input type="number" value={affConf.maxPerOrder} onChange={e => setAffConf({ ...affConf, maxPerOrder: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          </div>
          <h4 className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mt-4 mb-2`}>پاداش سطح</h4>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(affConf.levelBonus).map(([level, bonus]) => (
              <div key={level}><label className="text-[10px] text-cream-500 mb-1 block">{levelLabels[level] || level} (٪ اضافی)</label><input type="number" value={bonus as number} onChange={e => setAffConf({ ...affConf, levelBonus: { ...affConf.levelBonus, [level]: +e.target.value } })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
            ))}
          </div>
          </div> : <p className="text-[11px] text-amber-700">پیکربندی پورسانت در دسترس نیست یا هنوز بارگذاری نشده است.</p>}
        </div>
      )}

      {/* Tools Tab */}
      {tab === 'tools' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>تولید لینک عمیق</h3>
            <p className="mb-3 rounded-lg bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-800">بازدید از لینک ثبت می‌شود و انتساب آخرین کلیک معتبر تا پایان مهلت کوکی برای سفارش پرداخت‌شده حفظ خواهد شد.</p>
            <div className="flex gap-2">
              <input value={linkDestination} onChange={e => setLinkDestination(e.target.value)} placeholder="آدرس مقصد" className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <select value={selectedAffiliateId} onChange={e => setSelectedAffiliateId(e.target.value)} className="rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none">
                <option value="">انتخاب بازاریاب</option>
                {affiliates.filter((a: any) => a.active).map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.refCode})</option>)}
              </select>
              <button onClick={generateAffiliateLink} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold">تولید لینک</button>
            </div>
            {generatedLink && <div className="mt-3 flex gap-2"><input readOnly value={generatedLink} className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[11px]" /><button onClick={copyAffiliateLink} className="rounded-xl border border-cream-300 px-3 py-2 text-[11px] font-bold">کپی</button></div>}
          </div>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>کتابخانه بنرها</h3>
            <p className="mb-3 text-[11px] text-cream-500">فایل بنر قابل دانلودی بارگذاری نشده است.</p>
            <div className="grid grid-cols-3 gap-3">
              {[{ w: '728x90', l: 'بنر افقی' }, { w: '300x300', l: 'بنر مربع' }, { w: '160x600', l: 'بنر عمودی' }].map((b, i) => (
                <div key={i} className={`rounded-xl border-2 border-dashed ${darkMode ? 'border-white/20' : 'border-cream-300'} p-4 text-center`}>
                  <div className="bg-brand-100 rounded-lg mb-2 flex items-center justify-center" style={{ height: '60px' }}><span className="text-[10px] text-brand-700">{b.w}</span></div>
                  <p className="text-[11px] font-bold">{b.l}</p>
                  <button disabled className="mt-2 text-[10px] font-bold text-brand-600 disabled:opacity-50">دانلود</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPOS() {
  const { products, setProducts, settings, addToast } = useShop();
  const { darkMode, log, setOrders } = useAdmin();
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [customerName, setCustomerName] = useState('مشتری حضوری');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const saleId = useRef<string | null>(null);
  const filtered = products.filter(p => p.effective && p.stock > 0 && (!catFilter || p.category === catFilter) && (!search || p.name.includes(search)));

  const addItem = (p: Product) => {
    const existing = cart.find(c => c.id === p.id);
    if (existing) {
      if (existing.qty >= p.stock) return;
      setCart(cart.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { id: p.id, name: p.name, price: finalPrice(p.price, p.discount), qty: 1, image: p.image }]);
    }
  };

  const removeItem = (idx: number) => setCart(cart.filter((_, i) => i !== idx));
  const updateQty = (idx: number, qty: number) => {
    if (qty <= 0) return removeItem(idx);
    setCart(cart.map((c, i) => i === idx ? { ...c, qty } : c));
  };

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const taxRate = settings.showPricesWithTax ? (settings.vatRate + settings.levyRate) / 100 : 0;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  const checkout = async () => {
    if (!cart.length || submitting) return;
    if (paymentMethod === 'card' && !paymentReference.trim()) {
      addToast('danger', 'پس از تأیید پرداخت کارتخوان، شماره پیگیری را وارد کنید');
      return;
    }
    const id = saleId.current || crypto.randomUUID();
    saleId.current = id;
    setSubmitting(true);
    try {
      const result = await api.orders.posCheckout({
        saleId: id,
        customer: customerName,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        items: cart.map((item) => ({ productId: item.id, qty: item.qty })),
      });
      const receipt = { ...result.order, id: result.invoice.number, invoice: result.invoice };
      setLastReceipt(receipt);
      setShowReceipt(true);
      setCart([]);
      setPaymentReference('');
      saleId.current = null;
      log(`فروش حضوری ${customerName} - ${formatPrice(result.order.total)} تومان`, result.order.id);
      addToast('success', 'فروش، موجودی و فاکتور ثبت شد');
      try {
        const latestOrders = await api.orders.list();
        setOrders(latestOrders.items);
      } catch (error: any) {
        addToast('danger', `فروش ثبت شد، اما تازه‌سازی سفارش‌ها ناموفق بود: ${error.message}`);
      }
      try {
        const latestProducts = await api.catalog.products();
        setProducts(latestProducts.items);
      } catch (error: any) {
        addToast('danger', `فروش ثبت شد، اما تازه‌سازی موجودی ناموفق بود: ${error.message}`);
      }
    } catch (error: any) {
      addToast('danger', `ثبت فروش ناموفق بود: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو یا اسکن بارکد..." className="w-full rounded-xl border border-cream-300 bg-white py-2.5 pr-10 pl-4 text-[12px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
            <option value="">همه دسته‌ها</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} onClick={() => addItem(p)} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-200 bg-white'} p-2 text-start hover:shadow-lg hover:-translate-y-0.5 transition-all`}>
              <img src={p.image} className="w-full aspect-square rounded-lg object-cover mb-1" alt="" />
              <p className="text-[10px] font-bold truncate">{p.name}</p>
              <div className="flex justify-between items-center mt-1">
                <span className="tnum text-[10px] font-bold text-brand-700">{formatPrice(finalPrice(p.price, p.discount))}</span>
                <span className={`text-[9px] ${p.stock <= 5 ? 'text-coral-600 font-bold' : 'text-cream-500'}`}>{faNum(p.stock)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Panel */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 h-fit sticky top-24`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>فاکتور جاری</h3>
        <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="نام مشتری" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none mb-3" />
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as 'cash' | 'card')} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none mb-2">
          <option value="cash">پرداخت نقدی</option>
          <option value="card">کارتخوان (تأیید دستی)</option>
        </select>
        {paymentMethod === 'card' && (
          <>
            <p className="mb-2 text-[10px] leading-5 text-amber-700">اتصال مستقیم به کارتخوان وجود ندارد؛ فقط پس از مشاهده تأیید موفق دستگاه، پرداخت را دستی ثبت کنید.</p>
            <input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="شماره پیگیری کارتخوان" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none mb-3" />
          </>
        )}
        
        <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
          {cart.length === 0 && <p className="text-[12px] text-cream-500 text-center py-4">سبد خالی است</p>}
          {cart.map((c, i) => (
            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'}`}>
              <img src={c.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate">{c.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <button onClick={() => updateQty(i, c.qty - 1)} className="w-5 h-5 rounded bg-cream-200 flex items-center justify-center text-[10px]"><IconMinus className="w-3 h-3" /></button>
                  <span className="tnum text-[11px] font-bold w-6 text-center">{faNum(c.qty)}</span>
                  <button onClick={() => updateQty(i, c.qty + 1)} className="w-5 h-5 rounded bg-cream-200 flex items-center justify-center text-[10px]"><IconPlus className="w-3 h-3" /></button>
                </div>
              </div>
              <span className="tnum text-[11px] font-bold">{formatPrice(c.price * c.qty)}</span>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-cream-200 pt-3 space-y-1 text-[12px]">
            <div className="flex justify-between"><span className="text-cream-500">جمع اقلام:</span><span className="tnum">{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-cream-500">مالیات (۹٪):</span><span className="tnum">{formatPrice(tax)}</span></div>
            <div className="flex justify-between font-extrabold text-[14px] text-brand-900 pt-2 border-t border-cream-200"><span>مبلغ قابل پرداخت:</span><span className="tnum">{formatPrice(total)} تومان</span></div>
            <button onClick={checkout} disabled={submitting || cart.length === 0} className="w-full mt-3 bg-brand-900 text-white py-3 rounded-xl font-extrabold text-[12px] shadow-lg shadow-brand-900/25 flex items-center justify-center gap-2 disabled:opacity-50">
              <IconCheck className="w-4 h-4" /> {submitting ? 'در حال ثبت فروش...' : 'ثبت فروش و صدور فاکتور'}
            </button>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastReceipt && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowReceipt(false)}>
          <div className={`w-full max-w-sm rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2"><IconCheck className="w-6 h-6 text-emerald-600" /></div>
              <h3 className="font-bold text-brand-900">فاکتور صادر شد</h3>
              <p className="text-[11px] text-cream-500">{lastReceipt.id}</p>
            </div>
            <div className="space-y-1 text-[12px] border-t border-cream-200 pt-3">
              <div className="flex justify-between"><span>مشتری:</span><span className="font-bold">{lastReceipt.customer}</span></div>
              <div className="flex justify-between"><span>تعداد اقلام:</span><span className="tnum">{faNum(lastReceipt.items.length)}</span></div>
              <div className="flex justify-between"><span>وضعیت پرداخت:</span><span className="font-bold">پرداخت‌شده ({lastReceipt.payment === 'cash' ? 'نقدی' : 'کارتخوان - تأیید دستی'})</span></div>
              <div className="flex justify-between font-extrabold text-[14px] pt-2 border-t border-cream-200"><span>مبلغ:</span><span className="tnum">{formatPrice(lastReceipt.total)} تومان</span></div>
            </div>
            <button onClick={() => setShowReceipt(false)} className="w-full mt-4 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px]">فروش جدید</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminContentManager() {
  const { pages, setPages, banners, setBanners, posts, setPosts, darkMode, log } = useAdmin();
  const [tab, setTab] = useState<'pages' | 'banners' | 'blog' | 'seo'>('pages');
  const [editing, setEditing] = useState<any>(null);

  const stats = {
    pages: pages.length,
    banners: banners.length,
    activeBanners: banners.filter((b: any) => b.active).length,
    posts: posts.length,
    totalViews: posts.reduce((s: number, p: any) => s + (p.views || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'صفحات', v: faNum(stats.pages), c: 'bg-blue-50 text-blue-700', icon: <IconClipboard className="w-5 h-5" /> },
          { l: 'بنرهای فعال', v: `${faNum(stats.activeBanners)}/${faNum(stats.banners)}`, c: 'bg-purple-50 text-purple-700', icon: <IconCamera className="w-5 h-5" /> },
          { l: 'پست‌های وبلاگ', v: faNum(stats.posts), c: 'bg-emerald-50 text-emerald-700', icon: <IconEdit className="w-5 h-5" /> },
          { l: 'کل بازدید', v: faNum(stats.totalViews), c: 'bg-amber-50 text-amber-700', icon: <IconEye className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-cream-500">{k.l}</p><div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div></div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[{ k: 'pages', l: 'صفحات ایستا' }, { k: 'banners', l: 'بنرها و اسلایدر' }, { k: 'blog', l: 'وبلاگ' }, { k: 'seo', l: 'ابزار سئو' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>{t.l}</button>
        ))}
      </div>

      {/* Pages Tab */}
      {tab === 'pages' && (
        <div className="space-y-3">
          <button onClick={() => setEditing({ id: '', slug: '', title: '', content: '', metaTitle: '', metaDesc: '', keywords: '', published: true })} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1 shadow-lg shadow-brand-900/25"><IconPlus className="w-4 h-4" />صفحه جدید</button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pages.map((p: any) => (
              <div key={p.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 hover:shadow-lg transition-all`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{p.title}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.published ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{p.published ? 'منتشر شده' : 'پیش‌نویس'}</span>
                </div>
                <p className="text-[10px] text-cream-500 mb-3 font-mono">/{p.slug}</p>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(p)} className="flex-1 py-1.5 rounded-lg bg-cream-100 text-brand-700 text-[10px] font-bold flex items-center justify-center gap-1"><IconEdit className="w-3 h-3" /> ویرایش</button>
                  <button onClick={() => { setPages(pages.filter((x: any) => x.id !== p.id)); log('حذف صفحه', p.title, 'warning'); }} className="py-1.5 px-3 rounded-lg bg-coral-100 text-coral-700 text-[10px] font-bold"><IconTrash className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banners Tab */}
      {tab === 'banners' && (
        <div className="space-y-3">
          <button onClick={() => setEditing({ id: '', title: '', subtitle: '', btnText: 'مشاهده', position: 'home', active: true, expiresAt: '2025-12-31', color1: '#1A2238', color2: '#3d61a3' })} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1 shadow-lg shadow-brand-900/25"><IconPlus className="w-4 h-4" />بنر جدید</button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {banners.map((b: any) => (
              <div key={b.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden hover:shadow-lg transition-all`}>
                <div className="h-24 flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${b.color1}, ${b.color2})` }}>
                  <div className="text-center">
                    <p className="text-[13px] font-bold">{b.title}</p>
                    <p className="text-[10px] opacity-80">{b.subtitle}</p>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-cream-500">جایگاه: {b.position} | انقضا: {b.expiresAt}</p>
                  </div>
                  <button onClick={() => setBanners(banners.map((x: any) => x.id === b.id ? { ...x, active: !x.active } : x))} className={`w-10 h-5 rounded-full relative transition-colors ${b.active ? 'bg-emerald-500' : 'bg-cream-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${b.active ? 'right-0.5' : 'right-5'}`}></span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blog Tab */}
      {tab === 'blog' && (
        <div className="space-y-3">
          <button onClick={() => setEditing({ id: '', title: '', category: '', tags: [], content: '', views: 0, date: new Date().toISOString(), color1: '#667eea', color2: '#764ba2', published: true, comments: 0 })} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1 shadow-lg shadow-brand-900/25"><IconPlus className="w-4 h-4" />پست جدید</button>
          <div className="space-y-3">
            {posts.map((p: any) => (
              <div key={p.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 hover:shadow-lg transition-all flex gap-4`}>
                <div className="w-20 h-20 rounded-xl flex-shrink-0" style={{ background: `linear-gradient(135deg, ${p.color1 || '#667eea'}, ${p.color2 || '#764ba2'})` }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{p.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.published ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{p.published ? 'منتشر شده' : 'پیش‌نویس'}</span>
                  </div>
                  <p className="text-[10px] text-cream-500">{p.category} | {faNum(p.views || 0)} بازدید | {faNum(p.comments || 0)} نظر</p>
                  <div className="flex gap-1 mt-2">
                    {p.tags?.slice(0, 3).map((t: string) => <span key={t} className="text-[9px] bg-cream-100 text-brand-700 rounded-full px-2 py-0.5">{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEO Tab */}
      {tab === 'seo' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>ابزار سئو - بررسی وضعیت متا</h3>
          <div className="space-y-2">
            {pages.map((p: any) => (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'}`}>
                <div>
                  <p className="text-[12px] font-bold">{p.title}</p>
                  <p className="text-[10px] text-cream-500">/{p.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.metaTitle ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">متا تنظیم شده</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-coral-100 text-coral-700">فاقد متا</span>
                  )}
                  <button onClick={() => setEditing(p)} className="p-1.5 rounded-lg hover:bg-cream-100"><IconEdit className="w-3.5 h-3.5 text-brand-600" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl bg-brand-50 border border-brand-200">
            <h4 className="text-[12px] font-bold text-brand-900 mb-2">پیش‌نمایش نتایج گوگل</h4>
            <div className="bg-white rounded-lg p-3 border border-cream-200">
              <p className="text-[13px] text-blue-700 font-bold">عنوان صفحه در نتایج گوگل نمایش داده می‌شود</p>
              <p className="text-[11px] text-emerald-700">www.tasis.ir/page-slug</p>
              <p className="text-[11px] text-cream-500 mt-1">توضیحات متا در این قسمت نمایش داده می‌شود. این متن باید جذاب و شامل کلمات کلیدی باشد.</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>{editing.id ? 'ویرایش' : 'ایجاد'} محتوا</h3>
            <div className="space-y-3">
              <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">عنوان</label><input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" /></div>
              {editing.slug !== undefined && <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">نامک (slug)</label><input value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none font-mono" /></div>}
              <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">محتوا (مارک‌داون)</label><textarea value={editing.content || ''} onChange={e => setEditing({ ...editing, content: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none h-32 resize-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">متا تایتل</label><input value={editing.metaTitle || ''} onChange={e => setEditing({ ...editing, metaTitle: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">کلمات کلیدی</label><input value={editing.keywords || ''} onChange={e => setEditing({ ...editing, keywords: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
              </div>
              <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">متا دیسکریپشن</label><textarea value={editing.metaDesc || ''} onChange={e => setEditing({ ...editing, metaDesc: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none h-16 resize-none" /></div>
            </div>
            <button onClick={() => {
              if (editing.id) {
                if (pages.find((p: any) => p.id === editing.id)) setPages(pages.map((p: any) => p.id === editing.id ? editing : p));
                else if (posts.find((p: any) => p.id === editing.id)) setPosts(posts.map((p: any) => p.id === editing.id ? editing : p));
                else setBanners(banners.map((b: any) => b.id === editing.id ? editing : b));
              } else {
                const newItem = { ...editing, id: `item-${Date.now()}` };
                if (editing.slug !== undefined) setPages([...pages, newItem]);
                else if (editing.category !== undefined) setPosts([...posts, newItem]);
                else setBanners([...banners, newItem]);
              }
              log(`${editing.id ? 'ویرایش' : 'ایجاد'} محتوا`, editing.title);
              setEditing(null);
            }} className="w-full mt-4 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px] shadow-lg shadow-brand-900/25">ذخیره</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminVendors() {
  const { vendors, setVendors, darkMode, log } = useAdmin();
  const { addToast } = useShop();
  const [tab, setTab] = useState<'vendors' | 'performance' | 'settlements'>('vendors');
  const [settlements, setSettlements] = useState<any[]>([]);
  
  const totalSales = vendors.reduce((s: number, v: any) => s + v.totalSales, 0);
  const totalBalance = vendors.reduce((s: number, v: any) => s + v.balance, 0);

  useEffect(() => {
    api.logistics.settlements().then(({ items }) => setSettlements(items)).catch((error) => {
      addToast('danger', `بارگذاری تاریخچه تسویه ناموفق بود: ${error.message}`);
    });
  }, [addToast]);

  const settleVendor = async (vendor: any) => {
    if (!(vendor.balance > 0)) return;
    const reference = window.prompt('پس از انجام حواله خارج از سامانه، شماره پیگیری بانکی را وارد کنید:');
    if (!reference?.trim()) return;
    try {
      const result = await api.logistics.settleVendor(vendor.id, reference.trim());
      setVendors((current) => current.map((item: any) => item.id === vendor.id ? result.vendor : item));
      setSettlements((current) => [result.settlement, ...current]);
      log(`ثبت حواله انجام‌شده برای فروشنده ${vendor.name}`, result.settlement.id);
      addToast('success', 'سند تسویه ثبت شد؛ انتقال بانکی خارج از سامانه انجام شده است');
    } catch (error: any) {
      addToast('danger', `ثبت سند تسویه ناموفق بود: ${error.message}`);
    }
  };

  const exportVendors = () => {
    const data = vendors.map((v: any) => ({
      'نام فروشنده': v.name, 'نام حقوقی': v.legalName, 'شبا': v.iban, 'تلفن': v.phone,
      'فروش کل (تومان)': v.totalSales, 'تعداد سفارش': v.totalOrders, 'تعداد قلم': v.totalItems,
      'بدهی جاری (تومان)': v.balance, 'وضعیت': v.active ? 'فعال' : 'غیرفعال'
    }));
    downloadFile(toExcel(data, 'گزارش فروشندگان'), 'vendors.xls', 'application/vnd.ms-excel');
    log('خروجی گزارش فروشندگان', 'vendors');
  };

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'کل فروشندگان', v: faNum(vendors.length), c: 'bg-blue-50 text-blue-700', icon: <IconStore className="w-5 h-5" /> },
          { l: 'فروش کل', v: formatPrice(totalSales), c: 'bg-emerald-50 text-emerald-700', icon: <IconTrending className="w-5 h-5" /> },
          { l: 'بدهی جاری', v: formatPrice(totalBalance), c: 'bg-amber-50 text-amber-700', icon: <IconDollar className="w-5 h-5" /> },
          { l: 'فعال', v: faNum(vendors.filter((v: any) => v.active).length), c: 'bg-purple-50 text-purple-700', icon: <IconCheck className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-cream-500">{k.l}</p><div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div></div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[{ k: 'vendors', l: 'فروشندگان' }, { k: 'performance', l: 'عملکرد' }, { k: 'settlements', l: 'تسویه‌ها' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>{t.l}</button>
        ))}
      </div>

      {/* Vendors Tab */}
      {tab === 'vendors' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[11px] text-cream-500">{faNum(vendors.length)} فروشنده</p>
            <button onClick={exportVendors} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-cream-300 text-[11px] font-bold"><IconDownload className="w-3.5 h-3.5" />خروجی اکسل</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vendors.map((v: any) => (
              <div key={v.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 hover:shadow-lg transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
                      <IconStore className="w-6 h-6 text-brand-700" />
                    </div>
                    <div>
                      <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{v.name}</h4>
                      <p className="text-[10px] text-cream-500">{v.legalName} | {v.phone}</p>
                    </div>
                  </div>
                  <button onClick={() => { setVendors((current) => current.map((x: any) => x.id === v.id ? { ...x, active: !x.active } : x)); log(`${v.active ? 'غیرفعال' : 'فعال'} کردن فروشنده ${v.name}`, v.id); }} className={`w-10 h-5 rounded-full relative transition-colors ${v.active ? 'bg-emerald-500' : 'bg-cream-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${v.active ? 'right-0.5' : 'right-5'}`}></span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-2`}>
                    <p className="text-[10px] text-cream-500">فروش</p>
                    <p className="tnum text-[11px] font-bold">{formatPrice(v.totalSales)}</p>
                  </div>
                  <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-2`}>
                    <p className="text-[10px] text-cream-500">سفارش</p>
                    <p className="tnum text-[11px] font-bold">{faNum(v.totalOrders)}</p>
                  </div>
                  <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-2`}>
                    <p className="text-[10px] text-cream-500">بدهی</p>
                    <p className="tnum text-[11px] font-bold text-amber-700">{formatPrice(v.balance)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {tab === 'performance' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>مقایسه عملکرد فروشندگان</h3>
          <div className="space-y-4">
            {vendors.map((v: any) => {
              const maxSales = Math.max(...vendors.map((x: any) => x.totalSales));
              const percentage = maxSales > 0 ? (v.totalSales / maxSales) * 100 : 0;
              return (
                <div key={v.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold">{v.name}</span>
                    <span className="tnum text-[12px] font-bold">{formatPrice(v.totalSales)}</span>
                  </div>
                  <div className="h-3 bg-cream-200 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-900 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-cream-500 mt-1">
                    <span>{faNum(v.totalOrders)} سفارش | {faNum(v.totalItems)} قلم</span>
                    <span>کارمزد: {faNum(v.fee)}٪</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settlements Tab */}
      {tab === 'settlements' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>ثبت حواله انجام‌شده</h3>
          <p className="text-[11px] leading-5 text-cream-500 mb-4">این عملیات فقط مانده و سند حسابداری را ثبت می‌کند؛ انتقال وجه باید پیش‌تر از طریق بانک انجام شده باشد.</p>
          <div className="space-y-3">
            {vendors.filter((v: any) => v.balance > 0).map((v: any) => (
              <div key={v.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-cream-50'} p-4 flex items-center justify-between`}>
                <div>
                  <p className="text-[12px] font-bold">{v.name}</p>
                  <p className="text-[10px] text-cream-500 mt-1">شبا: {v.iban}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tnum text-[13px] font-extrabold text-amber-700">{formatPrice(v.balance)} تومان</span>
                  <button onClick={() => settleVendor(v)} className="px-3 py-1.5 rounded-xl bg-brand-900 text-white text-[11px] font-bold">ثبت حواله</button>
                </div>
              </div>
            ))}
          </div>
          <h4 className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mt-6 mb-3`}>تاریخچه اسناد تسویه</h4>
          <div className="space-y-2">
            {settlements.map((settlement: any) => (
              <div key={settlement.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-cream-50'} p-3 flex flex-wrap items-center justify-between gap-2 text-[11px]`}>
                <span className="font-bold">{vendors.find((vendor: any) => vendor.id === settlement.vendorId)?.name || 'فروشنده حذف‌شده'}</span>
                <span>{dayLabel(new Date(settlement.createdAt))}</span>
                <span>مرجع: <b className="font-mono">{settlement.reference}</b></span>
                <span className="font-extrabold">{formatPrice(settlement.amount)} تومان</span>
              </div>
            ))}
            {!settlements.length && <p className="text-[11px] text-cream-500">سندی ثبت نشده است.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminLogistics() {
  const { carriers, darkMode, log } = useAdmin();
  const { addToast } = useShop();
  const [tab, setTab] = useState<'carriers' | 'shipments' | 'tracking'>('carriers');
  const [trackingQuery, setTrackingQuery] = useState('');
  const [submittedTrackingQuery, setSubmittedTrackingQuery] = useState('');
  const [shipmentOrders, setShipmentOrders] = useState<any[]>([]);
  const [shipmentDrafts, setShipmentDrafts] = useState<Record<string, any>>({});
  const [shipmentLoading, setShipmentLoading] = useState(true);
  const [shipmentLoadError, setShipmentLoadError] = useState('');
  const [savingShipmentId, setSavingShipmentId] = useState('');

  const loadShipmentOrders = useCallback(async () => {
    setShipmentLoading(true);
    setShipmentLoadError('');
    try {
      const result = await api.logistics.shipments.list();
      setShipmentOrders(result.items);
    } catch (error: any) {
      setShipmentLoadError(error.message);
      addToast('danger', `بارگذاری مرسوله‌ها ناموفق بود: ${error.message}`);
    } finally {
      setShipmentLoading(false);
    }
  }, [addToast]);
  useEffect(() => { void loadShipmentOrders(); }, [loadShipmentOrders]);

  const shippedOrders = shipmentOrders.filter((order: any) => order.status === 'shipped');
  const pendingShipment = shipmentOrders.filter((order: any) => order.status === 'processing').length;
  const trackingMatches = submittedTrackingQuery
    ? shipmentOrders.filter((order: any) => [
      order.code, order.tracking, order.trackingCode, ...(order.shipment?.events || []).map((event: any) => event.note),
    ].some((value) => String(value || '').toLowerCase().includes(submittedTrackingQuery.toLowerCase())))
    : [];
  const shipmentStatusLabels: Record<string, string> = {
    preparing: 'آماده‌سازی', shipped: 'تحویل به حامل', in_transit: 'در مسیر', delivered: 'تحویل‌شده', exception: 'نیازمند پیگیری',
  };
  const shipmentDraft = (order: any) => shipmentDrafts[order.id] || {
    carrierId: order.shipment?.carrierId || '',
    trackingCode: order.shipment?.trackingCode || '',
    status: order.shipment?.status || (order.status === 'shipped' ? 'shipped' : order.status === 'delivered' ? 'delivered' : 'preparing'),
    note: '',
  };
  const saveShipment = async (order: any) => {
    const draft = shipmentDraft(order);
    setSavingShipmentId(order.id);
    try {
      const result = await api.logistics.shipments.save(order.id, draft);
      setShipmentOrders((current) => current.map((item) => item.id === order.id ? result.order : item));
      setShipmentDrafts((current) => { const next = { ...current }; delete next[order.id]; return next; });
      addToast('success', 'اطلاعات مرسوله ذخیره شد');
      log(`به‌روزرسانی مرسوله سفارش ${order.code}`, order.id);
    } catch (error: any) {
      addToast('danger', `ذخیره مرسوله ناموفق بود: ${error.message}`);
    } finally {
      setSavingShipmentId('');
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'حامل‌های پیکربندی‌شده', v: faNum(carriers.filter((c: any) => c.active).length), c: 'bg-blue-50 text-blue-700', icon: <IconTruck className="w-5 h-5" /> },
          { l: 'در حال ارسال', v: faNum(shippedOrders.length), c: 'bg-amber-50 text-amber-700', icon: <IconPackage className="w-5 h-5" /> },
          { l: 'تحویل شده', v: faNum(shipmentOrders.filter((order: any) => order.status === 'delivered').length), c: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="w-5 h-5" /> },
          { l: 'آماده بسته‌بندی', v: faNum(pendingShipment), c: 'bg-purple-50 text-purple-700', icon: <IconBox className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-cream-500">{k.l}</p><div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div></div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[{ k: 'carriers', l: 'حامل‌های ارسال' }, { k: 'shipments', l: 'مرکز مرسولات' }, { k: 'tracking', l: 'رهگیری' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>{t.l}</button>
        ))}
      </div>

      {/* Carriers */}
      {tab === 'carriers' && (
        <div className="space-y-3">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">اطلاعات حامل در این بخش داخلی است. اتصال API شرکت حمل و تولید برچسب خودکار فعال نیست؛ ثبت دستی مرسوله و کد رهگیری در مرکز مرسولات انجام می‌شود.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {carriers.map((c: any) => (
            <div key={c.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 hover:shadow-lg transition-all`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>
                    <IconTruck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{c.name}</h4>
                    <p className="text-[10px] text-cream-500">{c.deliveryDays}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${c.active ? 'bg-amber-100 text-amber-700' : 'bg-cream-100 text-cream-500'}`}>{c.active ? 'پیکربندی‌شده' : 'غیرفعال'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-cream-500">هزینه پایه:</span>
                <span className="tnum font-bold">{formatPrice(c.baseCost)} تومان</span>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Shipments */}
      {tab === 'shipments' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
          <div className="flex justify-end p-3">
            <button disabled={shipmentLoading} onClick={() => void loadShipmentOrders()} className="rounded-lg border border-cream-300 px-3 py-1.5 text-[10px] font-bold disabled:opacity-50">بازخوانی</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کد سفارش</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مشتری / شهر</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">حامل و رهگیری دستی</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت مرسوله</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عملیات</th>
              </tr></thead>
              <tbody>
                {shipmentOrders.map((o: any) => {
                  const draft = shipmentDraft(o);
                  const currentCarrier = carriers.find((carrier: any) => carrier.id === draft.carrierId);
                  return (
                  <tr key={o.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'}`}>
                    <td className="py-2.5 px-3 font-bold">{o.code}</td>
                    <td className="py-2.5 px-3">{o.customer}<br /><span className="text-[10px] text-cream-500">{o.city}</span></td>
                    <td className="min-w-[260px] py-2.5 px-3">
                      <select value={draft.carrierId} onChange={e => setShipmentDrafts(current => ({ ...current, [o.id]: { ...draft, carrierId: e.target.value } }))} className="mb-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-[10px]">
                        <option value="">انتخاب حامل</option>
                        {currentCarrier && !currentCarrier.active && <option value={currentCarrier.id}>{currentCarrier.name} (غیرفعال)</option>}
                        {carriers.filter((carrier: any) => carrier.active).map((carrier: any) => <option key={carrier.id} value={carrier.id}>{carrier.name}</option>)}
                      </select>
                      <input value={draft.trackingCode} onChange={e => setShipmentDrafts(current => ({ ...current, [o.id]: { ...draft, trackingCode: e.target.value } }))} placeholder="کد رهگیری حامل" className="w-full rounded-lg border border-cream-300 px-2 py-1.5 text-[10px]" />
                    </td>
                    <td className="py-2.5 px-3">
                      <select value={draft.status} onChange={e => setShipmentDrafts(current => ({ ...current, [o.id]: { ...draft, status: e.target.value } }))} className="rounded-lg border border-cream-300 px-2 py-1.5 text-[10px]">
                        {Object.entries(shipmentStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
                      </select>
                      <input value={draft.note} onChange={e => setShipmentDrafts(current => ({ ...current, [o.id]: { ...draft, note: e.target.value } }))} placeholder="یادداشت قابل نمایش به مشتری" maxLength={240} className="mt-1 w-full rounded-lg border border-cream-300 px-2 py-1.5 text-[10px]" />
                    </td>
                    <td className="py-2.5 px-3">
                      <button disabled={savingShipmentId === o.id} onClick={() => saveShipment(o)} className="rounded-lg bg-brand-900 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">{savingShipmentId === o.id ? 'در حال ذخیره…' : 'ذخیره مرسوله'}</button>
                    </td>
                  </tr>);
                })}
              </tbody>
            </table>
            {shipmentLoading && <p className="p-4 text-[11px] text-cream-500">در حال بارگذاری مرسوله‌ها…</p>}
            {!shipmentLoading && shipmentLoadError && <p className="p-4 text-[11px] text-coral-600">بارگذاری مرسوله‌ها ناموفق بود. برای تلاش دوباره، بازخوانی کنید.</p>}
            {!shipmentLoading && !shipmentLoadError && shipmentOrders.length === 0 && <p className="p-4 text-[11px] text-cream-500">سفارش پرداخت‌شده‌ای برای ارسال وجود ندارد.</p>}
          </div>
        </div>
      )}

      {/* Tracking */}
      {tab === 'tracking' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>جستجوی سفارش و کد رهگیری ثبت‌شده</h3>
          <p className="text-[11px] text-cream-500 mb-4">این صفحه فقط اطلاعات ثبت‌شده در فروشگاه را جستجو می‌کند و استعلام زنده از حامل انجام نمی‌دهد.</p>
          <div className="flex gap-2 mb-4">
            <input value={trackingQuery} onChange={(event) => setTrackingQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && setSubmittedTrackingQuery(trackingQuery.trim())} placeholder="کد رهگیری یا شماره سفارش..." className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
            <button onClick={() => setSubmittedTrackingQuery(trackingQuery.trim())} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold">جستجو</button>
          </div>
          <div className="space-y-3">
            {trackingMatches.map((o: any) => (
              <div key={o.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-cream-50'} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold">{o.code} - {o.customer}</span>
                  <span className="text-[10px] text-cream-500">{o.city}</span>
                </div>
                <p className="text-[11px]">وضعیت سفارش: {o.status} | حامل: {o.shipment?.carrierName || o.carrier || 'ثبت نشده'} | کد رهگیری: {o.shipment?.trackingCode || o.tracking || o.trackingCode || 'ثبت نشده'}</p>
                {o.shipment?.events?.length > 0 && <ol className="mt-2 space-y-1 border-s-2 border-cream-300 ps-3">{[...o.shipment.events].reverse().map((event: any) => <li key={event.id} className="text-[10px] text-cream-600">{dayLabel(new Date(event.createdAt))} · {event.label}{event.note ? ` — ${event.note}` : ''}</li>)}</ol>}
              </div>
            ))}
            {shipmentLoading && <p className="py-4 text-center text-[11px] text-cream-500">در حال بارگذاری…</p>}
            {submittedTrackingQuery && !shipmentLoading && !shipmentLoadError && trackingMatches.length === 0 && <p className="py-4 text-center text-[11px] text-cream-500">سفارشی با این کد یافت نشد.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminTasks() {
  const { tasks, setTasks, darkMode, log } = useAdmin();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', desc: '', assignee: '', priority: 'medium', deadline: '', status: 'todo' });
  const columns = [{ id: 'todo', label: 'در انتظار', color: 'bg-cream-100' }, { id: 'doing', label: 'در حال انجام', color: 'bg-blue-100' }, { id: 'done', label: 'انجام شده', color: 'bg-emerald-100' }];

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(true)} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1"><IconPlus className="w-4 h-4" />وظیفه جدید</button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => (
          <div key={col.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <h3 className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3 flex items-center gap-2`}><span className={`w-2 h-2 rounded-full ${col.color === 'bg-cream-100' ? 'bg-cream-400' : col.color === 'bg-blue-100' ? 'bg-blue-500' : 'bg-emerald-500'}`} />{col.label} ({faNum(tasks.filter((t: any) => t.status === col.id).length)})</h3>
            <div className="space-y-2">{tasks.filter((t: any) => t.status === col.id).map((t: any) => (
              <div key={t.id} className={`rounded-xl border ${darkMode ? 'border-white/10' : 'border-cream-200'} p-3`}>
                <p className="text-[12px] font-bold">{t.title}</p>
                <p className="text-[10px] text-cream-500 mt-0.5">{t.assignee} | {t.priority}</p>
                <div className="flex gap-1 mt-2">
                  {columns.filter(c => c.id !== col.id).map(c => (<button key={c.id} onClick={() => { setTasks(tasks.map((x: any) => x.id === t.id ? { ...x, status: c.id } : x)); }} className="px-2 py-0.5 rounded text-[9px] font-bold bg-cream-100 text-brand-700">{c.label}</button>))}
                  <button onClick={() => { setTasks(tasks.filter((x: any) => x.id !== t.id)); }} className="px-2 py-0.5 rounded text-[9px] font-bold bg-coral-100 text-coral-700">حذف</button>
                </div>
              </div>
            ))}</div>
          </div>
        ))}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className={`w-full max-w-sm rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3">وظیفه جدید</h3>
            <div className="space-y-2">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="عنوان" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <input value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="توضیحات" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <input value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} placeholder="مسئول" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none"><option value="low">کم</option><option value="medium">متوسط</option><option value="high">زیاد</option></select>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
            </div>
            <button onClick={() => { setTasks([...tasks, { ...form, id: `tsk-${Date.now()}` }]); setShowForm(false); setForm({ title: '', desc: '', assignee: '', priority: 'medium', deadline: '', status: 'todo' }); log('ایجاد وظیفه جدید', form.title); }} className="w-full mt-3 bg-brand-900 text-white py-2 rounded-xl font-bold text-[12px]">ذخیره</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Main App ─────────── */
/* ─────────── Customer Auth (OTP) ─────────── */
function CustomerLogin() {
  const { setView, customer, setCustomer, addToast } = useShop();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [err, setErr] = useState('');
  const [devOtp, setDevOtp] = useState('');

  useEffect(() => { if (cooldown <= 0) return; const t = setInterval(() => setCooldown(c => c - 1), 1000); return () => clearInterval(t); }, [cooldown]);

  const requestCode = async () => {
    if (phone.replace(/\D/g, '').length < 11) { setErr('شماره موبایل معتبر وارد کنید'); return; }
    setLoading(true); setErr('');
    try {
      const res = await api.auth.requestOtp(phone);
      setStep('code');
      setCooldown(60);
      setDevOtp(res.devOtp || '');
      addToast('success', res.message);
    } catch (e: any) { setErr(e.message || 'خطا در ارسال کد'); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    if (code.length < 4) { setErr('کد تأیید را کامل وارد کنید'); return; }
    setLoading(true); setErr('');
    try {
      const res = await api.auth.verifyOtp(phone, code, name || undefined);
      api.setToken(res.token);
      setCustomer(res.customer);
      addToast('success', 'خوش آمدید!');
      setView('account');
    } catch (e: any) { setErr(e.message || 'کد تأیید نامعتبر است'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-12 animate-rise">
      <div className="bg-white rounded-2xl border border-cream-200 shadow-lg p-6 text-center">
        <div className="w-14 h-14 rounded-xl bg-brand-900 flex items-center justify-center mx-auto mb-4"><span className="text-white font-display text-xl">ت</span></div>
        <h2 className="font-display text-lg text-brand-900 mb-1">{step === 'phone' ? 'ورود / ثبت‌نام' : 'کد تأیید'}</h2>
        <p className="text-[12px] text-cream-500 mb-5">{step === 'phone' ? 'با شماره موبایل خود وارد شوید' : `کد ۶ رقمی ارسال‌شده به ${phone} را وارد کنید`}</p>

        {step === 'phone' ? (
          <div className="space-y-3 text-start">
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="۰۹۱۲۳۴۵۶۷۸۹" inputMode="tel" className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-center text-[15px] font-bold tracking-widest outline-none focus:border-brand-400" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="نام و نام خانوادگی (اختیاری)" className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-[13px] outline-none focus:border-brand-400" />
            {err && <p className="text-[11px] text-coral-600 font-bold text-center">{err}</p>}
            <button onClick={requestCode} disabled={loading} className="w-full bg-brand-900 text-white py-3 rounded-xl font-extrabold text-sm disabled:opacity-60">{loading ? 'در حال ارسال...' : 'دریافت کد تأیید'}</button>
          </div>
        ) : (
          <div className="space-y-3 text-start">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="------" inputMode="numeric" maxLength={6} className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-center text-[18px] font-bold tracking-[0.5em] outline-none focus:border-brand-400 tnum" />
            {devOtp && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                <p className="text-[11px] text-amber-700 font-bold">حالت تستی (کاوه‌نگار متصل نیست)</p>
                <p className="text-[15px] font-extrabold text-amber-800 tnum mt-1">کد شما: {devOtp}</p>
              </div>
            )}
            {err && <p className="text-[11px] text-coral-600 font-bold text-center">{err}</p>}
            <button onClick={verify} disabled={loading} className="w-full bg-brand-900 text-white py-3 rounded-xl font-extrabold text-sm disabled:opacity-60">{loading ? 'در حال بررسی...' : 'ورود به حساب'}</button>
            <button onClick={() => { if (cooldown === 0) requestCode(); }} disabled={cooldown > 0} className="w-full text-[11px] text-cream-500 py-1 disabled:opacity-50">{cooldown > 0 ? `ارسال مجدد تا ${faNum(cooldown)} ثانیه` : 'ارسال مجدد کد'}</button>
            <button onClick={() => { setStep('phone'); setCode(''); setDevOtp(''); }} className="w-full text-[11px] font-bold text-brand-600">ویرایش شماره موبایل</button>
          </div>
        )}
        <button onClick={() => setView('home')} className="mt-4 text-[11px] text-cream-500 hover:text-brand-700">بازگشت به فروشگاه</button>
      </div>
    </div>
  );
}

/* ─────────── Customer Account ─────────── */
function CustomerAccount() {
  const { customer, setView, logoutCustomer, money, addToast } = useShop();
  const queryClient = useQueryClient();
  const customerOrdersKey = ['customer', customer?.id, 'orders'];
  const customerRmasKey = ['customer', customer?.id, 'rmas'];
  const ordersQuery = useQuery({
    queryKey: customerOrdersKey,
    queryFn: () => api.orders.mine(),
    enabled: Boolean(customer),
    staleTime: 30_000,
  });
  const rmasQuery = useQuery({
    queryKey: customerRmasKey,
    queryFn: () => api.support.rmas.mine(),
    enabled: Boolean(customer),
    staleTime: 30_000,
  });
  const orders = ordersQuery.data?.items ?? [];
  const rmas = rmasQuery.data?.items ?? [];
  const loading = Boolean(customer) && (ordersQuery.isLoading || rmasQuery.isLoading);
  const [name, setName] = useState(customer?.name || '');
  const [saving, setSaving] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState('');
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  useEffect(() => {
    const error = ordersQuery.error || rmasQuery.error;
    if (error) addToast('danger', `بارگذاری سفارش‌ها یا درخواست‌های مرجوعی ناموفق بود: ${error.message}`);
  }, [addToast, ordersQuery.error, rmasQuery.error]);

  useEffect(() => {
    if (!customer) setView('login');
  }, [customer, setView]);

  if (!customer) return null;

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.auth.updateName(name.trim());
      addToast('success', 'نام شما به‌روزرسانی شد');
    } catch (e: any) { addToast('danger', e.message || 'خطا در ذخیره'); }
    finally { setSaving(false); }
  };
  const submitReturn = async (order: any) => {
    const line = order.items?.find((item: any) => item.productId === returnProductId);
    if (!line || !returnReason.trim() || !Number.isSafeInteger(returnQuantity) || returnQuantity < 1) {
      addToast('danger', 'کالا، تعداد و دلیل مرجوعی را کامل کنید');
      return;
    }
    const alreadyRequested = rmas
      .filter((rma: any) => rma.orderId === order.id && rma.productId === returnProductId && rma.status !== 'rejected')
      .reduce((sum: number, rma: any) => sum + Number(rma.quantity || 0), 0);
    if (alreadyRequested + returnQuantity > Number(line.qty || 0)) {
      addToast('danger', 'تعداد مرجوعی از تعداد خریداری‌شده بیشتر است');
      return;
    }
    setSubmittingReturn(true);
    try {
      const rma = await api.support.rmas.requestReturn({
        orderId: order.id,
        productId: returnProductId,
        quantity: returnQuantity,
        reason: returnReason.trim(),
      });
      queryClient.setQueryData<{ items: any[] }>(customerRmasKey, (current) => ({
        items: [rma, ...(current?.items ?? [])],
      }));
      setReturnOrderId('');
      setReturnProductId('');
      setReturnQuantity(1);
      setReturnReason('');
      addToast('success', 'درخواست مرجوعی ثبت شد و برای بررسی به فروشگاه ارسال شد');
    } catch (error: any) {
      addToast('danger', `ثبت درخواست مرجوعی ناموفق بود: ${error.message}`);
    } finally {
      setSubmittingReturn(false);
    }
  };

  const statusLabels: Record<string, string> = { pending: 'در انتظار پرداخت', processing: 'در حال پردازش', shipped: 'ارسال شده', delivered: 'تحویل شده', cancelled: 'لغو شده' };
  const payLabels: Record<string, string> = { unpaid: 'پرداخت‌نشده', paid: 'پرداخت‌شده', failed: 'ناموفق' };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl text-brand-900">حساب کاربری</h1>
          <p className="text-[12px] text-cream-500 mt-1">{customer.name || 'مشتری'} — {faNum(customer.phone)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { logoutCustomer(); setView('home'); }} className="border border-cream-300 text-brand-700 px-3 py-2 rounded-xl text-[11px] font-bold hover:border-coral-400 hover:text-coral-600">خروج از حساب</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-cream-200 p-4 mb-4">
        <h3 className="text-[13px] font-bold text-brand-900 mb-3">ویرایش نام</h3>
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="نام و نام خانوادگی" className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none focus:border-brand-400" />
          <button onClick={saveName} disabled={saving} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[11px] font-bold disabled:opacity-60">{saving ? '...' : 'ذخیره'}</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-cream-200 p-4">
        <h3 className="text-[13px] font-bold text-brand-900 mb-3">سفارش‌های من ({faNum(orders.length)})</h3>
        {loading ? <p className="text-[12px] text-cream-500 py-6 text-center">در حال بارگذاری...</p> : orders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[12px] text-cream-500 mb-3">هنوز سفارشی ثبت نکرده‌اید</p>
            <button onClick={() => setView('shop')} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[11px] font-bold">مشاهده محصولات</button>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map(o => {
              const orderRmas = rmas.filter((rma: any) => rma.orderId === o.id);
              const selectedLine = o.items?.find((item: any) => item.productId === returnProductId);
              const alreadyRequested = rmas
                .filter((rma: any) => rma.orderId === o.id && rma.productId === returnProductId && rma.status !== 'rejected')
                .reduce((sum: number, rma: any) => sum + Number(rma.quantity || 0), 0);
              return (
              <div key={o.id} className="border border-cream-200 rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[12px] font-bold text-brand-900 tnum">{o.code}</p>
                      <p className="text-[10px] text-cream-500">{o.items?.length || 0} کالا — {dayLabel(o.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${o.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{payLabels[o.payment_status] || o.payment_status}</span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-cream-50 text-brand-700">{statusLabels[o.status] || o.status}</span>
                    <span className="text-[13px] font-extrabold text-brand-900">{money(o.total)}</span>
                    {o.payment_status !== 'paid' && (
                      <button onClick={async () => {
                        try { const pay = await api.orders.paymentStart(o.id); window.location.href = pay.redirectUrl; }
                        catch (e: any) { addToast('danger', e.message || 'خطا در شروع پرداخت'); }
                      }} className="bg-coral-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-coral-600">پرداخت</button>
                    )}
                    {o.status === 'delivered' && o.payment_status === 'paid' && (
                      <button onClick={() => {
                        setReturnOrderId(returnOrderId === o.id ? '' : o.id);
                        setReturnProductId(o.items?.[0]?.productId || '');
                        setReturnQuantity(1);
                        setReturnReason('');
                      }} className="rounded-lg border border-brand-300 px-3 py-1.5 text-[10px] font-bold text-brand-800">
                        {returnOrderId === o.id ? 'بستن فرم مرجوعی' : 'درخواست مرجوعی'}
                      </button>
                    )}
                  </div>
                </div>
                {orderRmas.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-cream-100 pt-2">
                    {orderRmas.map((rma: any) => (
                      <p key={rma.id} className="text-[10px] text-cream-600">
                        درخواست {rma.productName} × {faNum(rma.quantity)} — {statusLabels[rma.status] || ({
                          requested: 'در انتظار بررسی',
                          approved: 'تأیید شده',
                          quality_check: 'در حال بررسی کالا',
                          returned: 'کالا تحویل انبار شد',
                          refunded: 'بازپرداخت ثبت شد',
                          rejected: 'رد شده',
                        } as Record<string, string>)[rma.status] || rma.status}
                      </p>
                    ))}
                  </div>
                )}
                {returnOrderId === o.id && (
                  <div className="mt-3 grid gap-2 border-t border-cream-100 pt-3 sm:grid-cols-2">
                    <label className="space-y-1 text-[10px] text-cream-600">کالا
                      <select value={returnProductId} onChange={(event) => { setReturnProductId(event.target.value); setReturnQuantity(1); }} className="w-full rounded-lg border border-cream-300 bg-white p-2 text-xs text-brand-900">
                        {o.items?.map((item: any) => {
                          const used = orderRmas.filter((rma: any) => rma.productId === item.productId && rma.status !== 'rejected').reduce((sum: number, rma: any) => sum + Number(rma.quantity || 0), 0);
                          return <option key={item.productId} value={item.productId} disabled={used >= Number(item.qty || 0)}>{item.name} — باقی‌مانده {faNum(Math.max(0, item.qty - used))}</option>;
                        })}
                      </select>
                    </label>
                    <label className="space-y-1 text-[10px] text-cream-600">تعداد
                      <input type="number" min={1} max={Math.max(1, Number(selectedLine?.qty || 1) - alreadyRequested)} value={returnQuantity} onChange={(event) => setReturnQuantity(Number(event.target.value))} className="w-full rounded-lg border border-cream-300 p-2 text-xs" />
                    </label>
                    <label className="space-y-1 text-[10px] text-cream-600 sm:col-span-2">دلیل مرجوعی
                      <textarea value={returnReason} maxLength={1000} onChange={(event) => setReturnReason(event.target.value)} className="w-full rounded-lg border border-cream-300 p-2 text-xs" rows={2} />
                    </label>
                    <div className="sm:col-span-2">
                      <button disabled={submittingReturn || !selectedLine || alreadyRequested >= Number(selectedLine.qty || 0)} onClick={() => submitReturn(o)} className="rounded-lg bg-brand-900 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50">
                        {submittingReturn ? 'در حال ثبت...' : 'ثبت درخواست برای بررسی'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Payment Result (بازگشت از درگاه زرین‌پال) ─────────── */
function PaymentResult() {
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const { setView, money } = useShop();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const status = params.get('status') || 'error';
  const orderCode = params.get('order') || '';
  const ref = params.get('ref') || '';

  useEffect(() => {
    const load = async () => {
      try {
        const q: any = {};
        if (ref) q.order = orderCode; else q.order = orderCode;
        const res = await api.orders.paymentStatus(q);
        setData(res);
      } catch { /* نمایش بر اساس پارامترهای URL */ }
      finally { setLoading(false); };
    };
    load();
  }, []);

  const success = status === 'success';
  const order = data?.order;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center animate-fade">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${success ? 'bg-emerald-100' : 'bg-coral-100'}`}>
        {success ? <IconCheck className="w-8 h-8 text-emerald-600" /> : <IconX className="w-8 h-8 text-coral-600" />}
      </div>
      <h2 className="text-xl font-extrabold text-brand-900 mb-2">{success ? 'پرداخت با موفقیت انجام شد' : 'پرداخت ناموفق بود'}</h2>
      {orderCode && <p className="text-[13px] text-brand-700 mb-1">کد سفارش: <span className="font-bold tnum">{orderCode}</span></p>}
      {ref && <p className="text-[12px] text-cream-500 mb-1">شماره پیگیری بانکی: <span className="font-bold tnum">{ref}</span></p>}
      {!loading && order && <p className="text-[13px] text-brand-700">مبلغ پرداخت: <span className="font-extrabold">{money(order.total)}</span></p>}
      {!success && <p className="text-[11px] text-cream-500 mt-2">در صورت کسر مبلغ، تا ۷۲ ساعت به حساب شما بازمی‌گردد.</p>}
      <div className="flex gap-2 justify-center mt-6">
        <button onClick={() => { window.history.replaceState({}, '', '/'); setView('account'); }} className="bg-brand-900 text-white px-5 py-2.5 rounded-xl text-[12px] font-bold">سفارش‌های من</button>
        <button onClick={() => { window.history.replaceState({}, '', '/'); setView('shop'); }} className="border border-cream-300 text-brand-700 px-5 py-2.5 rounded-xl text-[12px] font-bold">ادامه خرید</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ShopProvider>
        <AdminProvider>
          <AppContent />
        </AdminProvider>
      </ShopProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const { view, setView } = useShop();
  const { isAdmin } = useAdmin();

  // بازگشت از درگاه پرداخت (زرین‌پال) به مسیر /payment-result
  useEffect(() => {
    if (window.location.pathname === '/payment-result') setView('payment-result');
  }, []);

  if (view === 'admin' || (isAdmin && view !== 'home' && view !== 'shop' && view !== 'product' && view !== 'cart' && view !== 'blog' && view !== 'post' && view !== 'login' && view !== 'account' && view !== 'payment-result')) {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <Header />
      <main>
        {view === 'home' && <HomeView />}
        {view === 'shop' && <ShopView />}
        {view === 'product' && <ProductDetail />}
        {view === 'cart' && <CartView />}
        {view === 'blog' && <BlogView />}
        {view === 'post' && <BlogPostView />}
        {view === 'login' && <CustomerLogin />}
        {view === 'account' && <CustomerAccount />}
        {view === 'payment-result' && <PaymentResult />}
      </main>
      <Footer />
      <Toasts />
    </div>
  );
}
