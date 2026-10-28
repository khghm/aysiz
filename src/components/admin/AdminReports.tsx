import { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, faNum, dayLabel } from '../../utils/format';
import { growthRate, channelStats, funnelStages, bottleneck, computePL, isPaidOrder, collectedAmount } from '../../utils/analytics';
import { IconCart, IconChevronDown, IconChart, IconDollar, IconTrending } from '../Icons';
import { Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';

export default function AdminReports() {
  const { orders, darkMode, abandoned, searchTerms } = useAdmin();
  const { settings } = useShop();
  const [period, setPeriod] = useState<'7' | '14' | '30'>('14');
  const pl = computePL(orders, settings);
  const channels = channelStats(orders);
  const funnel = funnelStages(orders);
  const bn = bottleneck(funnel);
  
  const days = parseInt(period);
  const lastDays = Array.from({ length: days }, (_, i) => { 
    const d = new Date(); 
    d.setDate(d.getDate() - (days - 1 - i)); 
    const ds = d.toISOString().slice(0, 10); 
    const dayOrders = orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds && isPaidOrder(o));
    return { 
      day: faNum(d.getDate()), 
      date: ds,
      revenue: dayOrders.reduce((s: number, o: any) => s + collectedAmount(o), 0),
      orders: dayOrders.length,
      customers: new Set(dayOrders.map((o: any) => o.mobile)).size
    }; 
  });

  // محاسبه نرخ رشد
  const currentPeriodRevenue = lastDays.slice(-7).reduce((s, d) => s + d.revenue, 0);
  const previousPeriodRevenue = lastDays.slice(-14, -7).reduce((s, d) => s + d.revenue, 0);
  const growthRate = previousPeriodRevenue > 0 ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100) : 0;

  // تحلیل وضعیت سفارش‌ها
  const statusDistribution = [
    { name: 'تحویل شده', value: orders.filter((o: any) => o.status === 'delivered').length, color: '#10b981' },
    { name: 'در حال ارسال', value: orders.filter((o: any) => o.status === 'shipped').length, color: '#3b82f6' },
    { name: 'در حال پردازش', value: orders.filter((o: any) => o.status === 'processing').length, color: '#f59e0b' },
    { name: 'در انتظار', value: orders.filter((o: any) => o.status === 'pending').length, color: '#8b5cf6' },
    { name: 'لغو شده', value: orders.filter((o: any) => o.status === 'cancelled').length, color: '#ef4444' },
  ].filter(s => s.value > 0);

  // سبدهای رها شده
  const abandonedValue = abandoned.reduce((s: number, a: any) => s + a.value, 0);
  const recoveredCount = abandoned.filter((a: any) => a.recovered).length;
  const recoveryRate = abandoned.length > 0 ? (recoveredCount / abandoned.length * 100) : 0;

  const channelColors = ['#1A2238', '#F5C518', '#E34A4A', '#10b981', '#8b5cf6'];

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">گزارش سود و زیان برآوردی است: بهای تمام‌شده و برخی هزینه‌ها بر اساس فرض‌های ثابت محاسبه می‌شوند. برای گزارش حسابداری، دادهٔ بهای خرید و هزینه‌های واقعی باید ثبت و دسته‌بندی شوند.</p>
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>گزارش‌ها و تحلیل</h2>
        <div className="flex gap-2">
          {[{ k: '7', l: '۷ روز' }, { k: '14', l: '۱۴ روز' }, { k: '30', l: '۳۰ روز' }].map(p => (
            <button key={p.k} onClick={() => setPeriod(p.k as any)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${period === p.k ? 'bg-brand-900 text-white shadow-lg shadow-brand-900/25' : darkMode ? 'bg-white/5 text-brand-300' : 'bg-cream-100 text-brand-700'}`}>{p.l}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards with Growth */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'درآمد ناخالص', v: formatPrice(pl.grossSales), c: 'bg-blue-50 text-blue-700', icon: <IconDollar className="w-5 h-5" />, growth: growthRate },
          { l: 'سود خالص برآوردی', v: formatPrice(pl.netProfit), c: 'bg-emerald-50 text-emerald-700', icon: <IconTrending className="w-5 h-5" />, growth: 0 },
          { l: 'حاشیه سود', v: `${faNum(pl.margin)}٪`, c: 'bg-purple-50 text-purple-700', icon: <IconChart className="w-5 h-5" />, growth: 0 },
          { l: 'میانگین سفارش', v: formatPrice(orders.length ? pl.netRevenue / orders.length : 0), c: 'bg-amber-50 text-amber-700', icon: <IconCart className="w-5 h-5" />, growth: 0 },
        ].map((k, i) => (
          <div key={i} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 hover:shadow-lg transition-all`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={`${k.c} p-1.5 rounded-lg`}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
            {k.growth !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${k.growth > 0 ? 'text-emerald-600' : 'text-coral-600'}`}>
                <IconTrending className="w-3 h-3" />
                <span className="tnum">{faNum(Math.abs(k.growth).toFixed(1))}٪</span>
                <span>نسبت به دوره قبل</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Revenue & Profit Chart */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>روند فروش پرداخت‌شده</h3>
            <p className="text-[10px] text-cream-500 mt-0.5">{faNum(days)} روز اخیر</p>
          </div>
          <div className="flex gap-3 text-[10px]">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-brand-900"></div><span>درآمد</span></div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={lastDays}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1A2238" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#1A2238" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
            <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} tickFormatter={(v) => formatPrice(v / 1000000) + 'M'} />
            <Tooltip 
              contentStyle={{ 
                background: '#1A2238',
                border: '2px solid #F5C518',
                borderRadius: 12,
                padding: '10px 14px',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: '600',
                fontFamily: 'Vazirmatn',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                direction: 'rtl'
              }}
              itemStyle={{ color: '#ffffff' }}
              labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
              formatter={(value: any) => [formatPrice(value) + ' تومان', '']}
            />
            <Area type="monotone" dataKey="revenue" fill="url(#colorRevenue)" stroke="#1A2238" strokeWidth={2} name="درآمد" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Channel Analysis */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>تحلیل کانال‌های جذب</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channels} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={false}>
                    {channels.map((_, i) => <Cell key={i} fill={channelColors[i % channelColors.length]} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1A2238',
                      border: '2px solid #F5C518',
                      borderRadius: 12,
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: '600',
                      fontFamily: 'Vazirmatn',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      direction: 'rtl'
                    }}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
                    formatter={(value: any, name: any, props: any) => {
                      return [formatPrice(value) + ' تومان', props.payload.name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {channels.map((ch, i) => {
                const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);
                const percentage = totalRevenue > 0 ? ((ch.revenue / totalRevenue) * 100).toFixed(1) : '0';
                const aov = ch.orders > 0 ? ch.revenue / ch.orders : 0;
                return (
                  <div key={i} className={`rounded-xl p-3 ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} hover:shadow-md transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: channelColors[i % channelColors.length] }}>
                        <span className="text-white font-bold text-sm">{faNum(i + 1)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[12px] font-bold truncate">{ch.name}</p>
                          <span className="tnum text-[11px] font-extrabold" style={{ color: channelColors[i % channelColors.length] }}>{faNum(percentage)}٪</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-cream-500">
                          <span className="tnum">{faNum(ch.orders)} سفارش</span>
                          <span className="tnum">AOV: {formatPrice(aov)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: channelColors[i % channelColors.length] }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>توزیع وضعیت سفارش‌ها</h3>
              <p className="text-[10px] text-cream-500 mt-0.5">مجموع: {faNum(orders.length)} سفارش</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {statusDistribution.map((entry, i) => (
                      <linearGradient key={i} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={entry.color} stopOpacity={1}/>
                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.7}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie 
                    data={statusDistribution} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={50} 
                    outerRadius={80} 
                    paddingAngle={3}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}٪`}
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, i) => <Cell key={i} fill={`url(#gradient-${i})`} stroke={entry.color} strokeWidth={2} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1A2238',
                      border: '2px solid #F5C518',
                      borderRadius: 12,
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: '600',
                      fontFamily: 'Vazirmatn',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      direction: 'rtl'
                    }}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
                    formatter={(value: any, name: any) => {
                      return [faNum(value) + ' سفارش', name];
                    }}
                  />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-brand-900 dark:fill-white" style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {faNum(orders.length)}
                  </text>
                  <text x="50%" y="50%" dy="20" textAnchor="middle" className="fill-cream-500" style={{ fontSize: '10px' }}>
                    سفارش
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {statusDistribution.map((status, i) => {
                const percentage = orders.length > 0 ? ((status.value / orders.length) * 100).toFixed(1) : '0';
                return (
                  <div key={i} className={`rounded-xl p-2.5 ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} hover:shadow-md transition-all`}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: status.color }}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold truncate">{status.name}</p>
                      </div>
                      <div className="text-left">
                        <p className="tnum text-[12px] font-extrabold" style={{ color: status.color }}>{faNum(status.value)}</p>
                        <p className="tnum text-[9px] text-cream-500">{faNum(percentage)}٪</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>قیف تبدیل خرید</h3>
            <p className="text-[10px] text-cream-500 mt-0.5">نیازمند ثبت رویدادهای بازدید و سبد خرید</p>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold ${darkMode ? 'bg-coral-900/30 text-coral-300' : 'bg-coral-50 text-coral-700'}`}>
            {bn ? `گلوگاه: ${bn}` : 'دادهٔ قیف موجود نیست'}
          </div>
        </div>
        <div className="space-y-3">
          {funnel.length === 0 && <p className="py-6 text-center text-[11px] text-cream-500">آمار بازدید، افزودن به سبد و پرداخت هنوز جمع‌آوری نمی‌شود؛ برای جلوگیری از نمایش تخمین ساختگی، قیف خالی است.</p>}
          {funnel.map((f, i) => {
            const width = (f.rate / 100) * 100;
            const colors = ['bg-brand-900', 'bg-blue-600', 'bg-purple-600', 'bg-emerald-600'];
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold">{f.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="tnum text-[11px] font-bold">{faNum(f.count)}</span>
                    <span className="tnum text-[10px] text-cream-500">({faNum(f.rate)}٪)</span>
                  </div>
                </div>
                <div className="relative h-8 bg-cream-100 rounded-lg overflow-hidden">
                  <div className={`absolute inset-y-0 right-0 ${colors[i % colors.length]} rounded-lg transition-all duration-500 flex items-center justify-end px-3`} style={{ width: `${width}%` }}>
                    {width > 20 && <span className="text-white text-[10px] font-bold tnum">{faNum(f.rate)}٪</span>}
                  </div>
                </div>
                {i < funnel.length - 1 && (
                  <div className="flex items-center justify-center my-1">
                    <IconChevronDown className="w-4 h-4 text-cream-400" />
                    <span className="text-[9px] text-cream-500 mx-1">نرخ تبدیل: {faNum(funnel[i + 1].rate)}٪</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Abandoned Carts & Search Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Abandoned Carts */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>سبدهای خرید رها شده</h3>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${darkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
              {faNum(abandoned.length)} سبد
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3 text-center`}>
              <p className="text-[10px] text-cream-500">ارزش در خطر</p>
              <p className="tnum text-[13px] font-extrabold text-amber-700">{formatPrice(abandonedValue)}</p>
            </div>
            <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3 text-center`}>
              <p className="text-[10px] text-cream-500">بازیابی شده</p>
              <p className="tnum text-[13px] font-extrabold text-emerald-700">{faNum(recoveredCount)}</p>
            </div>
            <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3 text-center`}>
              <p className="text-[10px] text-cream-500">نرخ بازیابی</p>
              <p className="tnum text-[13px] font-extrabold text-brand-900">{faNum(recoveryRate.toFixed(1))}٪</p>
            </div>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {abandoned.slice(0, 5).map((a: any) => (
              <div key={a.id} className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'}`}>
                <div>
                  <p className="text-[11px] font-bold">{a.customer}</p>
                  <p className="text-[9px] text-cream-500">{faNum(a.items)} قلم | {dayLabel(new Date(a.date))}</p>
                </div>
                <span className="tnum text-[11px] font-bold">{formatPrice(a.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Search Terms */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>پرجستجوترین عبارات</h3>
          <div className="flex flex-wrap gap-2">
            {searchTerms.slice(0, 12).map((t: any, i: number) => {
              const size = Math.max(10, 14 - i);
              return (
                <span key={i} className={`px-3 py-1.5 rounded-full font-bold transition-all hover:scale-105 ${t.trending ? 'bg-brand-900 text-white shadow-lg shadow-brand-900/25' : darkMode ? 'bg-white/10 text-brand-300' : 'bg-cream-100 text-brand-700'}`} style={{ fontSize: `${size}px` }}>
                  {t.term}
                  <span className="tnum opacity-70 ms-1 text-[9px]">({faNum(t.count)})</span>
                </span>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-cream-200">
            <p className="text-[10px] text-cream-500 mb-2">پیشنهاد بر اساس جستجوها:</p>
            <div className="flex flex-wrap gap-1">
              {searchTerms.filter((t: any) => t.trending).slice(0, 3).map((t: any, i: number) => (
                <span key={i} className="text-[9px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-bold">{t.term}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Orders Chart */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>تعداد سفارش‌های روزانه</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={lastDays}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
            <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
            <Tooltip 
              contentStyle={{ 
                background: '#1A2238',
                border: '2px solid #F5C518',
                borderRadius: 12,
                padding: '10px 14px',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: '600',
                fontFamily: 'Vazirmatn',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                direction: 'rtl'
              }}
              itemStyle={{ color: '#ffffff' }}
              labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
            />
            <Bar dataKey="orders" fill="#1A2238" radius={[8, 8, 0, 0]} name="تعداد سفارش" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
