import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, finalPrice, faNum, dayLabel } from '../../utils/format';
import * as api from '../../services/api';
import { IconX, IconEye } from '../Icons';

export default function AdminOrders() {
  const { darkMode, log, orders, setOrders } = useAdmin();
  const { addToast } = useShop();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const filtered = orders.filter((o: any) => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search && !String(o.code||'').includes(search) && !String(o.customer||o.name||'').includes(search) && !String(o.mobile||'').includes(search)) return false;
    return true;
  });
  const statusColors: Record<string, string> = { pending: 'bg-cream-100 text-brand-700', processing: 'bg-amber-100 text-amber-700', shipped: 'bg-blue-100 text-blue-700', delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-coral-100 text-coral-700' };
  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const statusLabels: Record<string, string> = { pending: 'در انتظار', processing: 'در حال پردازش', shipped: 'ارسال شده', delivered: 'تحویل شده', cancelled: 'لغو شده' };
  const changeStatus = async (order: any, status: string) => {
    try {
      const saved = await api.orders.updateStatus(order.id, status);
      setOrders(orders.map((item: any) => item.id === saved.id ? saved : item));
      log(`تغییر وضعیت سفارش ${order.code} به ${statusLabels[status]}`, order.id);
      if (selected?.id === order.id) setSelected(saved);
      addToast('success', 'وضعیت سفارش ذخیره شد');
    } catch (error: any) {
      addToast('danger', `تغییر وضعیت سفارش ناموفق بود: ${error.message}`);
    }
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
