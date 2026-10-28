import { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, faNum, dayLabel, toExcel, downloadFile } from '../../utils/format';
import { computePL, cashflowForecast } from '../../utils/analytics';
import { IconStar, IconClock, IconCheck, IconPlus, IconChart, IconDollar, IconDownload, IconClipboard, IconTrending } from '../Icons';
import { PieChart, Pie, Cell, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import AdminInvoices from './AdminInvoices';

export default function AdminFinance() {
  const { orders, invoices, setInvoices, expenses, setExpenses, bankTx, darkMode, log } = useAdmin();
  const { settings } = useShop();
  const pl = computePL(orders, settings);
  const [tab, setTab] = useState<'overview' | 'invoices' | 'expenses' | 'cashflow' | 'bank' | 'metrics'>('overview');
  const [showExpense, setShowExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: '', category: 'سایر', amount: 0, note: '' });
  const [expenseFilter, setExpenseFilter] = useState('all');
  const cf = cashflowForecast(orders);

  // محاسبه شاخص‌های مالی
  const totalExpenses = expenses.reduce((s: number, e: any) => s + e.amount, 0);
  const totalBankIn = bankTx.filter((t: any) => t.type === 'in').reduce((s: number, t: any) => s + t.amount, 0);
  const totalBankOut = bankTx.filter((t: any) => t.type === 'out').reduce((s: number, t: any) => s + t.amount, 0);
  const netCashFlow = totalBankIn - totalBankOut;
  const grossMargin = pl.grossSales > 0 ? (pl.grossProfit / pl.grossSales * 100) : 0;
  const netMargin = pl.netRevenue > 0 ? (pl.netProfit / pl.netRevenue * 100) : 0;
  const expenseRatio = pl.netRevenue > 0 ? (totalExpenses / pl.netRevenue * 100) : 0;

  // دسته‌بندی هزینه‌ها
  const expenseByCategory = expenses.reduce((acc: any, e: any) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const filteredExpenses = expenseFilter === 'all' ? expenses : expenses.filter((e: any) => e.category === expenseFilter);

  const exportPL = () => { 
    const data = [
      { 'عنوان': 'یادداشت', 'مبلغ (تومان)': 'بهای تمام‌شده و برخی هزینه‌ها برآوردی هستند؛ خروجی حسابداری نیست' },
      { 'عنوان': 'فروش ناخالص', 'مبلغ (تومان)': pl.grossSales },
      { 'عنوان': 'تخفیفات', 'مبلغ (تومان)': -pl.discounts },
      { 'عنوان': 'بازپرداخت مرجوعی', 'مبلغ (تومان)': -pl.refunds },
      { 'عنوان': 'درآمد خالص', 'مبلغ (تومان)': pl.netRevenue },
      { 'عنوان': 'بهای تمام‌شده', 'مبلغ (تومان)': -pl.cogs },
      { 'عنوان': 'سود ناخالص', 'مبلغ (تومان)': pl.grossProfit },
      { 'عنوان': 'کارمزد درگاه', 'مبلغ (تومان)': -pl.gatewayFee },
      { 'عنوان': 'هزینه ارسال', 'مبلغ (تومان)': -pl.shippingCost },
      { 'عنوان': 'هزینه بسته‌بندی', 'مبلغ (تومان)': -pl.packagingCost },
      { 'عنوان': 'هزینه‌های جاری', 'مبلغ (تومان)': -pl.operatingCosts },
      { 'عنوان': 'سود خالص', 'مبلغ (تومان)': pl.netProfit },
    ];
    downloadFile(toExcel(data, 'صورت سود و زیان'), 'profit-loss.xls', 'application/vnd.ms-excel'); 
  };

  const tooltipStyle: any = { 
    background: '#1A2238',
    border: '2px solid #F5C518',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: 'Vazirmatn',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    direction: 'rtl' as const
  };

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">سود و حاشیهٔ سود در این بخش برآوردی است و نباید مبنای گزارش حسابداری یا تصمیم پرداخت قرار گیرد. هزینه‌های واقعی ثبت‌شده و تراکنش‌های بانکی در زبانه‌های جداگانه قابل مشاهده‌اند.</p>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'درآمد خالص ثبت‌شده', v: formatPrice(pl.netRevenue), c: 'bg-blue-50 text-blue-700', icon: <IconDollar className="w-5 h-5" /> },
          { l: 'سود خالص برآوردی', v: formatPrice(pl.netProfit), c: 'bg-emerald-50 text-emerald-700', icon: <IconTrending className="w-5 h-5" /> },
          { l: 'جریان نقدی ثبت‌شده', v: formatPrice(netCashFlow), c: netCashFlow >= 0 ? 'bg-green-50 text-green-700' : 'bg-coral-50 text-coral-700', icon: <IconChart className="w-5 h-5" /> },
          { l: 'حاشیه سود برآوردی', v: `${faNum(netMargin.toFixed(1))}٪`, c: 'bg-purple-50 text-purple-700', icon: <IconStar className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 hover:shadow-lg transition-all`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={`${k.c} p-1.5 rounded-lg`}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[
          { k: 'overview', l: 'صورت سود و زیان', icon: <IconChart className="w-4 h-4" /> },
          { k: 'metrics', l: 'شاخص‌های مالی', icon: <IconStar className="w-4 h-4" /> },
          { k: 'cashflow', l: 'جریان نقدی', icon: <IconTrending className="w-4 h-4" /> },
          { k: 'expenses', l: 'هزینه‌ها', icon: <IconDollar className="w-4 h-4" /> },
          { k: 'invoices', l: 'فاکتورها', icon: <IconClipboard className="w-4 h-4" /> },
          { k: 'bank', l: 'تراکنش‌های بانکی', icon: <IconDollar className="w-4 h-4" /> }
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 flex items-center gap-1.5 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>
            {t.icon}{t.l}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>صورت سود و زیان</h3>
                <p className="text-[10px] text-cream-500 mt-0.5">تحلیل کامل درآمد و هزینه‌ها</p>
              </div>
              <button onClick={exportPL} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-900 text-white text-[11px] font-bold shadow-lg shadow-brand-900/25"><IconDownload className="w-3.5 h-3.5" />خروجی اکسل</button>
            </div>
            
            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side - P&L Statement */}
              <div className="space-y-1">
                {[
                  { l: 'فروش ناخالص', v: pl.grossSales, type: 'income' },
                  { l: 'تخفیفات', v: -pl.discounts, type: 'deduction' },
                  { l: 'بازپرداخت‌های مرجوعی', v: -pl.refunds, type: 'deduction' },
                  { l: 'درآمد خالص', v: pl.netRevenue, type: 'subtotal' },
                  { l: 'بهای تمام‌شده کالا', v: -pl.cogs, type: 'deduction' },
                  { l: 'سود ناخالص', v: pl.grossProfit, type: 'subtotal' },
                  { l: 'کارمزد درگاه پرداخت', v: -pl.gatewayFee, type: 'expense' },
                  { l: 'هزینه ارسال', v: -pl.shippingCost, type: 'expense' },
                  { l: 'هزینه بسته‌بندی', v: -pl.packagingCost, type: 'expense' },
                  { l: 'هزینه‌های جاری', v: -pl.operatingCosts, type: 'expense' },
                  { l: 'سود خالص', v: pl.netProfit, type: 'total' },
                ].map((r, i) => (
                  <div key={i} className={`flex justify-between items-center py-2 px-3 rounded-lg ${
                    r.type === 'total' ? 'bg-emerald-50 border-2 border-emerald-200' :
                    r.type === 'subtotal' ? 'bg-blue-50 border border-blue-200' :
                    r.type === 'deduction' ? 'bg-coral-50/50' :
                    r.type === 'expense' ? 'bg-amber-50/50' : ''
                  }`}>
                    <span className={`text-[12px] ${r.type === 'total' ? 'font-extrabold text-emerald-700' : r.type === 'subtotal' ? 'font-bold text-blue-700' : 'text-brand-700'}`}>{r.l}</span>
                    <span className={`tnum text-[13px] ${
                      r.type === 'total' ? 'font-extrabold text-emerald-700' :
                      r.type === 'subtotal' ? 'font-bold text-blue-700' :
                      r.v < 0 ? 'text-coral-600' : 'text-brand-900'
                    }`}>
                      {r.v < 0 ? '-' : ''}{formatPrice(Math.abs(r.v))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Right Side - Visual Charts */}
              <div className="space-y-4">
                {/* Revenue vs Costs Chart */}
                <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-4`}>
                  <h4 className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3`}>نسبت درآمد به هزینه</h4>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'سود خالص', value: Math.max(0, pl.netProfit), color: '#10b981' },
                            { name: 'هزینه‌ها', value: pl.cogs + pl.gatewayFee + pl.shippingCost + pl.packagingCost + pl.operatingCosts, color: '#ef4444' }
                          ]}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={2}
                        >
                          {[
                            { name: 'سود خالص', value: Math.max(0, pl.netProfit), color: '#10b981' },
                            { name: 'هزینه‌ها', value: pl.cogs + pl.gatewayFee + pl.shippingCost + pl.packagingCost + pl.operatingCosts, color: '#ef4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={tooltipStyle}
                          itemStyle={{ color: '#ffffff' }}
                          labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
                          formatter={(value: any) => [formatPrice(value) + ' تومان', '']}
                        />
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-brand-900 dark:fill-white" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                          {faNum(netMargin.toFixed(0))}٪
                        </text>
                        <text x="50%" y="50%" dy="18" textAnchor="middle" className="fill-cream-500" style={{ fontSize: '9px' }}>
                          حاشیه سود
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3`}>
                    <p className="text-[10px] text-cream-500 mb-1">حاشیه سود ناخالص</p>
                    <p className="text-[16px] font-extrabold text-blue-700 tnum">{faNum(grossMargin.toFixed(1))}٪</p>
                    <div className="mt-2 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${grossMargin}%` }}></div>
                    </div>
                  </div>
                  <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3`}>
                    <p className="text-[10px] text-cream-500 mb-1">نسبت هزینه به درآمد</p>
                    <p className="text-[16px] font-extrabold text-amber-700 tnum">{faNum(expenseRatio.toFixed(1))}٪</p>
                    <div className="mt-2 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, expenseRatio)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'metrics' && (
        <div className="space-y-4">
          {/* Financial Ratios */}
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>شاخص‌های مالی کلیدی</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { l: 'حاشیه سود ناخالص', v: `${faNum(grossMargin.toFixed(1))}٪`, desc: 'سود ناخالص / فروش ناخالص', color: 'text-blue-700', bg: 'bg-blue-50' },
                { l: 'حاشیه سود خالص', v: `${faNum(netMargin.toFixed(1))}٪`, desc: 'سود خالص / درآمد خالص', color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { l: 'نسبت هزینه به درآمد', v: `${faNum(expenseRatio.toFixed(1))}٪`, desc: 'هزینه‌ها / درآمد خالص', color: 'text-amber-700', bg: 'bg-amber-50' },
                { l: 'میانگین ارزش سفارش', v: formatPrice(orders.length ? pl.netRevenue / orders.length : 0), desc: 'درآمد خالص / تعداد سفارش', color: 'text-purple-700', bg: 'bg-purple-50' },
              ].map((m, i) => (
                <div key={i} className={`rounded-xl ${m.bg} p-4`}>
                  <p className="text-[11px] text-cream-500 mb-2">{m.l}</p>
                  <p className={`text-[20px] font-extrabold ${m.color} tnum mb-1`}>{m.v}</p>
                  <p className="text-[9px] text-cream-500">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>ترکیب هزینه‌ها</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(expenseByCategory).map(([name, value]) => ({ name, value: value as number }))}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}٪)`}
                    >
                      {Object.entries(expenseByCategory).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#1A2238', '#F5C518', '#E34A4A', '#10b981', '#8b5cf6', '#f59e0b'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: '#ffffff' }}
                      labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
                      formatter={(value: any) => [formatPrice(value) + ' تومان', '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>جزئیات هزینه‌ها</h3>
              <div className="space-y-2">
                {Object.entries(expenseByCategory).map(([category, amount], i) => {
                  const percentage = totalExpenses > 0 ? ((amount as number / totalExpenses) * 100) : 0;
                  return (
                    <div key={i} className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-bold">{category}</span>
                        <span className="tnum text-[12px] font-bold">{formatPrice(amount as number)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-cream-200 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-900 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="tnum text-[10px] text-cream-500 w-10">{faNum(percentage.toFixed(1))}٪</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 'invoices' && <AdminInvoices />}
      {tab === 'expenses' && (
        <div className="space-y-4">
          {/* Expense Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">کل هزینه‌ها</p>
              <p className="text-lg font-extrabold tnum text-coral-700">{formatPrice(totalExpenses)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">تعداد هزینه‌ها</p>
              <p className="text-lg font-extrabold tnum">{faNum(expenses.length)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">میانگین هزینه</p>
              <p className="text-lg font-extrabold tnum">{formatPrice(expenses.length ? totalExpenses / expenses.length : 0)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">بیشترین دسته</p>
              <p className="text-sm font-extrabold">{(Object.entries(expenseByCategory) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowExpense(true)} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1 shadow-lg shadow-brand-900/25"><IconPlus className="w-4 h-4" />ثبت هزینه جدید</button>
            <select value={expenseFilter} onChange={e => setExpenseFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
              <option value="all">همه دسته‌ها</option>
              {Object.keys(expenseByCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Expenses Table */}
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عنوان</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">دسته‌بندی</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مبلغ</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تاریخ</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">یادداشت</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e: any) => (
                    <tr key={e.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                      <td className="py-2.5 px-3 font-bold">{e.title}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cream-100 text-brand-700">{e.category}</span>
                      </td>
                      <td className="py-2.5 px-3 tnum font-bold text-coral-700">{formatPrice(e.amount)}</td>
                      <td className="py-2.5 px-3 text-[11px] text-cream-500">{dayLabel(new Date(e.date))}</td>
                      <td className="py-2.5 px-3 text-[11px] text-cream-500">{e.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showExpense && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowExpense(false)}>
              <div className={`w-full max-w-md rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>ثبت هزینه جدید</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-cream-500 mb-1 block">عنوان هزینه</label>
                    <input value={newExpense.title} onChange={e => setNewExpense({ ...newExpense, title: e.target.value })} placeholder="مثلاً: تبلیغات اینستاگرام" className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-cream-500 mb-1 block">دسته‌بندی</label>
                    <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100">
                      <option>تبلیغات</option><option>حقوق</option><option>اجاره</option><option>بسته‌بندی</option><option>حمل‌ونقل</option><option>کارمزد درگاه</option><option>سایر</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-cream-500 mb-1 block">مبلغ (تومان)</label>
                    <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: +e.target.value })} placeholder="0" className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-cream-500 mb-1 block">یادداشت (اختیاری)</label>
                    <textarea value={newExpense.note} onChange={e => setNewExpense({ ...newExpense, note: e.target.value })} placeholder="توضیحات اضافی..." className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none h-20 resize-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setExpenses([...expenses, { ...newExpense, id: `exp-${Date.now()}`, date: new Date().toISOString() }]); setShowExpense(false); setNewExpense({ title: '', category: 'سایر', amount: 0, note: '' }); log('ثبت هزینه جدید', newExpense.title); }} className="flex-1 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px] shadow-lg shadow-brand-900/25">ذخیره هزینه</button>
                  <button onClick={() => setShowExpense(false)} className="px-4 py-2.5 rounded-xl border border-cream-300 text-[12px] font-bold">انصراف</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {tab === 'cashflow' && (
        <div className="space-y-4">
          {/* Cash Flow Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-cream-500">ورودی کل</p>
                <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-lg"><IconTrending className="w-4 h-4" /></div>
              </div>
              <p className="text-lg font-extrabold tnum text-emerald-700">{formatPrice(totalBankIn)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-cream-500">خروجی کل</p>
                <div className="bg-coral-50 text-coral-700 p-1.5 rounded-lg"><IconTrending className="w-4 h-4" /></div>
              </div>
              <p className="text-lg font-extrabold tnum text-coral-700">{formatPrice(totalBankOut)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-cream-500">جریان خالص</p>
                <div className={`${netCashFlow >= 0 ? 'bg-green-50 text-green-700' : 'bg-coral-50 text-coral-700'} p-1.5 rounded-lg`}><IconChart className="w-4 h-4" /></div>
              </div>
              <p className={`text-lg font-extrabold tnum ${netCashFlow >= 0 ? 'text-green-700' : 'text-coral-700'}`}>{formatPrice(netCashFlow)}</p>
            </div>
          </div>

          {/* Cash Flow Chart */}
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>پیش‌بینی جریان نقدی</h3>
                <p className="text-[10px] text-cream-500 mt-0.5">نیازمند دادهٔ واقعی تراکنش‌ها و تعهدات آینده</p>
              </div>
              <div className="flex gap-3 text-[10px]">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-brand-900"></div><span>ورودی</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-coral-500"></div><span>خروجی</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-accent-500"></div><span>مانده</span></div>
              </div>
            </div>
            {cf.length ? <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cf}>
                  <defs>
                    <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A2238" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1A2238" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#242e3b' : '#E8E1CC'} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} tickFormatter={(v) => v.slice(5)} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'Vazirmatn' }} tickFormatter={(v) => formatPrice(v / 1000000) + 'M'} stroke={darkMode ? '#8da5cc' : '#B8A97E'} />
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: '#ffffff' }}
                    labelStyle={{ color: '#F5C518', fontWeight: 'bold', marginBottom: '6px' }}
                    formatter={(value: any) => [formatPrice(value) + ' تومان', '']}
                  />
                  <Bar dataKey="inflow" fill="url(#colorInflow)" name="ورودی" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="outflow" fill="#E34A4A" name="خروجی" radius={[8, 8, 0, 0]} />
                  <Line type="monotone" dataKey="balance" stroke="#F5C518" strokeWidth={3} name="مانده" dot={{ fill: '#F5C518', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div> : <p className="py-10 text-center text-[11px] text-cream-500">تا زمان اتصال داده‌های بانکی و ثبت هزینه‌های آینده، پیش‌بینی قابل اتکا وجود ندارد.</p>}
          </div>
        </div>
      )}
      {tab === 'bank' && (
        <div className="space-y-4">
          {/* Bank Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-cream-500">کل ورودی</p>
                <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-lg"><IconTrending className="w-4 h-4" /></div>
              </div>
              <p className="text-lg font-extrabold tnum text-emerald-700">{formatPrice(totalBankIn)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-cream-500">کل خروجی</p>
                <div className="bg-coral-50 text-coral-700 p-1.5 rounded-lg"><IconTrending className="w-4 h-4" /></div>
              </div>
              <p className="text-lg font-extrabold tnum text-coral-700">{formatPrice(totalBankOut)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">تعداد تراکنش</p>
              <p className="text-lg font-extrabold tnum">{faNum(bankTx.length)}</p>
            </div>
            <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
              <p className="text-[10px] text-cream-500 mb-1">تطابق یافته</p>
              <p className="text-lg font-extrabold tnum text-emerald-700">{faNum(bankTx.filter((t: any) => t.matched).length)}</p>
            </div>
          </div>

          {/* Bank Transactions Table */}
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
            <div className="p-5 border-b border-cream-200">
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>تراکنش‌های بانکی</h3>
              <p className="text-[10px] text-cream-500 mt-0.5">لیست تمام تراکنش‌های ورودی و خروجی</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نوع</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">روش پرداخت</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مبلغ</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تاریخ</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کد پیگیری</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت تطابق</th>
                  </tr>
                </thead>
                <tbody>
                  {bankTx.map((tx: any) => (
                    <tr key={tx.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${tx.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-coral-100 text-coral-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'in' ? 'bg-emerald-600' : 'bg-coral-600'}`}></span>
                          {tx.type === 'in' ? 'ورودی' : 'خروجی'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold">{tx.method}</td>
                      <td className="py-2.5 px-3 tnum font-bold">{formatPrice(tx.amount)}</td>
                      <td className="py-2.5 px-3 text-[11px] text-cream-500">{dayLabel(new Date(tx.date))}</td>
                      <td className="py-2.5 px-3 tnum text-[11px] font-mono text-brand-700">{tx.ref || '-'}</td>
                      <td className="py-2.5 px-3">
                        {tx.matched ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                            <IconCheck className="w-3 h-3" />
                            تطابق یافته
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                            <IconClock className="w-3 h-3" />
                            در انتظار
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
