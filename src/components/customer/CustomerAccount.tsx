import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '../../services/queryClient';
import { useShop } from '../../context/ShopContext';
import { faNum, dayLabel } from '../../utils/format';
import * as api from '../../services/api';

export default function CustomerAccount() {
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
