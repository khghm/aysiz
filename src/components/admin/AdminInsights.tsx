import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, faNum } from '../../utils/format';
import { IconChart, IconPackage, IconTrending, IconAlert } from '../Icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminInsights() {
  const { orders, darkMode, searchTerms } = useAdmin();
  const { products } = useShop();
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const ds = d.toISOString().slice(0, 10); return { day: faNum(d.getDate()), revenue: orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds).reduce((s: number, o: any) => s + (o.total || 0), 0) }; });
  const avg = last7.reduce((a, b) => a + b.revenue, 0) / 7;
  const slope = (last7[6].revenue - last7[0].revenue) / 7;
  const forecast = Array.from({ length: 7 }, (_, i) => ({ day: faNum(i + 8), value: Math.max(0, Math.round(avg + slope * (i + 1))) }));
  const stdDev = Math.sqrt(last7.reduce((s, d) => s + (d.revenue - avg) ** 2, 0) / 7);
  const anomalies = last7.filter(d => Math.abs(d.revenue - avg) > 1.5 * stdDev && d.revenue > 0);
  const stockRisks = products.filter(p => p.stock > 0 && p.sales > 0 && p.stock / (p.sales / 30) < 7).sort((a, b) => (a.stock / (a.sales / 30)) - (b.stock / (b.sales / 30)));

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'روند فروش', v: slope > 0 ? 'صعودی' : slope < 0 ? 'نزولی' : 'ثابت', c: slope > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-coral-50 text-coral-700', icon: <IconTrending className="w-5 h-5" /> },
          { l: 'ناهنجاری‌ها', v: faNum(anomalies.length), c: 'bg-amber-50 text-amber-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'هشدار موجودی', v: faNum(stockRisks.length), c: 'bg-coral-50 text-coral-700', icon: <IconPackage className="w-5 h-5" /> },
          { l: 'پیش‌بینی هفته', v: formatPrice(forecast.reduce((a, b) => a + b.value, 0)), c: 'bg-blue-50 text-blue-700', icon: <IconChart className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-cream-500">{k.l}</p><div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div></div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Forecast Chart */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>پیش‌بینی فروش ۷ روز آینده</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={forecast}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
            <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} tickFormatter={(v) => formatPrice(v / 1000000) + 'M'} />
            <Tooltip contentStyle={{ background: '#0D1221', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11 }} formatter={(v: any) => formatPrice(v) + ' تومان'} />
            <defs><linearGradient id="colorFc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F5C518" stopOpacity={0.8}/><stop offset="95%" stopColor="#F5C518" stopOpacity={0}/></linearGradient></defs>
            <Area type="monotone" dataKey="value" stroke="#F5C518" fillOpacity={1} fill="url(#colorFc)" name="پیش‌بینی" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-3 mt-4 text-center">
          <div><p className="text-[10px] text-cream-500">میانگین روزانه</p><p className="tnum text-[13px] font-bold">{formatPrice(avg)}</p></div>
          <div><p className="text-[10px] text-cream-500">پیشنهاد انبار</p><p className={`text-[13px] font-bold ${slope > 0 ? 'text-emerald-600' : 'text-coral-600'}`}>{slope > 0 ? 'افزایش موجودی' : 'کاهش سفارش'}</p></div>
          <div><p className="text-[10px] text-cream-500">اوج تقاضا</p><p className="text-[13px] font-bold">{slope > 0 ? 'پایان هفته' : 'اوایل هفته'}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Anomalies */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>ناهنجاری‌های شناسایی‌شده</h3>
          {anomalies.length > 0 ? (
            <div className="space-y-2">{anomalies.map((a, i) => (
              <div key={i} className={`p-3 rounded-xl ${a.revenue > avg ? 'bg-emerald-50 border border-emerald-200' : 'bg-coral-50 border border-coral-200'}`}>
                <div className="flex items-center justify-between"><span className="text-[11px] font-bold">{a.revenue > avg ? 'رشد غیرمنتظره' : 'افت غیرمنتظره'}</span><span className="text-[10px] text-cream-500">روز {a.day}</span></div>
                <p className="tnum text-[13px] font-extrabold mt-1">{formatPrice(a.revenue)} تومان</p>
              </div>
            ))}</div>
          ) : <p className="text-[12px] text-cream-500 text-center py-4">ناهنجاری شناسایی نشد</p>}
        </div>

        {/* Stock Risks */}
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>هشدار اتمام موجودی</h3>
          {stockRisks.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">{stockRisks.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl bg-coral-50 border border-coral-200">
                <img src={p.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                <div className="flex-1"><p className="text-[11px] font-bold">{p.name}</p><p className="text-[10px] text-cream-500">{p.brand}</p></div>
                <div className="text-left"><p className="tnum text-[12px] font-extrabold text-coral-600">{faNum(p.stock)}</p><p className="text-[9px] text-cream-500">روز باقی: {faNum(Math.max(1, Math.round(p.stock / (p.sales / 30))))}</p></div>
              </div>
            ))}</div>
          ) : <p className="text-[12px] text-cream-500 text-center py-4">همه محصولات موجودی کافی دارند</p>}
        </div>
      </div>

      {/* Search Terms */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>پرجستجوترین عبارات کاربران</h3>
        <div className="flex flex-wrap gap-2">
          {searchTerms.slice(0, 12).map((t: any, i: number) => (
            <span key={i} className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${t.trending ? 'bg-brand-900 text-white' : darkMode ? 'bg-white/10 text-brand-300' : 'bg-cream-100 text-brand-700'}`}>
              {t.term} <span className="tnum opacity-70">({faNum(t.count)})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
