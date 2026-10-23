import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { Product, Category, categories, brands } from './data/products';
import { formatPrice, finalPrice, faNum, faDateFull, dayLabel, codeAmount, toCSV, downloadFile } from './utils/format';
import { summarize, growthRate, channelStats, funnelStages, bottleneck, aggregateCustomers, computePL, cashflowForecast } from './utils/analytics';
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
  const { setView, view, cart, wishlist, products, setSelectedProduct, setSelectedPage, settings } = useShop();
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
          <span className="font-display text-xl text-brand-900 hidden sm:block">{settings.storeName || 'تاسیز'}</span>
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
  const { products, setView, setSelectedProduct, articles, settings } = useShop();
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
          <h1 className="font-display text-3xl sm:text-5xl mb-4">فروشگاه آنلاین <span className="text-accent-500">تاسیز</span></h1>
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
          <h2 className="font-display text-xl text-brand-900">پیشنهاد ویژه تاسیز</h2>
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
        <h2 className="font-display text-xl text-brand-900 mb-4">مجله تاسیز</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {articles.slice(0, 3).map(a => (
            <div key={a.id} className="rounded-2xl overflow-hidden border border-cream-200 hover:shadow-lg transition-all cursor-pointer" onClick={() => setView('blog')}>
              <div className="h-32" style={{ background: `linear-gradient(135deg, ${a.colors[0]}, ${a.colors[1]})` }} />
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
  const { products, selectedProduct, reviews, setView, addToCart, toggleWishlist, wishlist, addToast } = useShop();
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

  const submitReview = () => {
    if (!reviewText || !reviewAuthor) return;
    const newReview = { id: `r-${Date.now()}`, productId: product.id, author: reviewAuthor, rating: reviewRating, text: reviewText, pros: [], cons: [], status: 'pending' as const, date: new Date().toLocaleDateString('fa-IR') };
    // In real app would call setReviews
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
  const { cart, removeFromCart, updateCartQty, settings, appliedCode, setAppliedCode, validateCode, placeOrder, money, addToast } = useShop();
  const [code, setCode] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [form, setForm] = useState({ name: '', mobile: '', city: '', address: '', postalCode: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotal = cart.reduce((s, i) => s + finalPrice(i.product.price, i.product.discount) * i.qty, 0);
  const discountAmt = appliedCode ? codeAmount(appliedCode, subtotal) : 0;
  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingCost;
  const taxRate = settings.showPricesWithTax ? (settings.vatRate + settings.levyRate) / 100 : 0;
  const tax = Math.round((subtotal - discountAmt) * taxRate);
  const total = subtotal - discountAmt + shipping + tax;
  const progressToFree = Math.min(100, (subtotal / settings.freeShippingThreshold) * 100);

  const applyCode = () => {
    const result = validateCode(code);
    if (result.error) { addToast('danger', result.error); return; }
    setAppliedCode(result.code);
    addToast('success', 'کد تخفیف اعمال شد');
  };

  const submitOrder = () => {
    const errs: Record<string, string> = {};
    if (!form.name) errs.name = 'نام الزامی است';
    if (!form.mobile || form.mobile.length < 11) errs.mobile = 'شماره موبایل معتبر وارد کنید';
    if (!form.city) errs.city = 'شهر الزامی است';
    if (!form.address) errs.address = 'آدرس الزامی است';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const code = placeOrder(form);
    setOrderCode(code);
    setShowCheckout(false);
    addToast('success', 'سفارش شما با موفقیت ثبت شد');
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
            <div className="flex justify-between"><span className="text-cream-500">هزینه ارسال</span><span className="font-bold">{shipping === 0 ? 'رایگان' : formatPrice(shipping) + ' تومان'}</span></div>
            {tax > 0 && <div className="flex justify-between"><span className="text-cream-500">مالیات</span><span className="font-bold">{formatPrice(tax)} تومان</span></div>}
            <div className="border-t border-cream-200 pt-2 flex justify-between"><span className="font-bold text-brand-900">مبلغ قابل پرداخت</span><span className="font-extrabold text-brand-900 text-[14px]">{formatPrice(total)} تومان</span></div>
          </div>
          <div className="mt-3 flex gap-2">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="کد تخفیف" className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
            <button onClick={applyCode} className="bg-brand-900 text-white px-3 py-2 rounded-xl text-[11px] font-bold">اعمال</button>
          </div>
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
            <button onClick={submitOrder} className="w-full mt-4 bg-brand-900 text-white py-3 rounded-xl font-extrabold text-sm">ثبت سفارش و پرداخت</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Blog View ─────────── */
function BlogView() {
  const { articles } = useShop();
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade">
      <h1 className="font-display text-xl text-brand-900 mb-6">مجله تاسیز</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map(a => (
          <div key={a.id} className="rounded-2xl overflow-hidden border border-cream-200 hover:shadow-lg transition-all">
            <div className="h-40" style={{ background: `linear-gradient(135deg, ${a.colors[0]}, ${a.colors[1]})` }} />
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

/* ─────────── Footer ─────────── */
function Footer() {
  const { settings } = useShop();
  return (
    <footer className="bg-brand-950 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><span className="font-display text-sm">ت</span></div><span className="font-display text-lg">{settings.storeName || 'تاسیز'}</span></div>
          <p className="text-[12px] text-brand-300 leading-6">فروشگاه آنلاین پوشاک تاسیز با سال‌ها تجربه در تولید و فروش انواع پوشاک با کیفیت.</p>
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
      <div className="border-t border-white/10 py-4 text-center text-[11px] text-brand-400">تمامی حقوق محفوظ است | فروشگاه تاسیز {faNum(new Date().getFullYear())}</div>
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

  const login = () => {
    if (user === 'admin' && pass === 'admin123') { setIsAdmin(true); setErr(''); }
    else setErr('نام کاربری یا رمز عبور اشتباه است');
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
          <h2 className="font-display text-xl text-brand-900">پنل مدیریت تاسیز</h2>
          <p className="text-[12px] text-cream-500 mt-1">برای ورود اطلاعات مدیر را وارد کنید</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-brand-700 mb-1 block">نام کاربری</label>
            <input value={user} onChange={e => setUser(e.target.value)} placeholder="admin" className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-[13px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-brand-700 mb-1 block">رمز عبور</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="admin123" className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-[13px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" onKeyDown={e => e.key === 'Enter' && login()} />
          </div>
          {err && <p className="text-[11px] text-coral-600 font-bold">{err}</p>}
          <button onClick={login} className="w-full bg-brand-900 text-white py-3 rounded-xl font-extrabold text-sm hover:bg-brand-700 transition-colors shadow-lg shadow-brand-900/25">ورود به پنل</button>
          <button onClick={() => { setUser('admin'); setPass('admin123'); }} className="w-full border border-cream-300 py-2.5 rounded-xl text-[12px] font-bold text-brand-700 hover:border-accent-500 transition-colors">ورود سریع با حساب آزمایشی</button>
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
  const { isAdmin, setIsAdmin, darkMode, toggleDark, currentRole, setRole, roles, adminSection, setAdminSection } = admin;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAdmin) return <AdminLogin />;

  const currentRoleData = roles.find((r: any) => r.name === currentRole);
  const allowedSections = currentRoleData?.sections || [];

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
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><span className="text-white font-display text-sm">ت</span></div><span className="font-display text-white text-lg">پنل تاسیز</span></div>
        </div>
        <nav className="p-3 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => { setAdminSection(s.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all ${adminSection === s.id ? 'bg-brand-600/15 text-accent-500 border-r-2 border-accent-500' : 'text-brand-100/70 hover:bg-white/5 hover:text-white'}`}>
              {s.icon}<span>{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/5 mt-4">
          <button onClick={() => { setIsAdmin(false); shop.setView('home'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold text-coral-400 hover:bg-white/5"><IconLogout className="w-4 h-4" />خروج</button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:mr-64">
        {/* Topbar */}
        <header className={`sticky top-0 z-30 ${darkMode ? 'bg-[#151b26]/90' : 'bg-white/90'} backdrop-blur-md border-b ${darkMode ? 'border-white/10' : 'border-cream-300'}`}>
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <button className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><IconMenu className="w-5 h-5" /></button>
              <h1 className={`font-display text-xl sm:text-2xl ${darkMode ? 'text-white' : 'text-brand-900'}`}>{sectionTitles[adminSection] || 'نمای کلی'}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] ${darkMode ? 'text-brand-300' : 'text-cream-500'}`}>{faDateFull()}</span>
              <select value={currentRole} onChange={e => setRole(e.target.value)} className={`rounded-xl border px-2 py-1.5 text-[11px] font-bold ${darkMode ? 'bg-[#1a212c] border-white/10 text-white' : 'border-cream-300 bg-white text-brand-900'}`}>
                {roles.map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
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
          <AdminContent section={adminSection} />
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
    return { day: faNum(d.getDate()), revenue: dayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0) };
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
          { l: 'نرخ تبدیل', v: `${faNum(stats.conversionRate)}٪`, icon: <IconTrending className="w-5 h-5" />, c: 'bg-purple-50 text-purple-700' },
          { l: 'فروش ۳۰ روزه', v: formatPrice(stats.totalRevenue), icon: <IconDollar className="w-5 h-5" />, c: 'bg-amber-50 text-amber-700' }
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
              <Tooltip contentStyle={{ background: '#0D1221', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11 }} />
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
  const { orders, setOrders, darkMode, log } = useAdmin();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const filtered = orders.filter((o: any) => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search && !o.code.includes(search) && !o.customer.includes(search) && !o.mobile.includes(search)) return false;
    return true;
  });
  const statusColors: Record<string, string> = { pending: 'bg-cream-100 text-brand-700', processing: 'bg-amber-100 text-amber-700', shipped: 'bg-blue-100 text-blue-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-coral-100 text-coral-700' };
  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const statusLabels: Record<string, string> = { pending: 'در انتظار', processing: 'در حال پردازش', shipped: 'ارسال شده', delivered: 'تحویل شده', cancelled: 'لغو شده' };

  const changeStatus = (order: any, status: string) => {
    const updated = orders.map((o: any) => o.id === order.id ? { ...o, status } : o);
    setOrders(updated);
    log(`تغییر وضعیت سفارش ${order.code} به ${statusLabels[status]}`, order.id);
    if (selected?.id === order.id) setSelected({ ...order, status });
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
  const { products, setProducts, setView, setSelectedProduct } = useShop();
  const { darkMode, log } = useAdmin();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = products.filter(p => {
    if (catFilter && p.category !== catFilter) return false;
    if (search && !p.name.includes(search) && !p.brand.includes(search)) return false;
    return true;
  });
  const active = products.filter(p => p.effective).length;
  const lowStock = products.filter(p => p.stock <= 5).length;
  const outOfStock = products.filter(p => p.stock === 0).length;

  const saveProduct = () => {
    if (editing.id) {
      setProducts(products.map(p => p.id === editing.id ? editing : p));
      log(`ویرایش محصول ${editing.name}`, editing.id);
    } else {
      const newP = { ...editing, id: `p-${Date.now()}` };
      setProducts([...products, newP]);
      log(`افزودن محصول ${editing.name}`, newP.id);
    }
    setShowForm(false); setEditing(null);
  };

  const deleteProduct = (id: string) => {
    if (confirm('آیا از حذف این محصول مطمئن هستید؟')) {
      setProducts(products.filter(p => p.id !== id));
      log(`حذف محصول`, id, 'warning');
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{ l: 'کل کالاها', v: faNum(products.length), c: 'bg-blue-50 text-blue-700' }, { l: 'فعال', v: faNum(active), c: 'bg-emerald-50 text-emerald-700' }, { l: 'کم‌موجود', v: faNum(lowStock), c: 'bg-amber-50 text-amber-700' }, { l: 'ناموجود', v: faNum(outOfStock), c: 'bg-coral-50 text-coral-700' }].map((s, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-3`}>
            <p className="text-[10px] text-cream-500">{s.l}</p><p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{s.v}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو محصول..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="">همه دسته‌ها</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => { setEditing({ name: '', category: 'underwear', subcategory: 'briefs', brand: 'تاسیز', price: 0, discount: 0, rating: 0, image: '', book: [], colors: [], sizes: [], stock: 0, sales: 0, isNew: true, effective: true, description: '', features: [], specs: {}, sku: '', commission: 8, vendor: '' }); setShowForm(true); }} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1"><IconPlus className="w-4 h-4" />افزودن محصول</button>
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تصویر</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نام</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">برند</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">قیمت</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">موجودی</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عملیات</th>
            </tr></thead>
            <tbody>{filtered.map(p => (
              <tr key={p.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'}`}>
                <td className="py-2 px-3"><img src={p.image} className="w-9 h-9 rounded-lg object-cover" alt="" /></td>
                <td className="py-2 px-3 font-bold">{p.name}</td>
                <td className="py-2 px-3">{p.brand}</td>
                <td className="py-2 px-3 tnum">{formatPrice(finalPrice(p.price, p.discount))}</td>
                <td className="py-2 px-3 tnum">{p.stock <= 5 ? <span className="text-coral-600 font-bold">{faNum(p.stock)}</span> : faNum(p.stock)}</td>
                <td className="py-2 px-3"><button onClick={() => { setProducts(products.map(x => x.id === p.id ? { ...x, effective: !x.effective } : x)); }} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.effective ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{p.effective ? 'فعال' : 'غیرفعال'}</button></td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600"><IconEdit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-coral-50 text-coral-500"><IconTrash className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}</tbody>
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
  const { orders, darkMode } = useAdmin();
  const { settings } = useShop();
  const pl = computePL(orders, settings);
  const channels = channelStats(orders);
  const funnel = funnelStages(orders);
  const bn = bottleneck(funnel);
  const last14 = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); const ds = d.toISOString().slice(0, 10); const dayOrders = orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds); return { day: faNum(d.getDate()), revenue: dayOrders.reduce((s: number, o: any) => s + (o.subtotal || 0), 0), profit: dayOrders.reduce((s: number, o: any) => s + (o.total || 0) * 0.3, 0) }; });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{ l: 'درآمد ناخالص', v: formatPrice(pl.grossSales), c: 'text-blue-700' }, { l: 'سود خالص', v: formatPrice(pl.netProfit), c: 'text-emerald-700' }, { l: 'حاشیه سود', v: `${faNum(pl.margin)}٪`, c: 'text-purple-700' }, { l: 'میانگین سفارش', v: formatPrice(orders.length ? pl.netRevenue / orders.length : 0), c: 'text-amber-700' }].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-3`}><p className="text-[10px] text-cream-500">{k.l}</p><p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : k.c}`}>{k.v}</p></div>
        ))}
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>درآمد در برابر سود</h3>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={last14}><CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} /><XAxis dataKey="day" tick={{ fontSize: 10 }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} /><YAxis tick={{ fontSize: 10 }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} /><Tooltip contentStyle={{ background: '#0D1221', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11 }} /><Bar dataKey="revenue" fill="#1A2238" radius={[4, 4, 0, 0]} /><Line dataKey="profit" stroke="#F5C518" strokeWidth={2} dot={false} /></ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>کانال‌های جذب</h3>
          <div className="space-y-2">{channels.map((ch, i) => (<div key={i} className="flex items-center justify-between text-[12px]"><span className="font-bold">{ch.name}</span><span className="tnum text-cream-500">{faNum(ch.orders)} سفارش | {formatPrice(ch.revenue)}</span></div>))}</div>
        </div>
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>قیف تبدیل</h3>
          <div className="space-y-2">{funnel.map((f, i) => (<div key={i}><div className="flex justify-between text-[11px] mb-0.5"><span>{f.stage}</span><span className="tnum">{faNum(f.count)} ({faNum(f.rate)}٪)</span></div><div className="w-full h-2 bg-cream-200 rounded-full"><div className="h-full bg-brand-900 rounded-full" style={{ width: `${f.rate}%` }} /></div></div>))}</div>
          <p className="text-[10px] text-coral-600 mt-2 font-bold">گلوگاه: {bn}</p>
        </div>
      </div>
    </div>
  );
}

function AdminFinance() {
  const { orders, invoices, setInvoices, expenses, setExpenses, bankTx, darkMode, log } = useAdmin();
  const { settings } = useShop();
  const pl = computePL(orders, settings);
  const [tab, setTab] = useState<'overview' | 'invoices' | 'expenses' | 'cashflow' | 'bank'>('overview');
  const [showExpense, setShowExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: '', category: 'سایر', amount: 0, note: '' });
  const cf = cashflowForecast(orders);

  const exportPL = () => { downloadFile(toCSV([{ ...pl }]), 'profit-loss.csv'); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[{ k: 'overview', l: 'صورت سود و زیان' }, { k: 'cashflow', l: 'جریان نقدی' }, { k: 'invoices', l: 'فاکتورها' }, { k: 'expenses', l: 'هزینه‌ها' }, { k: 'bank', l: 'تراکنش‌های بانکی' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 text-[12px] font-bold border-b-2 ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500'}`}>{t.l}</button>
        ))}
      </div>
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <div className="flex justify-between items-center mb-4"><h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>صورت سود و زیان</h3><button onClick={exportPL} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-cream-300 text-[11px] font-bold"><IconDownload className="w-3.5 h-3.5" />خروجی CSV</button></div>
            <div className="space-y-2 text-[12px]">
              {[{ l: 'فروش ناخالص', v: pl.grossSales }, { l: 'تخفیفات', v: -pl.discounts, neg: true }, { l: 'درآمد خالص', v: pl.netRevenue, bold: true }, { l: 'بهای تمام‌شده', v: -pl.cogs, neg: true }, { l: 'سود ناخالص', v: pl.grossProfit, bold: true }, { l: 'کارمزد درگاه', v: -pl.gatewayFee, neg: true }, { l: 'هزینه ارسال', v: -pl.shippingCost, neg: true }, { l: 'هزینه بسته‌بندی', v: -pl.packagingCost, neg: true }, { l: 'هزینه‌های جاری', v: -pl.operatingCosts, neg: true }, { l: 'سود خالص', v: pl.netProfit, bold: true, highlight: true }].map((r, i) => (
                <div key={i} className={`flex justify-between py-1.5 ${r.bold ? 'font-bold border-t border-cream-200' : ''} ${r.highlight ? 'text-emerald-700 text-[14px]' : ''}`}>
                  <span>{r.l}</span><span className={`tnum ${(r as any).neg ? 'text-coral-600' : ''}`}>{formatPrice(Math.abs(r.v))}{(r as any).neg ? '-' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab === 'invoices' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>فاکتورها</h3>
          <table className="w-full text-[12px]"><thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}><th className="text-start py-2 px-2 font-bold text-cream-500">شماره</th><th className="text-start py-2 px-2 font-bold text-cream-500">مشتری</th><th className="text-start py-2 px-2 font-bold text-cream-500">مبلغ</th><th className="text-start py-2 px-2 font-bold text-cream-500">وضعیت</th><th className="text-start py-2 px-2 font-bold text-cream-500">عملیات</th></tr></thead>
            <tbody>{invoices.map((inv: any) => (<tr key={inv.id} className={`border-b ${darkMode ? 'border-white/5' : 'border-cream-100'}`}><td className="py-2 px-2 font-bold">{inv.number}</td><td className="py-2 px-2">{inv.customer}</td><td className="py-2 px-2 tnum">{formatPrice(inv.amount)}</td><td className="py-2 px-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status === 'paid' ? 'پرداخت‌شده' : 'در انتظار'}</span></td><td className="py-2 px-2">{inv.status !== 'paid' && <button onClick={() => { setInvoices(invoices.map((x: any) => x.id === inv.id ? { ...x, status: 'paid' } : x)); log(`تسویه فاکتور ${inv.number}`, inv.id); }} className="text-[10px] font-bold text-emerald-600">تسویه</button>}</td></tr>))}</tbody>
          </table>
        </div>
      )}
      {tab === 'expenses' && (
        <div className="space-y-4">
          <button onClick={() => setShowExpense(true)} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1"><IconPlus className="w-4 h-4" />ثبت هزینه جدید</button>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <table className="w-full text-[12px]"><thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}><th className="text-start py-2 px-2 font-bold text-cream-500">عنوان</th><th className="text-start py-2 px-2 font-bold text-cream-500">دسته</th><th className="text-start py-2 px-2 font-bold text-cream-500">مبلغ</th><th className="text-start py-2 px-2 font-bold text-cream-500">تاریخ</th></tr></thead>
              <tbody>{expenses.map((e: any) => (<tr key={e.id} className={`border-b ${darkMode ? 'border-white/5' : 'border-cream-100'}`}><td className="py-2 px-2">{e.title}</td><td className="py-2 px-2">{e.category}</td><td className="py-2 px-2 tnum">{formatPrice(e.amount)}</td><td className="py-2 px-2">{dayLabel(new Date(e.date))}</td></tr>))}</tbody>
            </table>
          </div>
          {showExpense && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowExpense(false)}>
              <div className={`w-full max-w-sm rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-brand-900 mb-3">ثبت هزینه</h3>
                <div className="space-y-2">
                  <input value={newExpense.title} onChange={e => setNewExpense({ ...newExpense, title: e.target.value })} placeholder="عنوان" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                  <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none"><option>تبلیغات</option><option>حقوق</option><option>اجاره</option><option>بسته‌بندی</option><option>حمل‌ونقل</option><option>کارمزد درگاه</option><option>سایر</option></select>
                  <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: +e.target.value })} placeholder="مبلغ (تومان)" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                  <input value={newExpense.note} onChange={e => setNewExpense({ ...newExpense, note: e.target.value })} placeholder="یادداشت" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                </div>
                <button onClick={() => { setExpenses([...expenses, { ...newExpense, id: `exp-${Date.now()}`, date: new Date().toISOString() }]); setShowExpense(false); setNewExpense({ title: '', category: 'سایر', amount: 0, note: '' }); log('ثبت هزینه جدید', newExpense.title); }} className="w-full mt-3 bg-brand-900 text-white py-2 rounded-xl font-bold text-[12px]">ذخیره</button>
              </div>
            </div>
          )}
        </div>
      )}
      {tab === 'cashflow' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>پیش‌بینی جریان نقدی ۱۴ روز آینده</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cf}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: 'Vazirmatn' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 9, fontFamily: 'Vazirmatn' }} tickFormatter={(v) => formatPrice(v / 1000000) + 'M'} />
                <Tooltip contentStyle={{ background: '#0D1221', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11 }} />
                <Bar dataKey="inflow" fill="#1A2238" name="ورودی" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow" fill="#E34A4A" name="خروجی" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="balance" stroke="#F5C518" strokeWidth={2} name="مانده" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {tab === 'bank' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>تراکنش‌های بانکی</h3>
          <table className="w-full text-[12px]">
            <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}><th className="text-start py-2 px-2 font-bold text-cream-500 text-[10.5px]">نوع</th><th className="text-start py-2 px-2 font-bold text-cream-500 text-[10.5px]">روش</th><th className="text-start py-2 px-2 font-bold text-cream-500 text-[10.5px]">مبلغ</th><th className="text-start py-2 px-2 font-bold text-cream-500 text-[10.5px]">تاریخ</th><th className="text-start py-2 px-2 font-bold text-cream-500 text-[10.5px]">تطابق</th></tr></thead>
            <tbody>{bankTx.map((tx: any) => (<tr key={tx.id} className={`border-b ${darkMode ? 'border-white/5' : 'border-cream-100'}`}><td className="py-2 px-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-coral-100 text-coral-700'}`}>{tx.type === 'in' ? 'ورودی' : 'خروجی'}</span></td><td className="py-2 px-2">{tx.method}</td><td className="py-2 px-2 tnum">{formatPrice(tx.amount)}</td><td className="py-2 px-2">{dayLabel(new Date(tx.date))}</td><td className="py-2 px-2">{tx.matched ? <span className="text-emerald-600 text-[10px] font-bold">تطابق یافته</span> : <span className="text-amber-600 text-[10px] font-bold">در انتظار</span>}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminCustomers() {
  const { orders, darkMode } = useAdmin();
  const customers = aggregateCustomers(orders);
  const [search, setSearch] = useState('');
  const filtered = customers.filter(c => !search || c.name.includes(search) || c.mobile.includes(search) || c.city.includes(search));
  return (
    <div className="space-y-4">
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو نام، موبایل، شهر..." className="w-full max-w-md rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <table className="w-full text-[12px]"><thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}><th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نام</th><th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">شهر</th><th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">سفارش‌ها</th><th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مجموع خرید</th><th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">دسته</th></tr></thead>
          <tbody>{filtered.map(c => (<tr key={c.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'}`}><td className="py-2 px-3 font-bold">{c.name}</td><td className="py-2 px-3">{c.city}</td><td className="py-2 px-3 tnum">{faNum(c.orders)}</td><td className="py-2 px-3 tnum">{formatPrice(c.totalSpent)}</td><td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.segment === 'VIP' ? 'bg-purple-100 text-purple-700' : c.segment === 'وفادار' ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-brand-700'}`}>{c.segment}</span></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

function AdminReviews() {
  const { darkMode } = useAdmin();
  const { reviews, setReviews } = useShop();
  const [filter, setFilter] = useState('all');
  const filtered = reviews.filter(r => filter === 'all' || r.status === filter);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">{['all', 'pending', 'approved', 'rejected'].map(s => (<button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${filter === s ? 'bg-brand-900 text-white' : 'bg-cream-100 text-brand-700'}`}>{s === 'all' ? 'همه' : s === 'pending' ? 'در انتظار' : s === 'approved' ? 'تأیید شده' : 'رد شده'}</button>))}</div>
      <div className="space-y-2">{filtered.map(r => (
        <div key={r.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
          <div className="flex items-center justify-between mb-1"><span className="text-[12px] font-bold">{r.author}</span><Stars rating={r.rating} /></div>
          <p className="text-[12px] text-brand-700">{r.text}</p>
          {r.status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => { setReviews(reviews.map(x => x.id === r.id ? { ...x, status: 'approved' } : x)); }} className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold">تأیید</button>
              <button onClick={() => { setReviews(reviews.map(x => x.id === r.id ? { ...x, status: 'rejected' } : x)); }} className="px-2 py-1 rounded-lg bg-coral-100 text-coral-700 text-[10px] font-bold">رد</button>
            </div>
          )}
        </div>
      ))}</div>
    </div>
  );
}

function AdminDiscounts() {
  const { discountCodes, setDiscountCodes } = useShop();
  const { darkMode, log } = useAdmin();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'percent', value: 10, maxUses: 100, expiresAt: '2025-12-31', active: true });

  const save = () => {
    const newCode = { ...form, id: `dc-${Date.now()}`, usedCount: 0 };
    setDiscountCodes([...discountCodes, newCode]);
    log(`ایجاد کد تخفیف ${form.code}`, newCode.id);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(true)} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1"><IconPlus className="w-4 h-4" />ایجاد کد تخفیف</button>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <table className="w-full text-[12px]"><thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}><th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کد</th><th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نوع</th><th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مقدار</th><th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">استفاده/سقف</th><th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">انقضا</th><th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت</th></tr></thead>
          <tbody>{discountCodes.map((c: any) => (<tr key={c.id} className={`border-b ${darkMode ? 'border-white/5' : 'border-cream-100'}`}><td className="py-2 px-3 font-bold">{c.code}</td><td className="py-2 px-3">{c.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'}</td><td className="py-2 px-3 tnum">{c.type === 'percent' ? `${faNum(c.value)}٪` : formatPrice(c.value)}</td><td className="py-2 px-3 tnum">{faNum(c.usedCount)}/{faNum(c.maxUses)}</td><td className="py-2 px-3">{c.expiresAt}</td><td className="py-2 px-3"><button onClick={() => { setDiscountCodes(discountCodes.map((x: any) => x.id === c.id ? { ...x, active: !x.active } : x)); }} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{c.active ? 'فعال' : 'غیرفعال'}</button></td></tr>))}</tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className={`w-full max-w-sm rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3">کد تخفیف جدید</h3>
            <div className="space-y-2">
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="کد تخفیف" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none"><option value="percent">درصدی</option><option value="fixed">مبلغ ثابت</option></select>
              <input type="number" value={form.value} onChange={e => setForm({ ...form, value: +e.target.value })} placeholder="مقدار" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <input type="number" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: +e.target.value })} placeholder="سقف استفاده" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
            </div>
            <button onClick={save} className="w-full mt-3 bg-brand-900 text-white py-2 rounded-xl font-bold text-[12px]">ذخیره</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Remaining admin sections - simplified but functional */
function AdminGrowth() {
  const { campaigns, setCampaigns, darkMode, log } = useAdmin();
  return (
    <div className="space-y-4">
      <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>کمپین‌های بازاریابی</h3>
      <div className="space-y-2">{campaigns.map((c: any) => (
        <div key={c.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 flex items-center justify-between`}>
          <div><p className="text-[12px] font-bold">{c.name}</p><p className="text-[10px] text-cream-500">نوع: {c.type} | استفاده: {faNum(c.uses)}</p></div>
          <button onClick={() => { setCampaigns(campaigns.map((x: any) => x.id === c.id ? { ...x, active: !x.active } : x)); log(`تغییر وضعیت کمپین ${c.name}`, c.id); }} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{c.active ? 'فعال' : 'غیرفعال'}</button>
        </div>
      ))}</div>
    </div>
  );
}

function AdminReturns() {
  const { rmas, setRmas, darkMode, log } = useAdmin();
  const statusFlow = ['requested', 'approved', 'quality_check', 'returned', 'refunded'];
  const statusLabels: Record<string, string> = { requested: 'درخواست', approved: 'تأیید شده', quality_check: 'بررسی کیفیت', returned: 'بازگشت به انبار', refunded: 'بازگشت وجه', rejected: 'رد شده' };
  return (
    <div className="space-y-3">{rmas.map((r: any) => (
      <div key={r.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
        <div className="flex items-center justify-between mb-2"><span className="text-[12px] font-bold">{r.productName}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'refunded' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-coral-100 text-coral-700' : 'bg-amber-100 text-amber-700'}`}>{statusLabels[r.status] || r.status}</span></div>
        <p className="text-[11px] text-cream-500">مشتری: {r.customer} | دلیل: {r.reason}</p>
        {r.status !== 'refunded' && r.status !== 'rejected' && (
          <div className="flex gap-1 mt-2">
            <button onClick={() => { const idx = statusFlow.indexOf(r.status); const next = idx < statusFlow.length - 1 ? statusFlow[idx + 1] : 'refunded'; setRmas(rmas.map((x: any) => x.id === r.id ? { ...x, status: next } : x)); log(`پیشبرد مرجوعی ${r.id}`, r.id); }} className="px-2 py-1 rounded-lg bg-brand-900 text-white text-[10px] font-bold">مرحله بعد</button>
            <button onClick={() => { setRmas(rmas.map((x: any) => x.id === r.id ? { ...x, status: 'rejected' } : x)); }} className="px-2 py-1 rounded-lg bg-coral-100 text-coral-700 text-[10px] font-bold">رد</button>
          </div>
        )}
      </div>
    ))}</div>
  );
}

function AdminSupport() {
  const { tickets, setTickets, darkMode, log } = useAdmin();
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState('');
  return (
    <div className="space-y-3">
      {tickets.map((t: any) => (
        <div key={t.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 cursor-pointer hover:shadow-md`} onClick={() => setSelected(t)}>
          <div className="flex items-center justify-between"><span className="text-[12px] font-bold">{t.subject}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'open' ? 'bg-coral-100 text-coral-700' : t.status === 'answered' ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{t.status === 'open' ? 'باز' : t.status === 'answered' ? 'پاسخ داده شده' : 'بسته'}</span></div>
          <p className="text-[11px] text-cream-500 mt-1">{t.customer} | {t.message}</p>
        </div>
      ))}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className={`w-full max-w-md rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise max-h-[80vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3">{selected.subject}</h3>
            <div className="space-y-2 mb-4">{selected.replies?.map((r: any, i: number) => (<div key={i} className={`p-2 rounded-lg text-[12px] ${r.from === 'customer' ? 'bg-cream-50' : 'bg-brand-50'}`}><p className="font-bold text-[10px] text-cream-500 mb-0.5">{r.from === 'customer' ? 'مشتری' : 'پشتیبانی'}</p>{r.text}</div>))}</div>
            <div className="flex gap-2"><input value={reply} onChange={e => setReply(e.target.value)} placeholder="پاسخ..." className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /><button onClick={() => { const updated = tickets.map((t: any) => t.id === selected.id ? { ...t, replies: [...(t.replies || []), { from: 'support', text: reply, date: new Date().toISOString() }], status: 'answered' } : t); setTickets(updated); setSelected({ ...selected, status: 'answered' }); setReply(''); log(`پاسخ به تیکت ${selected.subject}`, selected.id); }} className="bg-brand-900 text-white px-3 py-2 rounded-xl text-[12px] font-bold"><IconSend className="w-4 h-4" /></button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminOperations() {
  const { orders, darkMode } = useAdmin();
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const ds = d.toISOString().slice(0, 10); return { day: faNum(d.getDate()), count: orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds).length }; });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[{ l: 'سفارش پردازش‌شده', v: faNum(orders.filter((o: any) => o.status === 'delivered').length) }, { l: 'در انتظار', v: faNum(orders.filter((o: any) => o.status === 'pending').length) }, { l: 'تحویل موفق', v: faNum(orders.filter((o: any) => o.status === 'delivered').length) }].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-3`}><p className="text-[10px] text-cream-500">{k.l}</p><p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p></div>
        ))}
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>سفارش‌های ۷ روز اخیر</h3>
        <ResponsiveContainer width="100%" height={180}><BarChart data={last7}><CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} /><XAxis dataKey="day" tick={{ fontSize: 10 }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} /><YAxis tick={{ fontSize: 10 }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} /><Tooltip contentStyle={{ background: '#0D1221', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11 }} /><Bar dataKey="count" fill="#1A2238" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
      </div>
    </div>
  );
}

function AdminSystem() {
  const { roles, audit, loginHistory, errorLog, integrations, darkMode, log, setIsAdmin } = useAdmin();
  const [tab, setTab] = useState<'roles' | 'audit' | 'security' | 'integrations' | 'backup'>('roles');
  const backupRef = useRef<HTMLInputElement>(null);

  const exportBackup = () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tasis-')) { try { data[key] = JSON.parse(localStorage.getItem(key) || ''); } catch { data[key] = localStorage.getItem(key); } }
    }
    downloadFile(JSON.stringify(data, null, 2), `tasis-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    log('خروجی پشتیبان', 'system');
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        Object.entries(data).forEach(([key, val]) => { localStorage.setItem(key, JSON.stringify(val)); });
        log('بازیابی پشتیبان', 'system');
        alert('بازیابی با موفقیت انجام شد. صفحه بارگذاری مجدد می‌شود.');
        window.location.reload();
      } catch { alert('فایل پشتیبان نامعتبر است'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[{ k: 'roles', l: 'نقش‌ها' }, { k: 'audit', l: 'لاگ رویدادها' }, { k: 'security', l: 'ورودها و خطاها' }, { k: 'integrations', l: 'یکپارچگی‌ها' }, { k: 'backup', l: 'پشتیبان‌گیری' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 text-[12px] font-bold border-b-2 ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500'}`}>{t.l}</button>
        ))}
      </div>
      {tab === 'roles' && (
        <div className="space-y-2">{roles.map((r: any) => (<div key={r.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-3 flex items-center justify-between`}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: r.color }} /><span className="text-[12px] font-bold">{r.name}</span></div><span className="text-[10px] text-cream-500">{faNum(r.sections.length)} بخش</span></div>))}</div>
      )}
      {tab === 'audit' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
          <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-bold">لاگ رویدادها</h3><button onClick={() => downloadFile(JSON.stringify(audit, null, 2), 'audit-log.json', 'application/json')} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-cream-300 text-[10px] font-bold"><IconDownload className="w-3 h-3" />JSON</button></div>
          <div className="space-y-1 max-h-64 overflow-y-auto">{audit.slice(0, 20).map((a: any) => (<div key={a.id} className="flex items-center justify-between text-[11px] py-1 border-b border-cream-100"><span>{a.action}</span><span className="text-cream-500">{dayLabel(new Date(a.at))}</span></div>))}</div>
        </div>
      )}
      {tab === 'security' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <h3 className="text-sm font-bold mb-2">تاریخچه ورود</h3>
            {loginHistory.map((l: any) => (<div key={l.id} className="flex items-center justify-between text-[11px] py-1.5 border-b border-cream-100"><span>{l.user} ({l.role})</span><span className={`${l.success ? 'text-emerald-600' : 'text-coral-600'}`}>{l.success ? 'موفق' : 'ناموفق'}</span></div>))}
          </div>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <h3 className="text-sm font-bold mb-2">خطاهای فنی</h3>
            {errorLog.map((e: any) => (<div key={e.id} className="flex items-center justify-between text-[11px] py-1.5 border-b border-cream-100"><span>{e.message}</span><span className={e.resolved ? 'text-emerald-600' : 'text-coral-600'}>{e.resolved ? 'حل شده' : 'فعال'}</span></div>))}
          </div>
        </div>
      )}
      {tab === 'integrations' && (
        <div className="space-y-2">{integrations.map((i: any) => (<div key={i.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-3 flex items-center justify-between`}><div><span className="text-[12px] font-bold">{i.name}</span><span className="text-[10px] text-cream-500 ms-2">({i.type})</span></div><button className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${i.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{i.connected ? 'متصل' : 'قطع'}</button></div>))}</div>
      )}
      {tab === 'backup' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 space-y-4`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>پشتیبان‌گیری و بازیابی</h3>
          <p className="text-[11px] text-cream-500">تمام داده‌های فروشگاه در localStorage مرورگر ذخیره می‌شوند. با پشتیبان‌گیری می‌توانید داده‌ها را به فایل JSON صادر و در صورت نیاز بازیابی کنید.</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportBackup} className="flex items-center gap-2 bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold"><IconDownload className="w-4 h-4" />دانلود فایل پشتیبان</button>
            <input ref={backupRef} type="file" accept=".json" onChange={importBackup} className="hidden" />
            <button onClick={() => backupRef.current?.click()} className="flex items-center gap-2 border border-cream-300 px-4 py-2.5 rounded-xl text-[12px] font-bold"><IconUpload className="w-4 h-4" />بازیابی از فایل</button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-[11px] font-bold text-amber-700">توجه: داده‌ها در localStorage نگهداری می‌شوند و با پاک کردن حافظه مرورگر حذف خواهند شد.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminSettings() {
  const { darkMode } = useAdmin();
  const { settings, setSettings: setShopSettings } = useShop();
  const [form, setForm] = useState({ ...settings });
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const save = () => { setShopSettings(form); };

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
        <p className="text-[11px] text-cream-500 mb-3">بنرها از بخش مدیریت محتوا قابل مدیریت هستند. برای افزودن بنر جدید به بخش «مدیریت محتوا» مراجعه کنید.</p>
        <div className="flex items-center gap-3">
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" />
          <button onClick={() => bannerRef.current?.click()} className="border border-cream-300 rounded-xl px-3 py-2 text-[11px] font-bold flex items-center gap-1"><IconUpload className="w-4 h-4" />آپلود تصویر بنر</button>
        </div>
      </div>
      <div className={`rounded-2xl border border-coral-200 bg-coral-50 p-5`}>
        <h3 className="text-sm font-bold text-coral-700 mb-2">منطقه خطر</h3>
        <p className="text-[11px] text-coral-600 mb-3">بازنشانی تمام داده‌های فروشگاه به حالت اولیه</p>
        <button onClick={() => { if (confirm('آیا مطمئن هستید؟ تمام داده‌ها حذف خواهند شد.')) { localStorage.clear(); window.location.reload(); } }} className="bg-coral-500 text-white px-4 py-2 rounded-xl text-[12px] font-bold">بازنشانی داده‌ها</button>
      </div>
      <button onClick={save} className="bg-brand-900 text-white px-6 py-3 rounded-xl font-extrabold text-sm shadow-lg shadow-brand-900/25">ذخیره تنظیمات</button>
    </div>
  );
}

function AdminInsights() {
  const { orders, darkMode } = useAdmin();
  const { products } = useShop();
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const ds = d.toISOString().slice(0, 10); return orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds).reduce((s: number, o: any) => s + (o.total || 0), 0); });
  const avg = last7.reduce((a, b) => a + b, 0) / 7;
  const slope = (last7[6] - last7[0]) / 7;
  const forecast = Array.from({ length: 7 }, (_, i) => Math.max(0, avg + slope * (i + 1)));
  const stockRisks = products.filter(p => p.stock > 0 && p.sales > 0 && p.stock / (p.sales / 30) < 7);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>پیش‌بینی فروش ۷ روز آینده</h3>
          <ResponsiveContainer width="100%" height={180}><LineChart data={forecast.map((v, i) => ({ day: faNum(i + 1), value: Math.round(v) }))}><CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} /><XAxis dataKey="day" tick={{ fontSize: 10 }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} /><YAxis tick={{ fontSize: 10 }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} /><Tooltip contentStyle={{ background: '#0D1221', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11 }} /><Line dataKey="value" stroke="#F5C518" strokeWidth={2} /></LineChart></ResponsiveContainer>
          <p className="text-[11px] text-cream-500 mt-2">شیب روند: {slope > 0 ? 'صعودی' : 'نزولی'} | میانگین روزانه: {formatPrice(avg)} تومان</p>
        </div>
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>هشدار اتمام موجودی</h3>
          {stockRisks.length === 0 ? <p className="text-[12px] text-cream-500">موردی یافت نشد</p> : (
            <div className="space-y-2">{stockRisks.map(p => (<div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-coral-50"><img src={p.image} className="w-8 h-8 rounded-lg object-cover" alt="" /><div><p className="text-[11px] font-bold">{p.name}</p><p className="text-[10px] text-coral-600">موجودی: {faNum(p.stock)} | فروش روزانه: {faNum(Math.round(p.sales / 30))}</p></div></div>))}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminAffiliates() {
  const { affiliates, setAffiliates, payouts, setPayouts, affConf, setAffConf, darkMode, log } = useAdmin();
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>کارگزاران</h3>
        <table className="w-full text-[12px]"><thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}><th className="text-start py-2 px-2 font-bold text-cream-500">نام</th><th className="text-start py-2 px-2 font-bold text-cream-500">کد</th><th className="text-start py-2 px-2 font-bold text-cream-500">سطح</th><th className="text-start py-2 px-2 font-bold text-cream-500">فروش</th><th className="text-start py-2 px-2 font-bold text-cream-500">پورسانت</th><th className="text-start py-2 px-2 font-bold text-cream-500">وضعیت</th></tr></thead>
          <tbody>{affiliates.map((a: any) => (<tr key={a.id} className={`border-b ${darkMode ? 'border-white/5' : 'border-cream-100'} ${a.flagged ? 'bg-coral-50' : ''}`}><td className="py-2 px-2 font-bold">{a.name}{a.flagged && <IconAlert className="w-3 h-3 text-coral-500 inline ms-1" />}</td><td className="py-2 px-2 tnum">{a.refCode}</td><td className="py-2 px-2">{a.level}</td><td className="py-2 px-2 tnum">{formatPrice(a.sales)}</td><td className="py-2 px-2 tnum">{formatPrice(a.commission)}</td><td className="py-2 px-2"><button onClick={() => { setAffiliates(affiliates.map((x: any) => x.id === a.id ? { ...x, active: !x.active } : x)); }} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.active ? 'bg-emerald-100 text-emerald-700' : 'bg-coral-100 text-coral-700'}`}>{a.active ? 'فعال' : 'مسدود'}</button></td></tr>))}</tbody>
        </table>
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>صف تسویه‌ها</h3>
        <div className="space-y-2">{payouts.map((p: any) => (<div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-cream-50"><span className="text-[12px]">مبلغ: {formatPrice(p.amount)} | وضعیت: {p.status === 'paid' ? 'پرداخت شده' : 'در انتظار'}</span>{p.status === 'pending' && <button onClick={() => { setPayouts(payouts.map((x: any) => x.id === p.id ? { ...x, status: 'paid' } : x)); }} className="px-2 py-1 rounded-lg bg-brand-900 text-white text-[10px] font-bold">پرداخت</button>}</div>))}</div>
      </div>
    </div>
  );
}

function AdminPOS() {
  const { products, setProducts, addToCart } = useShop();
  const { darkMode, log } = useAdmin();
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const filtered = products.filter(p => p.effective && (!catFilter || p.category === catFilter) && (!search || p.name.includes(search)));

  const addItem = (p: Product) => {
    const existing = cart.find(c => c.id === p.id);
    if (existing) setCart(cart.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c));
    else setCart([...cart, { id: p.id, name: p.name, price: finalPrice(p.price, p.discount), qty: 1 }]);
  };

  const checkout = () => {
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
    cart.forEach(c => { const p = products.find(x => x.id === c.id); if (p) { p.stock -= c.qty; } });
    setProducts([...products]);
    log(`فروش حضوری - ${formatPrice(total)} تومان`, 'pos');
    alert(`فاکتور صادر شد. مبلغ: ${formatPrice(total)} تومان`);
    setCart([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex gap-2"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو یا اسکن بارکد..." className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /><select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none"><option value="">همه</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">{filtered.map(p => (<button key={p.id} onClick={() => addItem(p)} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-200 bg-white'} p-2 text-start hover:shadow-md transition-all`}><img src={p.image} className="w-full aspect-square rounded-lg object-cover mb-1" alt="" /><p className="text-[10px] font-bold truncate">{p.name}</p><p className="text-[10px] text-cream-500">موجودی: {faNum(p.stock)}</p></button>))}</div>
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 h-fit sticky top-24`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>فاکتور جاری</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">{cart.map((c, i) => (<div key={i} className="flex justify-between text-[12px]"><span>{c.name} x{faNum(c.qty)}</span><span className="tnum">{formatPrice(c.price * c.qty)}</span></div>))}</div>
        {cart.length > 0 && (<><div className="border-t border-cream-200 mt-2 pt-2 flex justify-between font-bold text-[13px]"><span>جمع کل</span><span className="tnum">{formatPrice(cart.reduce((s, c) => s + c.price * c.qty, 0))} تومان</span></div><button onClick={checkout} className="w-full mt-3 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px]">صدور فاکتور</button></>)}
      </div>
    </div>
  );
}

function AdminContentManager() {
  const { pages, setPages, banners, setBanners, posts, setPosts, darkMode, log } = useAdmin();
  const [tab, setTab] = useState<'pages' | 'banners' | 'blog'>('pages');
  const [editing, setEditing] = useState<any>(null);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-cream-300">{[{ k: 'pages', l: 'صفحات' }, { k: 'banners', l: 'بنرها' }, { k: 'blog', l: 'وبلاگ' }].map(t => (<button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 text-[12px] font-bold border-b-2 ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500'}`}>{t.l}</button>))}</div>
      {tab === 'pages' && (
        <div className="space-y-3">
          <button onClick={() => setEditing({ id: '', slug: '', title: '', content: '', metaTitle: '', metaDesc: '', keywords: '', published: true })} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1"><IconPlus className="w-4 h-4" />صفحه جدید</button>
          {pages.map((p: any) => (<div key={p.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-3 flex items-center justify-between`}><div><p className="text-[12px] font-bold">{p.title}</p><p className="text-[10px] text-cream-500">/{p.slug}</p></div><div className="flex gap-1"><button onClick={() => setEditing(p)} className="p-1.5 rounded-lg hover:bg-cream-100"><IconEdit className="w-3.5 h-3.5 text-brand-600" /></button><button onClick={() => { setPages(pages.filter((x: any) => x.id !== p.id)); }} className="p-1.5 rounded-lg hover:bg-coral-50"><IconTrash className="w-3.5 h-3.5 text-coral-500" /></button></div></div>))}
        </div>
      )}
      {tab === 'banners' && (
        <div className="space-y-3">
          <button onClick={() => setEditing({ id: '', title: '', subtitle: '', btnText: 'مشاهده', position: 'home', active: true, expiresAt: '2025-12-31', color1: '#1A2238', color2: '#3d61a3' })} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1"><IconPlus className="w-4 h-4" />بنر جدید</button>
          {banners.map((b: any) => (<div key={b.id} className="rounded-xl border border-cream-200 p-3 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-12 h-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${b.color1}, ${b.color2})` }} /><div><p className="text-[12px] font-bold">{b.title}</p><p className="text-[10px] text-cream-500">{b.position}</p></div></div><button onClick={() => setBanners(banners.map((x: any) => x.id === b.id ? { ...x, active: !x.active } : x))} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.active ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{b.active ? 'فعال' : 'غیرفعال'}</button></div>))}
        </div>
      )}
      {tab === 'blog' && (
        <div className="space-y-3">
          <button onClick={() => setEditing({ id: '', title: '', category: '', tags: [], content: '', views: 0, date: new Date().toISOString(), color1: '#667eea', color2: '#764ba2', published: true, comments: 0 })} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1"><IconPlus className="w-4 h-4" />پست جدید</button>
          {posts.map((p: any) => (<div key={p.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-3 flex items-center justify-between`}><div><p className="text-[12px] font-bold">{p.title}</p><p className="text-[10px] text-cream-500">{faNum(p.views)} بازدید</p></div></div>))}
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3">{editing.id ? 'ویرایش' : 'ایجاد'}</h3>
            <div className="space-y-2">
              <input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="عنوان" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              {editing.slug !== undefined && <input value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="نامک (slug)" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />}
              <textarea value={editing.content || ''} onChange={e => setEditing({ ...editing, content: e.target.value })} placeholder="محتوا (مارک‌داون)" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none h-32 resize-none" />
              <input value={editing.metaTitle || ''} onChange={e => setEditing({ ...editing, metaTitle: e.target.value })} placeholder="متا تایتل" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <input value={editing.metaDesc || ''} onChange={e => setEditing({ ...editing, metaDesc: e.target.value })} placeholder="متا دیسکریپشن" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
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
            }} className="w-full mt-3 bg-brand-900 text-white py-2 rounded-xl font-bold text-[12px]">ذخیره</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminVendors() {
  const { vendors, setVendors, darkMode, log } = useAdmin();
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>فروشندگان</h3>
        <table className="w-full text-[12px]"><thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}><th className="text-start py-2 px-2 font-bold text-cream-500">نام</th><th className="text-start py-2 px-2 font-bold text-cream-500">فروش کل</th><th className="text-start py-2 px-2 font-bold text-cream-500">بدهی</th><th className="text-start py-2 px-2 font-bold text-cream-500">وضعیت</th></tr></thead>
          <tbody>{vendors.map((v: any) => (<tr key={v.id} className={`border-b ${darkMode ? 'border-white/5' : 'border-cream-100'}`}><td className="py-2 px-2 font-bold">{v.name}</td><td className="py-2 px-2 tnum">{formatPrice(v.totalSales)}</td><td className="py-2 px-2 tnum">{formatPrice(v.balance)}</td><td className="py-2 px-2"><button onClick={() => { setVendors(vendors.map((x: any) => x.id === v.id ? { ...x, active: !x.active } : x)); }} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.active ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{v.active ? 'فعال' : 'غیرفعال'}</button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

function AdminLogistics() {
  const { carriers, setCarriers, orders, darkMode, log } = useAdmin();
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>حامل‌های ارسال</h3>
        <div className="space-y-2">{carriers.map((c: any) => (<div key={c.id} className={`rounded-xl border ${darkMode ? 'border-white/10' : 'border-cream-200'} p-3 flex items-center justify-between`}><div><p className="text-[12px] font-bold">{c.name}</p><p className="text-[10px] text-cream-500">هزینه: {formatPrice(c.baseCost)} | {c.deliveryDays}</p></div><button onClick={() => { setCarriers(carriers.map((x: any) => x.id === c.id ? { ...x, active: !x.active } : x)); }} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{c.active ? 'فعال' : 'غیرفعال'}</button></div>))}</div>
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>مرکز کنترل مرسولات</h3>
        <div className="space-y-2">{orders.filter((o: any) => o.status === 'processing' || o.status === 'shipped').slice(0, 10).map((o: any) => (<div key={o.id} className={`rounded-xl border ${darkMode ? 'border-white/10' : 'border-cream-200'} p-3 flex items-center justify-between`}><div><p className="text-[12px] font-bold">{o.code} - {o.customer}</p><p className="text-[10px] text-cream-500">{o.city}</p></div><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{o.status === 'shipped' ? 'ارسال شده' : 'آماده ارسال'}</span></div>))}</div>
      </div>
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
export default function App() {
  return (
    <ShopProvider>
      <AdminProvider>
        <AppContent />
      </AdminProvider>
    </ShopProvider>
  );
}

function AppContent() {
  const { view } = useShop();
  const { isAdmin } = useAdmin();

  if (view === 'admin' || (isAdmin && view !== 'home' && view !== 'shop' && view !== 'product' && view !== 'cart' && view !== 'blog')) {
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
      </main>
      <Footer />
      <Toasts />
    </div>
  );
}
