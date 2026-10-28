import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '../../services/queryClient';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, faNum } from '../../utils/format';
import * as api from '../../services/api';
import { IconClock, IconCheck, IconPlus, IconEdit, IconTrash, IconUsers, IconTag, IconDollar } from '../Icons';

export default function AdminDiscounts() {
  const { darkMode, log, isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const discountsQuery = useQuery({
    queryKey: ['admin', 'discounts'],
    queryFn: () => api.catalog.discounts(),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const discountCodes = discountsQuery.data?.items ?? [];
  const { setDiscountCodes: setShopDiscountCodes, addToast } = useShop();
  const setDiscountCodes = useCallback((items: any[]) => {
    queryClient.setQueryData(['admin', 'discounts'], { items });
    setShopDiscountCodes(items);
  }, [queryClient, setShopDiscountCodes]);
  useEffect(() => {
    if (discountsQuery.data) setShopDiscountCodes(discountsQuery.data.items);
  }, [discountsQuery.data, setShopDiscountCodes]);
  useEffect(() => {
    if (discountsQuery.error) addToast('danger', `بارگذاری کدهای تخفیف ناموفق بود: ${discountsQuery.error.message}`);
  }, [addToast, discountsQuery.error]);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const freshForm = () => ({ code: '', type: 'percent', value: 10, maxUses: 100, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), active: true });
  const [form, setForm] = useState(freshForm);

  const stats = {
    total: discountCodes.length,
    active: discountCodes.filter((c: any) => c.active).length,
    expired: discountCodes.filter((c: any) => new Date(c.expiresAt) < new Date()).length,
    totalUses: discountCodes.reduce((s: number, c: any) => s + c.usedCount, 0),
    totalDiscount: discountCodes.reduce((s: number, c: any) => {
      return s + (c.type === 'percent' ? c.usedCount * c.value * 10000 : c.usedCount * c.value);
    }, 0),
  };

  const filtered = discountCodes.filter((c: any) => {
    if (search && !c.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'active' && !c.active) return false;
    if (statusFilter === 'inactive' && c.active) return false;
    if (statusFilter === 'expired' && new Date(c.expiresAt) >= new Date()) return false;
    return true;
  });

  const save = async () => {
    if (!form.code?.trim()) { addToast('danger', 'کد تخفیف الزامی است'); return; }
    if (!Number.isFinite(Number(form.value)) || Number(form.value) <= 0) { addToast('danger', 'مقدار تخفیف معتبر الزامی است'); return; }
    if (!Number.isFinite(Number(form.maxUses)) || Number(form.maxUses) <= 0) { addToast('danger', 'حداکثر استفاده معتبر الزامی است'); return; }
    try {
      const saved = editingCode
        ? await api.catalog.updateDiscount(editingCode.id, { ...editingCode, ...form })
        : await api.catalog.createDiscount({ ...form, code: form.code.trim().toUpperCase() });
      const next = editingCode
        ? discountCodes.map((item: any) => item.id === saved.id ? saved : item)
        : [...discountCodes, saved];
      setDiscountCodes(next);
      setShopDiscountCodes(next);
      log(`${editingCode ? 'ویرایش' : 'ایجاد'} کد تخفیف ${saved.code}`, saved.id);
      addToast('success', 'کد تخفیف ذخیره شد');
      setShowForm(false);
      setEditingCode(null);
      setForm(freshForm());
    } catch (error: any) {
      addToast('danger', `ذخیره کد تخفیف ناموفق بود: ${error.message}`);
    }
  };

  const handleEdit = (code: any) => {
    setEditingCode(code);
    setForm({ code: code.code, type: code.type, value: code.value, maxUses: code.maxUses, expiresAt: code.expiresAt, active: code.active });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('آیا از حذف این کد تخفیف مطمئن هستید؟')) {
      try {
        await api.catalog.deleteDiscount(id);
        const next = discountCodes.filter((item: any) => item.id !== id);
        setDiscountCodes(next);
        setShopDiscountCodes(next);
        log('حذف کد تخفیف', id, 'warning');
      } catch (error: any) {
        addToast('danger', `حذف کد تخفیف ناموفق بود: ${error.message}`);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { l: 'کل کدها', v: faNum(stats.total), c: 'bg-blue-50 text-blue-700', icon: <IconTag className="w-5 h-5" /> },
          { l: 'فعال', v: faNum(stats.active), c: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="w-5 h-5" /> },
          { l: 'منقضی شده', v: faNum(stats.expired), c: 'bg-coral-50 text-coral-700', icon: <IconClock className="w-5 h-5" /> },
          { l: 'کل استفاده', v: faNum(stats.totalUses), c: 'bg-purple-50 text-purple-700', icon: <IconUsers className="w-5 h-5" /> },
          { l: 'تخفیف داده شده', v: formatPrice(stats.totalDiscount), c: 'bg-amber-50 text-amber-700', icon: <IconDollar className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setEditingCode(null); setForm(freshForm()); setShowForm(true); }} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1 shadow-lg shadow-brand-900/25"><IconPlus className="w-4 h-4" />ایجاد کد تخفیف جدید</button>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو کد تخفیف..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="inactive">غیرفعال</option>
          <option value="expired">منقضی شده</option>
        </select>
      </div>

      {/* Discount Codes Table */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کد</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نوع</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مقدار</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">میزان استفاده</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">انقضا</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const usagePercentage = (c.usedCount / c.maxUses) * 100;
                const isExpired = new Date(c.expiresAt) < new Date();
                return (
                  <tr key={c.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-brand-700 bg-cream-100 px-2 py-1 rounded">{c.code}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.type === 'percent' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {c.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 tnum font-bold">
                      {c.type === 'percent' ? `${faNum(c.value)}٪` : formatPrice(c.value)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-cream-200 rounded-full overflow-hidden w-20">
                          <div className={`h-full rounded-full ${usagePercentage > 80 ? 'bg-coral-500' : usagePercentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, usagePercentage)}%` }}></div>
                        </div>
                        <span className="tnum text-[10px]">{faNum(c.usedCount)}/{faNum(c.maxUses)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <span className={isExpired ? 'text-coral-600 font-bold' : ''}>{c.expiresAt}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button onClick={async () => {
                        const updated = { ...c, active: !c.active };
                        try {
                          const saved = await api.catalog.updateDiscount(c.id, updated);
                          const next = discountCodes.map((item: any) => item.id === c.id ? saved : item);
                          setDiscountCodes(next);
                          setShopDiscountCodes(next);
                          log(`${saved.active ? 'فعال' : 'غیرفعال'} کردن کد ${c.code}`, c.id);
                        } catch (error: any) {
                          addToast('danger', `تغییر وضعیت کد تخفیف ناموفق بود: ${error.message}`);
                        }
                      }} className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.active && !isExpired ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>
                        {isExpired ? 'منقضی' : c.active ? 'فعال' : 'غیرفعال'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600"><IconEdit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-coral-50 text-coral-500"><IconTrash className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditingCode(null); }}>
          <div className={`w-full max-w-md rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>{editingCode ? 'ویرایش کد تخفیف' : 'ایجاد کد تخفیف جدید'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">کد تخفیف</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="مثلاً: WELCOME20" className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none font-mono uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-cream-500 mb-1 block">نوع تخفیف</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none">
                    <option value="percent">درصدی (٪)</option>
                    <option value="fixed">مبلغ ثابت (تومان)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-cream-500 mb-1 block">مقدار {form.type === 'percent' ? '(٪)' : '(تومان)'}</label>
                  <input type="number" value={form.value} onChange={e => setForm({ ...form, value: +e.target.value })} placeholder="0" className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-cream-500 mb-1 block">سقف استفاده</label>
                  <input type="number" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: +e.target.value })} placeholder="100" className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-cream-500 mb-1 block">تاریخ انقضا</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="active" className="text-[12px] font-bold">فعال باشد</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={save} className="flex-1 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px] shadow-lg shadow-brand-900/25">{editingCode ? 'بروزرسانی' : 'ایجاد کد تخفیف'}</button>
              <button onClick={() => { setShowForm(false); setEditingCode(null); }} className="px-4 py-2.5 rounded-xl border border-cream-300 text-[12px] font-bold">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
