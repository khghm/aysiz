import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, faNum } from '../../utils/format';
import { summarize, isPaidOrder, collectedAmount } from '../../utils/analytics';
import { IconUsers, IconDollar, IconClipboard, IconTrending, IconAlert } from '../Icons';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminHome() {
  const { orders, darkMode } = useAdmin();
  const { products } = useShop();
  const stats = summarize(orders);
  const lowStock = products.filter(p => p.stock <= 5);
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const ds = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds);
    return { day: faNum(d.getDate()), revenue: dayOrders.filter(isPaidOrder).reduce((s: number, o: any) => s + collectedAmount(o), 0) };
  });
  const statusCounts = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => ({
    name: s, value: orders.filter((o: any) => o.status === s).length
  }));
  const statusColors: Record<string, string> = { pending: '#8698ae', processing: '#f59e0b', shipped: '#0ea5e9', delivered: '#1A2238', cancelled: '#E34A4A' };
  const topProducts = [...products].sort((a, b) => b.sales - a.sales).slice(0, 5);
  const maxSales = topProducts[0]?.sales || 1;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ l: 'سفارش‌های امروز', v: faNum(stats.todayOrders), icon: <IconClipboard className="w-5 h-5" />, c: 'bg-blue-50 text-blue-700' },
          { l: 'مشتریان یکتا', v: faNum(stats.uniqueCustomers), icon: <IconUsers className="w-5 h-5" />, c: 'bg-emerald-50 text-emerald-700' },
          { l: 'نرخ تبدیل', v: stats.conversionRate === null ? '—' : `${faNum(stats.conversionRate)}٪`, icon: <IconTrending className="w-5 h-5" />, c: 'bg-purple-50 text-purple-700' },
          { l: 'فروش پرداخت‌شده', v: formatPrice(stats.totalRevenue), icon: <IconDollar className="w-5 h-5" />, c: 'bg-amber-50 text-amber-700' }
        ].map((k, i) => (
          <div key={i} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className={`w-9 h-9 rounded-xl ${k.c} flex items-center justify-center mb-2`}>{k.icon}</div>
            <p className="text-[11px] text-cream-500">{k.l}</p>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-extrabold ${darkMode ? 'text-white' : 'text-brand-900'} mb-1`}>روند فروش ۱۴ روز اخیر</h3>
          <p className="text-[11px] text-cream-500 mb-4">درآمد روزانه به تومان</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={last14}>
              <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1A2238" stopOpacity={0.3} /><stop offset="95%" stopColor="#1A2238" stopOpacity={0} /></linearGradient></defs>
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
              <Area type="monotone" dataKey="revenue" stroke="#1A2238" fill="url(#colorRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-extrabold ${darkMode ? 'text-white' : 'text-brand-900'} mb-1`}>سفارش‌ها بر اساس وضعیت</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''} labelLine={false}>
                {statusCounts.map((entry, i) => <Cell key={i} fill={statusColors[entry.name]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0D1221', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-extrabold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>آخرین سفارش‌ها</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2 px-2 font-bold text-cream-500">کد</th><th className="text-start py-2 px-2 font-bold text-cream-500">مشتری</th><th className="text-start py-2 px-2 font-bold text-cream-500">مبلغ</th><th className="text-start py-2 px-2 font-bold text-cream-500">وضعیت</th>
              </tr></thead>
              <tbody>{orders.slice(0, 5).map((o: any) => (
                <tr key={o.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                  <td className="py-2 px-2 font-bold tnum">{o.code}</td><td className="py-2 px-2">{o.customer}</td><td className="py-2 px-2 tnum">{formatPrice(o.total)}</td>
                  <td className="py-2 px-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${o.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : o.status === 'cancelled' ? 'bg-coral-100 text-coral-700' : o.status === 'pending' ? 'bg-cream-100 text-brand-700' : 'bg-blue-100 text-blue-700'}`}><span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[o.status] }} />{o.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-extrabold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>پرفروش‌ترین کالاها</h3>
          <div className="space-y-3">
            {topProducts.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <img src={p.image} className="w-9 h-9 rounded-lg object-cover" alt="" />
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-bold truncate ${darkMode ? 'text-white' : 'text-brand-900'}`}>{p.name}</p>
                  <div className="w-full h-1.5 bg-cream-200 rounded-full mt-1"><div className="h-full bg-brand-900 rounded-full" style={{ width: `${(p.sales / maxSales) * 100}%` }} /></div>
                </div>
                <span className="text-[11px] font-bold tnum text-cream-500">{faNum(p.sales)}</span>
              </div>
            ))}
          </div>
          {lowStock.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-coral-50 border border-coral-200">
              <p className="text-[11px] font-bold text-coral-700 flex items-center gap-1"><IconAlert className="w-3.5 h-3.5" />هشدار موجودی کم: {faNum(lowStock.length)} کالا</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
