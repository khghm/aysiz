import { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, faNum, dayLabel, toExcel, downloadFile } from '../../utils/format';
import * as api from '../../services/api';
import { IconCheck, IconDollar, IconDownload, IconStore, IconTrending } from '../Icons';

export default function AdminVendors() {
  const { vendors, setVendors, darkMode, log } = useAdmin();
  const { addToast } = useShop();
  const [tab, setTab] = useState<'vendors' | 'performance' | 'settlements'>('vendors');
  const [settlements, setSettlements] = useState<any[]>([]);
  
  const totalSales = vendors.reduce((s: number, v: any) => s + v.totalSales, 0);
  const totalBalance = vendors.reduce((s: number, v: any) => s + v.balance, 0);

  useEffect(() => {
    api.logistics.settlements().then(({ items }) => setSettlements(items)).catch((error) => {
      addToast('danger', `بارگذاری تاریخچه تسویه ناموفق بود: ${error.message}`);
    });
  }, [addToast]);

  const settleVendor = async (vendor: any) => {
    if (!(vendor.balance > 0)) return;
    const reference = window.prompt('پس از انجام حواله خارج از سامانه، شماره پیگیری بانکی را وارد کنید:');
    if (!reference?.trim()) return;
    try {
      const result = await api.logistics.settleVendor(vendor.id, reference.trim());
      setVendors((current) => current.map((item: any) => item.id === vendor.id ? result.vendor : item));
      setSettlements((current) => [result.settlement, ...current]);
      log(`ثبت حواله انجام‌شده برای فروشنده ${vendor.name}`, result.settlement.id);
      addToast('success', 'سند تسویه ثبت شد؛ انتقال بانکی خارج از سامانه انجام شده است');
    } catch (error: any) {
      addToast('danger', `ثبت سند تسویه ناموفق بود: ${error.message}`);
    }
  };

  const exportVendors = () => {
    const data = vendors.map((v: any) => ({
      'نام فروشنده': v.name, 'نام حقوقی': v.legalName, 'شبا': v.iban, 'تلفن': v.phone,
      'فروش کل (تومان)': v.totalSales, 'تعداد سفارش': v.totalOrders, 'تعداد قلم': v.totalItems,
      'بدهی جاری (تومان)': v.balance, 'وضعیت': v.active ? 'فعال' : 'غیرفعال'
    }));
    downloadFile(toExcel(data, 'گزارش فروشندگان'), 'vendors.xls', 'application/vnd.ms-excel');
    log('خروجی گزارش فروشندگان', 'vendors');
  };

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'کل فروشندگان', v: faNum(vendors.length), c: 'bg-blue-50 text-blue-700', icon: <IconStore className="w-5 h-5" /> },
          { l: 'فروش کل', v: formatPrice(totalSales), c: 'bg-emerald-50 text-emerald-700', icon: <IconTrending className="w-5 h-5" /> },
          { l: 'بدهی جاری', v: formatPrice(totalBalance), c: 'bg-amber-50 text-amber-700', icon: <IconDollar className="w-5 h-5" /> },
          { l: 'فعال', v: faNum(vendors.filter((v: any) => v.active).length), c: 'bg-purple-50 text-purple-700', icon: <IconCheck className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-cream-500">{k.l}</p><div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div></div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[{ k: 'vendors', l: 'فروشندگان' }, { k: 'performance', l: 'عملکرد' }, { k: 'settlements', l: 'تسویه‌ها' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>{t.l}</button>
        ))}
      </div>

      {/* Vendors Tab */}
      {tab === 'vendors' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[11px] text-cream-500">{faNum(vendors.length)} فروشنده</p>
            <button onClick={exportVendors} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-cream-300 text-[11px] font-bold"><IconDownload className="w-3.5 h-3.5" />خروجی اکسل</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vendors.map((v: any) => (
              <div key={v.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 hover:shadow-lg transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
                      <IconStore className="w-6 h-6 text-brand-700" />
                    </div>
                    <div>
                      <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{v.name}</h4>
                      <p className="text-[10px] text-cream-500">{v.legalName} | {v.phone}</p>
                    </div>
                  </div>
                  <button onClick={() => { setVendors((current) => current.map((x: any) => x.id === v.id ? { ...x, active: !x.active } : x)); log(`${v.active ? 'غیرفعال' : 'فعال'} کردن فروشنده ${v.name}`, v.id); }} className={`w-10 h-5 rounded-full relative transition-colors ${v.active ? 'bg-emerald-500' : 'bg-cream-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${v.active ? 'right-0.5' : 'right-5'}`}></span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-2`}>
                    <p className="text-[10px] text-cream-500">فروش</p>
                    <p className="tnum text-[11px] font-bold">{formatPrice(v.totalSales)}</p>
                  </div>
                  <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-2`}>
                    <p className="text-[10px] text-cream-500">سفارش</p>
                    <p className="tnum text-[11px] font-bold">{faNum(v.totalOrders)}</p>
                  </div>
                  <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-2`}>
                    <p className="text-[10px] text-cream-500">بدهی</p>
                    <p className="tnum text-[11px] font-bold text-amber-700">{formatPrice(v.balance)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {tab === 'performance' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>مقایسه عملکرد فروشندگان</h3>
          <div className="space-y-4">
            {vendors.map((v: any) => {
              const maxSales = Math.max(...vendors.map((x: any) => x.totalSales));
              const percentage = maxSales > 0 ? (v.totalSales / maxSales) * 100 : 0;
              return (
                <div key={v.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold">{v.name}</span>
                    <span className="tnum text-[12px] font-bold">{formatPrice(v.totalSales)}</span>
                  </div>
                  <div className="h-3 bg-cream-200 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-900 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-cream-500 mt-1">
                    <span>{faNum(v.totalOrders)} سفارش | {faNum(v.totalItems)} قلم</span>
                    <span>کارمزد: {faNum(v.fee)}٪</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settlements Tab */}
      {tab === 'settlements' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>ثبت حواله انجام‌شده</h3>
          <p className="text-[11px] leading-5 text-cream-500 mb-4">این عملیات فقط مانده و سند حسابداری را ثبت می‌کند؛ انتقال وجه باید پیش‌تر از طریق بانک انجام شده باشد.</p>
          <div className="space-y-3">
            {vendors.filter((v: any) => v.balance > 0).map((v: any) => (
              <div key={v.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-cream-50'} p-4 flex items-center justify-between`}>
                <div>
                  <p className="text-[12px] font-bold">{v.name}</p>
                  <p className="text-[10px] text-cream-500 mt-1">شبا: {v.iban}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tnum text-[13px] font-extrabold text-amber-700">{formatPrice(v.balance)} تومان</span>
                  <button onClick={() => settleVendor(v)} className="px-3 py-1.5 rounded-xl bg-brand-900 text-white text-[11px] font-bold">ثبت حواله</button>
                </div>
              </div>
            ))}
          </div>
          <h4 className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mt-6 mb-3`}>تاریخچه اسناد تسویه</h4>
          <div className="space-y-2">
            {settlements.map((settlement: any) => (
              <div key={settlement.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-cream-50'} p-3 flex flex-wrap items-center justify-between gap-2 text-[11px]`}>
                <span className="font-bold">{vendors.find((vendor: any) => vendor.id === settlement.vendorId)?.name || 'فروشنده حذف‌شده'}</span>
                <span>{dayLabel(new Date(settlement.createdAt))}</span>
                <span>مرجع: <b className="font-mono">{settlement.reference}</b></span>
                <span className="font-extrabold">{formatPrice(settlement.amount)} تومان</span>
              </div>
            ))}
            {!settlements.length && <p className="text-[11px] text-cream-500">سندی ثبت نشده است.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
