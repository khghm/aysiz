import { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, finalPrice, faNum, codeAmount } from '../../utils/format';
import * as api from '../../services/api';
import { IconCart, IconTruck, IconLock, IconCheck, IconPlus, IconMinus, IconTrash } from '../Icons';

export default function CartView() {
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
