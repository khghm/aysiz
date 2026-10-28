import { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, faNum, dayLabel } from '../../utils/format';
import * as api from '../../services/api';
import { IconUsers, IconDollar, IconTrending, IconAlert } from '../Icons';

export default function AdminAffiliates() {
  const { affiliates, setAffiliates, payouts, setPayouts, affConf, setAffConf, darkMode, log } = useAdmin();
  const { addToast } = useShop();
  const [tab, setTab] = useState<'affiliates' | 'payouts' | 'config' | 'tools'>('affiliates');
  const [linkDestination, setLinkDestination] = useState(window.location.origin);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [commissionReviews, setCommissionReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (tab !== 'payouts') return;
    setLoadingReviews(true);
    api.affiliate.reviewQueue()
      .then((result) => setCommissionReviews(result.items))
      .catch((error: any) => addToast('danger', `بارگذاری پورسانت‌های در انتظار بررسی ناموفق بود: ${error.message}`))
      .finally(() => setLoadingReviews(false));
  }, [tab, addToast]);
  
  const totalSales = affiliates.reduce((s: number, a: any) => s + a.sales, 0);
  const totalCommission = affiliates.reduce((s: number, a: any) => s + a.commission, 0);
  const flaggedCount = affiliates.filter((a: any) => a.flagged).length;
  const levelColors: Record<string, string> = { silver: 'bg-gray-100 text-gray-700', gold: 'bg-amber-100 text-amber-700', platinum: 'bg-purple-100 text-purple-700' };
  const levelLabels: Record<string, string> = { silver: 'نقره‌ای', gold: 'طلایی', platinum: 'پلاتینیوم' };
  const addAffiliate = () => {
    const name = window.prompt('نام بازاریاب را وارد کنید:')?.trim();
    if (!name) return;
    const mobile = window.prompt('شماره موبایل بازاریاب را وارد کنید:')?.trim();
    if (!mobile) return;
    const id = `af-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const refCode = `AF${Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 8).toUpperCase()}`;
    setAffiliates([...affiliates, { id, name, mobile, refCode, level: 'silver', active: true, flagged: false, clicks: 0, orders: 0, sales: 0, commission: 0 }]);
    log(`ایجاد بازاریاب ${name}`, id);
  };
  const generateAffiliateLink = () => {
    const affiliate = affiliates.find((item: any) => item.id === selectedAffiliateId && item.active);
    if (!affiliate) return;
    try {
      const target = new URL(linkDestination, window.location.origin);
      if (target.origin !== window.location.origin) throw new Error('invalid_origin');
      target.searchParams.set('ref', affiliate.refCode);
      setGeneratedLink(target.toString());
    } catch {
      addToast('danger', 'آدرس مقصد باید در همین دامنهٔ فروشگاه باشد');
    }
  };
  const copyAffiliateLink = async () => {
    if (!navigator.clipboard) {
      window.prompt('لینک را کپی کنید:', generatedLink);
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedLink);
      addToast('success', 'لینک کپی شد');
    } catch {
      window.prompt('کپی خودکار در دسترس نیست؛ لینک را کپی کنید:', generatedLink);
    }
  };
  const availablePayoutAmount = (affiliate: any) => {
    const reserved = payouts
      .filter((payout: any) => payout.affiliateId === affiliate.id && ['pending', 'paid'].includes(payout.status))
      .reduce((sum: number, payout: any) => sum + Number(payout.amount || 0), 0);
    return Math.max(0, Number(affiliate.commission || 0) - reserved - Number(affiliate.reviewRequiredCommission || 0));
  };
  const createAffiliatePayout = (affiliate: any) => {
    const amount = availablePayoutAmount(affiliate);
    if (amount < Number(affConf?.minWithdraw || 0)) return;
    setPayouts([...payouts, {
      id: `po-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      source: 'affiliate_commission',
      affiliateId: affiliate.id,
      amount,
      status: 'pending',
      tracking: '',
      date: new Date().toISOString(),
    }]);
  };
  const resolveCommissionReview = async (commission: any, decision: 'approved' | 'rejected') => {
    try {
      await api.affiliate.reviewCommission(commission.id, decision);
      const [reviewResult, affiliateResult, payoutResult] = await Promise.all([
        api.affiliate.reviewQueue(),
        api.affiliate.affiliates.list(),
        api.affiliate.payouts.list(),
      ]);
      setCommissionReviews(reviewResult.items);
      setAffiliates(affiliateResult.items);
      setPayouts(payoutResult.items);
      const outcome = decision === 'approved' ? 'تأیید شد و برای تسویه آزاد شد' : 'رد شد و از مبلغ پورسانت کسر شد';
      log(`بررسی پورسانت سفارش ${commission.orderCode}: ${outcome}`, commission.id, decision === 'approved' ? 'info' : 'warning');
      addToast('success', `پورسانت سفارش ${commission.orderCode} ${outcome}`);
    } catch (error: any) {
      addToast('danger', `ثبت نتیجه بررسی پورسانت ناموفق بود: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'کل بازاریابان', v: faNum(affiliates.length), c: 'bg-blue-50 text-blue-700', icon: <IconUsers className="w-5 h-5" /> },
          { l: 'فروش کل', v: formatPrice(totalSales), c: 'bg-emerald-50 text-emerald-700', icon: <IconTrending className="w-5 h-5" /> },
          { l: 'پورسانت کل', v: formatPrice(totalCommission), c: 'bg-purple-50 text-purple-700', icon: <IconDollar className="w-5 h-5" /> },
          { l: 'هشدار تقلب', v: faNum(flaggedCount), c: 'bg-coral-50 text-coral-700', icon: <IconAlert className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-cream-500">{k.l}</p><div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div></div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[{ k: 'affiliates', l: 'بازاریابان' }, { k: 'payouts', l: 'تسویه‌ها' }, { k: 'config', l: 'پیکربندی پورسانت' }, { k: 'tools', l: 'ابزار تبلیغاتی' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>{t.l}</button>
        ))}
      </div>

      {/* Affiliates Tab */}
      {tab === 'affiliates' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
          <div className="flex justify-end p-3">
            <button onClick={addAffiliate} className="rounded-xl bg-brand-900 px-4 py-2 text-[11px] font-bold text-white">افزودن بازاریاب</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نام</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کد معرف</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">سطح</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کلیک</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">سفارش</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نرخ تبدیل</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">فروش</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">پورسانت</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت</th>
              </tr></thead>
              <tbody>{affiliates.map((a: any) => {
                const convRate = a.clicks > 0 ? ((a.orders / a.clicks) * 100).toFixed(1) : '0';
                return (
                <tr key={a.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} ${a.flagged ? 'bg-coral-50/50' : ''}`}>
                  <td className="py-2.5 px-3 font-bold">{a.name}{a.flagged && <IconAlert className="w-3 h-3 text-coral-500 inline me-1" />}</td>
                  <td className="py-2.5 px-3 tnum font-mono text-brand-700">{a.refCode}</td>
                  <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${levelColors[a.level]}`}>{levelLabels[a.level]}</span></td>
                  <td className="py-2.5 px-3 tnum">{faNum(a.clicks)}</td>
                  <td className="py-2.5 px-3 tnum">{faNum(a.orders)}</td>
                  <td className="py-2.5 px-3 tnum">{faNum(convRate)}٪</td>
                  <td className="py-2.5 px-3 tnum">{formatPrice(a.sales)}</td>
                  <td className="py-2.5 px-3 tnum font-bold">{formatPrice(a.commission)}</td>
                  <td className="py-2.5 px-3">
                    <button onClick={() => { setAffiliates(affiliates.map((x: any) => x.id === a.id ? { ...x, active: !x.active } : x)); log(`${a.active ? 'مسدود' : 'فعال'} کردن بازاریاب ${a.name}`, a.id); }} className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${a.active ? 'bg-emerald-100 text-emerald-700' : 'bg-coral-100 text-coral-700'}`}>{a.active ? 'فعال' : 'مسدود'}</button>
                  </td>
                </tr>);
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {tab === 'payouts' && (
        <div className="space-y-3">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">
            ثبت پرداخت فقط ثبت دستیِ حواله‌ای است که خارج از سامانه انجام شده؛ انتقال بانکی از این پنل انجام یا تأیید نمی‌شود. پورسانت سفارش‌های دارای بازپرداخت تا بررسی دستی قابل تسویه نیست و پورسانت‌های قبلاً پرداخت‌شده خودکار پس گرفته نمی‌شوند.
          </p>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <h3 className="mb-3 text-[12px] font-bold">پورسانت‌های قابل تسویه</h3>
            {affiliates.filter((affiliate: any) => availablePayoutAmount(affiliate) > 0 && availablePayoutAmount(affiliate) >= Number(affConf?.minWithdraw || 0)).map((affiliate: any) => {
              const available = availablePayoutAmount(affiliate);
              return (
                <div key={affiliate.id} className="mb-2 flex items-center justify-between rounded-lg bg-cream-50 p-3">
                  <span className="text-[11px]">{affiliate.name} · {formatPrice(available)} تومان</span>
                  <button onClick={() => createAffiliatePayout(affiliate)} className="rounded-lg bg-brand-900 px-3 py-1.5 text-[10px] font-bold text-white">ایجاد درخواست تسویه</button>
                </div>
              );
            })}
            {affiliates.some((affiliate: any) => Number(affiliate.reviewRequiredCommission || 0) > 0) && (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
                <p>پورسانت سفارش‌های مرجوعی تا بررسی دستی از مبلغ قابل تسویه خارج است. اگر پیش‌تر در تسویهٔ در انتظار رزرو شده، آن تسویه را رد کنید تا پورسانت‌های عادی آزاد شوند.</p>
                {affiliates.filter((affiliate: any) => Number(affiliate.reviewRequiredCommission || 0) > 0).map((affiliate: any) => (
                  <p key={affiliate.id} className="mt-1 font-bold">{affiliate.name}: {formatPrice(affiliate.reviewRequiredCommission)} تومان در انتظار بررسی</p>
                ))}
              </div>
            )}
          </div>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <h3 className="mb-1 text-[12px] font-bold">پورسانت‌های متوقف‌شده برای بررسی مرجوعی</h3>
            <p className="mb-3 text-[10px] leading-5 text-cream-500">تأیید، پورسانت را دوباره قابل تسویه می‌کند؛ رد استحقاق، پورسانت پرداخت‌نشده را از مانده حذف می‌کند. پورسانت حواله‌شدهٔ قبلی تغییر نمی‌کند. اگر پورسانت در تسویهٔ درانتظار رزرو شده باشد، ابتدا همان تسویه را رد کنید.</p>
            {loadingReviews ? <p className="text-[11px] text-cream-500">در حال بارگذاری...</p> : commissionReviews.length === 0 ? (
              <p className="text-[11px] text-cream-500">پورسانت متوقف‌شده‌ای برای بررسی وجود ندارد.</p>
            ) : commissionReviews.map((commission: any) => (
              <div key={commission.id} className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3">
                <div className="text-[11px]">
                  <p className="font-bold">{commission.affiliateName} · سفارش {commission.orderCode}</p>
                  <p className="mt-1 text-cream-600">بازپرداخت ثبت‌شده: {formatPrice(commission.refundedAmount)} تومان · پورسانت متوقف‌شده: {formatPrice(commission.commissionAmount)} تومان</p>
                  {commission.payoutId && <p className="mt-1 font-bold text-amber-800">در تسویهٔ درانتظار رزرو شده است؛ ابتدا تسویه را رد کنید.</p>}
                </div>
                {!commission.payoutId && (
                  <div className="flex gap-2">
                    <button onClick={() => resolveCommissionReview(commission, 'approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-bold text-white">تأیید و آزادسازی</button>
                    <button onClick={() => resolveCommissionReview(commission, 'rejected')} className="rounded-lg bg-coral-100 px-3 py-2 text-[10px] font-bold text-coral-700">رد استحقاق</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {payouts.map((p: any) => {
            const aff = affiliates.find((a: any) => a.id === p.affiliateId);
            return (
              <div key={p.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 flex items-center justify-between hover:shadow-md transition-all`}>
                <div>
                  <p className="text-[12px] font-bold">{aff?.name || 'نامشخص'}</p>
                  <p className="text-[10px] text-cream-500 mt-1">تاریخ: {dayLabel(new Date(p.date))} | کد پیگیری: {p.tracking || '-'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tnum text-[13px] font-extrabold">{formatPrice(p.amount)} تومان</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : p.status === 'rejected' ? 'bg-coral-100 text-coral-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.status === 'paid' ? 'پرداخت شده' : p.status === 'rejected' ? 'رد شده' : p.reviewRequired ? 'توقف تا بررسی مرجوعی' : 'در انتظار'}
                  </span>
                  {p.status === 'pending' && (
                    <div className="flex gap-1">
                          {!p.reviewRequired && <button onClick={() => {
                            const reference = window.prompt('پس از انجام حواله خارج از سامانه، شماره پیگیری بانکی را وارد کنید:');
                            if (!reference?.trim()) return;
                            setPayouts((current) => current.map((x: any) => x.id === p.id ? { ...x, status: 'paid', tracking: reference.trim() } : x));
                            log(`ثبت پرداخت پورسانت ${aff?.name}`, p.id);
                          }} className="px-2 py-1 rounded-lg bg-brand-900 text-white text-[10px] font-bold">ثبت حواله انجام‌شده</button>}
                      <button onClick={() => { setPayouts((current) => current.map((x: any) => x.id === p.id ? { ...x, status: 'rejected' } : x)); }} className="px-2 py-1 rounded-lg bg-coral-100 text-coral-700 text-[10px] font-bold">رد</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Config Tab */}
      {tab === 'config' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>پیکربندی پورسانت</h3>
          {affConf ? <div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">نرخ پایه (٪)</label><input type="number" value={affConf.baseRate} onChange={e => setAffConf({ ...affConf, baseRate: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
            <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">اعتبار کوکی (روز)</label><input type="number" value={affConf.cookieDays} onChange={e => setAffConf({ ...affConf, cookieDays: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
            <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">حداقل مبلغ برداشت</label><input type="number" value={affConf.minWithdraw} onChange={e => setAffConf({ ...affConf, minWithdraw: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
            <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">سقف پورسانت هر سفارش</label><input type="number" value={affConf.maxPerOrder} onChange={e => setAffConf({ ...affConf, maxPerOrder: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
          </div>
          <h4 className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mt-4 mb-2`}>پاداش سطح</h4>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(affConf.levelBonus).map(([level, bonus]) => (
              <div key={level}><label className="text-[10px] text-cream-500 mb-1 block">{levelLabels[level] || level} (٪ اضافی)</label><input type="number" value={bonus as number} onChange={e => setAffConf({ ...affConf, levelBonus: { ...affConf.levelBonus, [level]: +e.target.value } })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
            ))}
          </div>
          </div> : <p className="text-[11px] text-amber-700">پیکربندی پورسانت در دسترس نیست یا هنوز بارگذاری نشده است.</p>}
        </div>
      )}

      {/* Tools Tab */}
      {tab === 'tools' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>تولید لینک عمیق</h3>
            <p className="mb-3 rounded-lg bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-800">بازدید از لینک ثبت می‌شود و انتساب آخرین کلیک معتبر تا پایان مهلت کوکی برای سفارش پرداخت‌شده حفظ خواهد شد.</p>
            <div className="flex gap-2">
              <input value={linkDestination} onChange={e => setLinkDestination(e.target.value)} placeholder="آدرس مقصد" className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <select value={selectedAffiliateId} onChange={e => setSelectedAffiliateId(e.target.value)} className="rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none">
                <option value="">انتخاب بازاریاب</option>
                {affiliates.filter((a: any) => a.active).map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.refCode})</option>)}
              </select>
              <button onClick={generateAffiliateLink} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold">تولید لینک</button>
            </div>
            {generatedLink && <div className="mt-3 flex gap-2"><input readOnly value={generatedLink} className="flex-1 rounded-xl border border-cream-300 px-3 py-2 text-[11px]" /><button onClick={copyAffiliateLink} className="rounded-xl border border-cream-300 px-3 py-2 text-[11px] font-bold">کپی</button></div>}
          </div>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>کتابخانه بنرها</h3>
            <p className="mb-3 text-[11px] text-cream-500">فایل بنر قابل دانلودی بارگذاری نشده است.</p>
            <div className="grid grid-cols-3 gap-3">
              {[{ w: '728x90', l: 'بنر افقی' }, { w: '300x300', l: 'بنر مربع' }, { w: '160x600', l: 'بنر عمودی' }].map((b, i) => (
                <div key={i} className={`rounded-xl border-2 border-dashed ${darkMode ? 'border-white/20' : 'border-cream-300'} p-4 text-center`}>
                  <div className="bg-brand-100 rounded-lg mb-2 flex items-center justify-center" style={{ height: '60px' }}><span className="text-[10px] text-brand-700">{b.w}</span></div>
                  <p className="text-[11px] font-bold">{b.l}</p>
                  <button disabled className="mt-2 text-[10px] font-bold text-brand-600 disabled:opacity-50">دانلود</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
