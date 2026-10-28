import { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import * as api from '../../services/api';
import { IconCheck, IconX } from '../Icons';

export default function PaymentResult() {
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
