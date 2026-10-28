import { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { Product } from '../../data/products';
import { formatPrice, finalPrice, faNum } from '../../utils/format';
import { IconHome, IconCart, IconSearch, IconUser, IconMenu, IconSettings, IconClipboard, IconStore } from '../Icons';

export default function Header() {
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
            {settings.logo
              ? <img src={settings.logo} className="w-full h-full rounded-xl object-contain bg-white" alt={settings.storeName || 'لوگوی فروشگاه'} />
              : <span className="text-white font-display text-lg">ت</span>}
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
