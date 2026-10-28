import ProductCard from '../shared/ProductCard';
import { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { IconTruck, IconShield, IconChevronLeft, IconPackage, IconReturn, IconPhone, IconZap } from '../Icons';

export default function HomeView() {
  const { products, categories, brands, setView, setSelectedProduct, setSelectedPost, articles, settings } = useShop();
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
          <p className="text-brand-200 text-sm sm:text-base max-w-lg mb-6">بهترین پوشاک با کیفیت تولیدی و برندهای معتبر.</p>
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
