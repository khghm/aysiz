import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '../../services/queryClient';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, faNum } from '../../utils/format';
import * as api from '../../services/api';
import { IconPlus, IconTag, IconRocket, IconTrending, IconSend } from '../Icons';

export default function AdminGrowth() {
  const { campaigns, automations, loyalty, setLoyalty, darkMode, log, isAdmin } = useAdmin();
  const { discountCodes, setDiscountCodes: setShopDiscountCodes, addToast } = useShop();
  const queryClient = useQueryClient();
  const discountsQuery = useQuery({
    queryKey: ['admin', 'discounts'],
    queryFn: () => api.catalog.discounts(),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const setDiscountCodes = useCallback((items: any[]) => {
    queryClient.setQueryData(['admin', 'discounts'], { items });
    setShopDiscountCodes(items);
  }, [queryClient, setShopDiscountCodes]);
  const [tab, setTab] = useState<'campaigns' | 'codes' | 'automation' | 'loyalty' | 'ab'>('campaigns');
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', type: 'percent', value: 10, maxUses: 100, expiresAt: '' });
  useEffect(() => {
    if (discountsQuery.data) setShopDiscountCodes(discountsQuery.data.items);
  }, [discountsQuery.data, setShopDiscountCodes]);
  useEffect(() => {
    if (discountsQuery.error) addToast('danger', `بارگذاری کدهای تخفیف ناموفق بود: ${discountsQuery.error.message}`);
  }, [addToast, discountsQuery.error]);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'کمپین خودکار فعال', v: faNum(0), c: 'bg-cream-100 text-cream-700', icon: <IconRocket className="w-5 h-5" /> },
          { l: 'تعریف کمپین', v: faNum(campaigns.length), c: 'bg-blue-50 text-blue-700', icon: <IconTrending className="w-5 h-5" /> },
          { l: 'کدهای تخفیف', v: faNum(discountCodes.length), c: 'bg-purple-50 text-purple-700', icon: <IconTag className="w-5 h-5" /> },
          { l: 'اتوماسیون‌های تعریف‌شده', v: faNum(automations.length), c: 'bg-amber-50 text-amber-700', icon: <IconSend className="w-5 h-5" /> },
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[{ k: 'campaigns', l: 'کمپین‌ها' }, { k: 'codes', l: 'کدهای تخفیف' }, { k: 'automation', l: 'اتوماسیون' }, { k: 'loyalty', l: 'باشگاه وفاداری' }, { k: 'ab', l: 'آزمایش A/B' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>{t.l}</button>
        ))}
      </div>

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <div className="space-y-3">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">طبق سیاست فعلی فروشگاه، کمپین‌های خودکار در checkout غیرفعال‌اند؛ فقط کد تخفیفی که در checkout اعتبارسنجی شده باشد روی قیمت اعمال می‌شود.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {campaigns.map((c: any) => (
              <div key={c.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 hover:shadow-lg transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.type === 'tiered' ? 'bg-purple-100 text-purple-700' : c.type === 'bogo' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                    {c.type === 'tiered' ? 'پلکانی' : c.type === 'bogo' ? 'یکی بخر یکی ببر' : 'ارسال رایگان'}
                  </span>
                  <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[10px] font-bold text-cream-500">غیرفعال در checkout</span>
                </div>
                <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>{c.name}</h4>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cream-500">اعمال خودکار: خاموش</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discount Codes Tab */}
      {tab === 'codes' && (
        <div className="space-y-3">
          <button onClick={() => setShowCodeForm(true)} className="flex items-center gap-2 bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold shadow-lg shadow-brand-900/25">
            <IconPlus className="w-4 h-4" /> ایجاد کد تخفیف جدید
          </button>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
            <table className="w-full text-[12px]">
              <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کد</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نوع</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مقدار</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">استفاده / سقف</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">انقضا</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت</th>
              </tr></thead>
              <tbody>{discountCodes.map((c: any) => (
                <tr key={c.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'}`}>
                  <td className="py-2.5 px-3 font-bold font-mono text-brand-700">{c.code}</td>
                  <td className="py-2.5 px-3">{c.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'}</td>
                  <td className="py-2.5 px-3 tnum">{c.type === 'percent' ? `${faNum(c.value)}٪` : formatPrice(c.value)}</td>
                  <td className="py-2.5 px-3 tnum">{faNum(c.usedCount)} / {faNum(c.maxUses)}</td>
                  <td className="py-2.5 px-3 text-[11px] text-cream-500">{c.expiresAt}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{c.active ? 'فعال' : 'غیرفعال'}</span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {showCodeForm && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCodeForm(false)}>
              <div className={`w-full max-w-sm rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
                <h3 className="font-bold mb-4">ایجاد کد تخفیف</h3>
                <div className="space-y-3">
                  <input value={newCode.code} onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} placeholder="کد تخفیف" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                  <select value={newCode.type} onChange={e => setNewCode({ ...newCode, type: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none">
                    <option value="percent">درصدی</option><option value="fixed">مبلغ ثابت</option>
                  </select>
                  <input type="number" value={newCode.value} onChange={e => setNewCode({ ...newCode, value: +e.target.value })} placeholder="مقدار" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                  <input type="number" value={newCode.maxUses} onChange={e => setNewCode({ ...newCode, maxUses: +e.target.value })} placeholder="سقف استفاده" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                  <input type="date" value={newCode.expiresAt} onChange={e => setNewCode({ ...newCode, expiresAt: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
                </div>
                <button onClick={async () => {
                  try {
                    const saved = await api.catalog.createDiscount({ ...newCode, code: newCode.code.trim().toUpperCase(), active: true });
                    setDiscountCodes([...discountCodes, saved]);
                    setShowCodeForm(false);
                    setNewCode({ code: '', type: 'percent', value: 10, maxUses: 100, expiresAt: '' });
                    log('ایجاد کد تخفیف', saved.code);
                    addToast('success', 'کد تخفیف ذخیره شد');
                  } catch (error: any) {
                    addToast('danger', `ایجاد کد تخفیف ناموفق بود: ${error.message}`);
                  }
                }} className="w-full mt-4 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px]">ذخیره</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Automation Tab */}
      {tab === 'automation' && (
        <div className="space-y-3">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">ارسال پیام خودکار طبق سیاست فعلی خاموش است؛ هیچ رویدادی پیامک ارسال نمی‌کند و فعال‌سازی تا تعیین رضایت مشتری و provider مجاز نیست.</p>
          {automations.map((a: any) => (
            <div key={a.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.channel === 'sms' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    <IconSend className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{a.name}</h4>
                    <p className="text-[10px] text-cream-500">رویداد: {a.event} | کانال: {a.channel}</p>
                  </div>
                </div>
                <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[10px] font-bold text-cream-500">خاموش؛ بدون ارسال</span>
              </div>
              <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3 text-[11px] text-brand-700 mb-2`}>{a.template}</div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-cream-500">ارسال واقعی: {faNum(0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loyalty Tab */}
      {tab === 'loyalty' && (
        <div className="space-y-4">
          {loyalty ? <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>تنظیمات امتیازدهی</h3>
            <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-800">امتیاز پس از تأیید پرداخت ثبت می‌شود. بازخرید در checkout تا سقف درصد مبلغ کالای پس از تخفیف اعمال می‌شود؛ مالیات و ارسال مشمول امتیاز نیستند.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">امتیاز به ازای هر ۱۰۰۰ تومان</label>
                <input type="number" min="0" step="1" value={loyalty.pointsPerThousand} onChange={e => setLoyalty({ ...loyalty, pointsPerThousand: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">ارزش هر امتیاز (تومان)</label>
                <input type="number" min="0" step="1" value={loyalty.pointValue} onChange={e => setLoyalty({ ...loyalty, pointValue: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">سقف بازخرید از مبلغ کالا (٪)</label>
                <input type="number" min="0" max="100" step="1" value={loyalty.redemptionCapPercent ?? 10} onChange={e => setLoyalty({ ...loyalty, redemptionCapPercent: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              </div>
            </div>
          </div> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">تنظیمات وفاداری در دسترس نیست یا هنوز بارگذاری نشده است.</p>}
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>اعضای باشگاه</h3>
            {loyalty?.members?.length ? (
              <div className="space-y-2">
                {loyalty.members.map((member: any) => (
                  <div key={member.id} className={`flex items-center justify-between rounded-xl p-3 ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'}`}>
                    <div><p className="text-[12px] font-bold">{member.name || 'بدون نام'}</p><p className="text-[10px] text-cream-500">{member.phone}</p></div>
                    <span className="text-[12px] font-bold tnum">{faNum(member.points)} امتیاز</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-[11px] text-cream-500">هنوز امتیاز وفاداری برای حساب مشتریان ثبت نشده است.</p>}
          </div>
        </div>
      )}

      {/* A/B Test Tab */}
      {tab === 'ab' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-2`}>آزمایش A/B</h3>
          <p className="text-[11px] leading-5 text-cream-500">تا زمان پیاده‌سازی تخصیص تصادفی کاربران و ثبت رخدادهای بازدید و خرید، دادهٔ آزمایش و نتیجهٔ برنده‌ای برای نمایش وجود ندارد.</p>
        </div>
      )}
    </div>
  );
}
