import { useAdmin } from '../../context/AdminContext';
import { formatPrice, faNum, dayLabel } from '../../utils/format';
import { IconUser, IconClock, IconCheck, IconTrending } from '../Icons';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminOperations() {
  const { orders, darkMode } = useAdmin();
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const ds = d.toISOString().slice(0, 10); return { day: faNum(d.getDate()), count: orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds).length, revenue: orders.filter((o: any) => o.createdAt?.slice(0, 10) === ds).reduce((s: number, o: any) => s + (o.total || 0), 0) }; });
  
  const avgProcessingTime = 2.5; // hours
  const deliveredOrders = orders.filter((o: any) => o.status === 'delivered');
  const pendingOrders = orders.filter((o: any) => o.status === 'pending' || o.status === 'processing');
  const successRate = orders.length ? (deliveredOrders.length / orders.length * 100).toFixed(1) : 0;

  const operators = [
    { name: 'اپراتور ۱', processed: 45, avgTime: 120 },
    { name: 'اپراتور ۲', processed: 38, avgTime: 135 },
    { name: 'اپراتور ۳', processed: 52, avgTime: 110 },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'سفارش پردازش‌شده', v: faNum(deliveredOrders.length), c: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="w-5 h-5" /> },
          { l: 'در انتظار پردازش', v: faNum(pendingOrders.length), c: 'bg-amber-50 text-amber-700', icon: <IconClock className="w-5 h-5" /> },
          { l: 'میانگین زمان (ساعت)', v: faNum(avgProcessingTime), c: 'bg-blue-50 text-blue-700', icon: <IconClock className="w-5 h-5" /> },
          { l: 'نرخ موفقیت', v: `${faNum(successRate)}٪`, c: 'bg-purple-50 text-purple-700', icon: <IconTrending className="w-5 h-5" /> },
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>سفارش‌های ۷ روز اخیر</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
              <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
              <Tooltip contentStyle={{ background: '#0D1221', border: 'none', borderRadius: 12, color: '#fff', fontSize: 11 }} />
              <Bar dataKey="count" fill="#1A2238" radius={[4, 4, 0, 0]} name="تعداد سفارش" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>درآمد ۷ روز اخیر</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={last7}>
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
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5C518" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#F5C518" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="revenue" stroke="#F5C518" fillOpacity={1} fill="url(#colorRevenue)" name="درآمد" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operator Performance */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>عملکرد اپراتورها</h3>
        <div className="space-y-3">
          {operators.map((op, i) => (
            <div key={i} className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                    <IconUser className="w-5 h-5 text-brand-700" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-brand-900">{op.name}</p>
                    <p className="text-[10px] text-cream-500">میانگین زمان: {faNum(op.avgTime)} دقیقه</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-extrabold tnum text-brand-900">{faNum(op.processed)}</p>
                  <p className="text-[10px] text-cream-500">سفارش پردازش‌شده</p>
                </div>
              </div>
              <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-900 rounded-full" style={{ width: `${(op.processed / 60) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>آخرین سفارش‌ها</h3>
        <div className="space-y-2">
          {orders.slice(0, 5).map((o: any) => (
            <div key={o.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'}`}>
              <div>
                <p className="text-[12px] font-bold">{o.code}</p>
                <p className="text-[10px] text-cream-500">{o.customer} | {dayLabel(new Date(o.createdAt))}</p>
              </div>
              <div className="text-left">
                <p className="tnum text-[12px] font-bold">{formatPrice(o.total)}</p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${o.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : o.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {o.status === 'delivered' ? 'تحویل شده' : o.status === 'pending' ? 'در انتظار' : 'در حال پردازش'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
