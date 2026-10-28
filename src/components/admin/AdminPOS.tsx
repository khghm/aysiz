import { useState, useRef } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { Product } from '../../data/products';
import { formatPrice, finalPrice, faNum } from '../../utils/format';
import * as api from '../../services/api';
import { IconSearch, IconCheck, IconPlus, IconMinus } from '../Icons';

export default function AdminPOS() {
  const { products, categories, setProducts, settings, addToast } = useShop();
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
    const id = saleId.current || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
