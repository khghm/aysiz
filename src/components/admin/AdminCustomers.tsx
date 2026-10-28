import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, faNum, dayLabel, toExcel, downloadFile } from '../../utils/format';
import { aggregateCustomers } from '../../utils/analytics';
import * as api from '../../services/api';
import { IconUser, IconStar, IconX, IconPlus, IconChart, IconUsers, IconDollar, IconEye, IconDownload } from '../Icons';

export default function AdminCustomers() {
  const { darkMode, log, adminIdentity, isAdmin, orders } = useAdmin();
  const { addToast } = useShop();
  const customersQuery = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: () => api.customers.list(),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const registeredCustomers = customersQuery.data?.items ?? [];
  useEffect(() => {
    if (customersQuery.error) addToast('danger', `بارگذاری حساب‌های مشتریان ناموفق بود: ${customersQuery.error.message}`);
  }, [addToast, customersQuery.error]);
  const orderCustomers = aggregateCustomers(orders);
  const orderCustomersByMobile = new Map(orderCustomers.map((customer) => [customer.mobile, customer]));
  const registeredPhones = new Set(registeredCustomers.map((customer) => customer.phone));
  const customers = [
    ...registeredCustomers.map((record) => ({
      ...(orderCustomersByMobile.get(record.phone) || {
        id: record.id, name: record.name, mobile: record.phone, city: '',
        orders: record.orderCount, totalSpent: record.totalSpent,
        segment: 'جدید', lastOrder: record.lastOrder || record.created_at,
      }),
      name: record.name || orderCustomersByMobile.get(record.phone)?.name,
      loyalty: record.loyalty,
    })),
    ...orderCustomers.filter((customer) => !registeredPhones.has(customer.mobile)).map((customer) => ({ ...customer, loyalty: 0 })),
  ];
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [notes, setNotes] = useState<Record<string, { id: string; note: string; createdAt: string }[]>>({});
  const [newNote, setNewNote] = useState('');
  useEffect(() => {
    if (!selectedCustomer?.mobile) return;
    api.customers.notes(selectedCustomer.mobile).then(({ items }) => {
      setNotes((current) => ({ ...current, [selectedCustomer.mobile]: items }));
    }).catch((error) => {
      addToast('danger', `بارگذاری یادداشت‌های مشتری ناموفق بود: ${error.message}`);
    });
  }, [selectedCustomer?.mobile, addToast]);

  const filtered = customers.filter(c => {
    if (segmentFilter !== 'all' && c.segment !== segmentFilter) return false;
    if (search && !c.name.includes(search) && !c.mobile.includes(search) && !c.city.includes(search)) return false;
    return true;
  });

  const segments = {
    all: customers.length,
    'VIP': customers.filter(c => c.segment === 'VIP').length,
    'وفادار': customers.filter(c => c.segment === 'وفادار').length,
    'جدید': customers.filter(c => c.segment === 'جدید').length,
  };

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const avgOrderValue = customers.length ? totalRevenue / customers.reduce((s, c) => s + c.orders, 0) : 0;

  const exportCustomers = () => {
    const data = filtered.map(c => ({
      'نام': c.name,
      'موبایل': c.mobile,
      'شهر': c.city,
      'تعداد سفارش': c.orders,
      'مجموع خرید (تومان)': c.totalSpent,
      'امتیاز وفاداری': c.loyalty ?? 'در دسترس نیست',
      'دسته': c.segment,
      'آخرین خرید': dayLabel(new Date(c.lastOrder))
    }));
    downloadFile(toExcel(data, 'گزارش مشتریان'), 'customers.xls', 'application/vnd.ms-excel');
    log('خروجی گزارش مشتریان', 'customers');
  };

  const addNote = async (customerMobile: string) => {
    if (!newNote.trim()) return;
    try {
      const item = await api.customers.addNote(customerMobile, newNote.trim());
      setNotes((current) => ({ ...current, [customerMobile]: [item, ...(current[customerMobile] || [])] }));
      log('افزودن یادداشت مشتری', customerMobile);
    } catch (error: any) {
      addToast('danger', `ذخیره یادداشت ناموفق بود: ${error.message}`);
      return;
    }
    setNewNote('');
  };

  const customerOrders = selectedCustomer ? orders.filter((o: any) => o.mobile === selectedCustomer.mobile) : [];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'کل مشتریان', v: faNum(customers.length), c: 'bg-blue-50 text-blue-700', icon: <IconUsers className="w-5 h-5" /> },
          { l: 'درآمد کل', v: formatPrice(totalRevenue), c: 'bg-emerald-50 text-emerald-700', icon: <IconDollar className="w-5 h-5" /> },
          { l: 'میانگین سفارش', v: formatPrice(avgOrderValue), c: 'bg-purple-50 text-purple-700', icon: <IconChart className="w-5 h-5" /> },
          { l: 'مشتریان VIP', v: faNum(segments['VIP']), c: 'bg-amber-50 text-amber-700', icon: <IconStar className="w-5 h-5" /> },
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

      {/* Segment Distribution */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>توزیع مشتریان بر اساس دسته</h3>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(segments).map(([seg, count]) => (
            <div key={seg} className="text-center">
              <div className={`h-2 rounded-full mb-2 ${seg === 'VIP' ? 'bg-purple-500' : seg === 'وفادار' ? 'bg-emerald-500' : seg === 'جدید' ? 'bg-blue-500' : 'bg-brand-500'}`} style={{ width: `${customers.length ? (count / customers.length) * 100 : 0}%` }}></div>
              <p className="text-[11px] font-bold text-brand-900">{seg === 'all' ? 'همه' : seg}</p>
              <p className="text-[13px] font-extrabold tnum text-brand-700">{faNum(count)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو نام، موبایل، شهر..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
        <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه دسته‌ها</option>
          <option value="VIP">VIP</option>
          <option value="وفادار">وفادار</option>
          <option value="جدید">جدید</option>
        </select>
        <button onClick={exportCustomers} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-cream-300 text-[11px] font-bold">
          <IconDownload className="w-4 h-4" /> خروجی اکسل
        </button>
      </div>

      {/* Customers Table */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نام</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">موبایل</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">شهر</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">سفارش‌ها</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مجموع خرید</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">امتیاز</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">دسته</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                  <td className="py-2.5 px-3 font-bold">{c.name}</td>
                  <td className="py-2.5 px-3 tnum">{c.mobile}</td>
                  <td className="py-2.5 px-3">{c.city}</td>
                  <td className="py-2.5 px-3 tnum">{faNum(c.orders)}</td>
                  <td className="py-2.5 px-3 tnum">{formatPrice(c.totalSpent)}</td>
                  <td className="py-2.5 px-3 tnum">{c.loyalty === null ? '—' : faNum(c.loyalty)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.segment === 'VIP' ? 'bg-purple-100 text-purple-700' : c.segment === 'وفادار' ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-brand-700'}`}>
                      {c.segment}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <button onClick={() => setSelectedCustomer(c)} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600">
                      <IconEye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-end" onClick={() => setSelectedCustomer(null)}>
          <div className={`w-full max-w-md h-full overflow-y-auto ${darkMode ? 'bg-[#151b26]' : 'bg-white'} animate-drawer p-6`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>پروفایل مشتری</h3>
              <button onClick={() => setSelectedCustomer(null)}><IconX className="w-5 h-5" /></button>
            </div>

            {/* Customer Info */}
            <div className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-cream-50'} p-4 mb-4`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                  <IconUser className="w-6 h-6 text-brand-700" />
                </div>
                <div>
                  <h4 className="font-bold text-brand-900">{selectedCustomer.name}</h4>
                  <p className="text-[11px] text-cream-500">{selectedCustomer.mobile}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-cream-500">شهر: </span>{selectedCustomer.city}</div>
                <div><span className="text-cream-500">تعداد سفارش: </span><span className="tnum font-bold">{faNum(selectedCustomer.orders)}</span></div>
                <div><span className="text-cream-500">مجموع خرید: </span><span className="tnum font-bold">{formatPrice(selectedCustomer.totalSpent)}</span></div>
                <div><span className="text-cream-500">امتیاز وفاداری: </span><span className="tnum font-bold">{selectedCustomer.loyalty === null ? 'در دسترس نیست' : faNum(selectedCustomer.loyalty)}</span></div>
              </div>
            </div>

            {/* Order History */}
            <div className="mb-4">
              <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>تاریخچه سفارش‌ها</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {customerOrders.map((o: any) => (
                  <div key={o.id} className={`rounded-lg border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-white'} p-3`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold">{o.code}</span>
                      <span className="text-[10px] text-cream-500">{dayLabel(new Date(o.createdAt))}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="tnum">{formatPrice(o.total)} تومان</span>
                      <span className={`text-[10px] font-bold ${o.status === 'delivered' ? 'text-emerald-600' : o.status === 'cancelled' ? 'text-coral-600' : 'text-amber-600'}`}>
                        {o.status === 'delivered' ? 'تحویل شده' : o.status === 'cancelled' ? 'لغو شده' : 'در حال پردازش'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>یادداشت‌ها</h4>
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {(notes[selectedCustomer.mobile] || []).map((item) => (
                  <div key={item.id} className={`rounded-lg border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-cream-50'} p-2 text-[11px]`}>
                    <p>{item.note}</p>
                    <time className="block mt-1 text-[9px] text-cream-500">{dayLabel(new Date(item.createdAt))}</time>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="یادداشت جدید..." className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                <button onClick={() => addNote(selectedCustomer.mobile)} className="px-3 py-2 rounded-xl bg-brand-900 text-white text-[12px] font-bold">
                  <IconPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
