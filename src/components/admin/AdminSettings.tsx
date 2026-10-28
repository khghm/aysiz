import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import * as api from '../../services/api';
import { IconUpload } from '../Icons';

export default function AdminSettings() {
  const { darkMode } = useAdmin();
  const { settings, setSettings: setShopSettings, addToast } = useShop();
  const [form, setForm] = useState({ ...settings });
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setForm({ ...settings }); }, [settings]);

  const save = async () => {
    try {
      const saved = await api.catalog.updateSettings(form);
      setShopSettings(saved);
      addToast('success', 'تنظیمات فروشگاه ذخیره شد');
    } catch (error: any) {
      addToast('danger', `ذخیره تنظیمات ناموفق بود: ${error.message}`);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onload = (ev) => setForm({ ...form, logo: ev.target?.result as string }); reader.readAsDataURL(file); }
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>اطلاعات فروشگاه</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">نام فروشگاه</label><input value={form.storeName} onChange={e => setForm({ ...form, storeName: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">تلفن پشتیبانی</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">ایمیل</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">آدرس</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
        </div>
        <div className="mt-4">
          <label className="text-[11px] font-bold text-cream-500 mb-1 block">لوگوی سایت</label>
          <div className="flex items-center gap-3">
            {form.logo && <img src={form.logo} className="w-12 h-12 rounded-xl object-cover" alt="logo" />}
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button onClick={() => logoRef.current?.click()} className="border border-cream-300 rounded-xl px-3 py-2 text-[11px] font-bold flex items-center gap-1"><IconUpload className="w-4 h-4" />آپلود لوگو</button>
          </div>
        </div>
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>هزینه‌های ارسال</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">آستانه ارسال رایگان (تومان)</label><input type="number" value={form.freeShippingThreshold} onChange={e => setForm({ ...form, freeShippingThreshold: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">هزینه ارسال عادی (تومان)</label><input type="number" value={form.shippingCost} onChange={e => setForm({ ...form, shippingCost: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
        </div>
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>مالیات و کارمزدها</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">مالیات بر ارزش افزوده (٪)</label><input type="number" value={form.vatRate} onChange={e => setForm({ ...form, vatRate: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">کارمزد درگاه (٪)</label><input type="number" value={form.gatewayFee} onChange={e => setForm({ ...form, gatewayFee: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
        </div>
        <label className="flex items-center gap-2 mt-3 text-[12px]"><input type="checkbox" checked={form.showPricesWithTax} onChange={e => setForm({ ...form, showPricesWithTax: e.target.checked })} />نمایش قیمت‌ها با احتساب مالیات</label>
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>نوار اطلاعیه</h3>
        <label className="flex items-center gap-2 text-[12px] mb-2"><input type="checkbox" checked={form.tickerTexts?.length > 0} onChange={e => setForm({ ...form, tickerTexts: e.target.checked ? ['ارسال رایگان برای خرید بالای ۱.۵ میلیون تومان'] : [] })} />نمایش نوار اطلاعیه</label>
        <input value={form.tickerTexts?.join(' | ') || ''} onChange={e => setForm({ ...form, tickerTexts: e.target.value.split('|').map(s => s.trim()).filter(Boolean) })} placeholder="متن‌ها با | جدا شوند" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
      </div>
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>بنرهای صفحه اصلی</h3>
        <p className="text-[11px] text-cream-500">بنرهای فعال از بخش «مدیریت محتوا» مدیریت می‌شوند و پس از ذخیره در صفحه اصلی نمایش داده خواهند شد.</p>
      </div>
      <div className={`rounded-2xl border border-coral-200 bg-coral-50 p-5`}>
        <h3 className="text-sm font-bold text-coral-700 mb-2">تنظیمات محلی این مرورگر</h3>
        <p className="text-[11px] text-coral-600 mb-3">پاک‌سازی فقط نشست ورود و ترجیحات محلی این مرورگر را حذف می‌کند؛ سفارش‌ها و داده‌های پایگاه‌داده سرور تغییر نمی‌کنند.</p>
        <button onClick={() => { if (confirm('نشست ادمین و ترجیحات ذخیره‌شده فقط در این مرورگر پاک شوند؟ داده‌های سرور دست‌نخورده می‌مانند.')) { localStorage.clear(); window.location.reload(); } }} className="bg-coral-500 text-white px-4 py-2 rounded-xl text-[12px] font-bold">پاک‌سازی داده‌های محلی</button>
      </div>
      <button onClick={save} className="bg-brand-900 text-white px-6 py-3 rounded-xl font-extrabold text-sm shadow-lg shadow-brand-900/25">ذخیره تنظیمات</button>
    </div>
  );
}
