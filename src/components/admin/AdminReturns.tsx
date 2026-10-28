import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { faNum, dayLabel } from '../../utils/format';
import { isPaidOrder } from '../../utils/analytics';

export default function AdminReturns() {
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
