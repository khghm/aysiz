import { useState, useEffect, useCallback } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, faNum, dayLabel } from '../../utils/format';
import * as api from '../../services/api';
import { IconTruck, IconCheck, IconPackage, IconBox } from '../Icons';

export default function AdminLogistics() {
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
