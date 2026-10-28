import Stars from '../shared/Stars';
import ProductCard from '../shared/ProductCard';
import { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { formatPrice, finalPrice, faNum } from '../../utils/format';
import * as api from '../../services/api';
import { IconCart, IconHeart, IconStar, IconTruck, IconShield, IconCheck, IconPlus, IconMinus, IconChevronRight, IconReturn } from '../Icons';

export default function ProductDetail() {
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
