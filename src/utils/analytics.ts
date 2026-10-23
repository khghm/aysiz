// Analytics, Finance, and Insights utilities

export interface Order {
  id: string; code: string; customer: string; mobile: string; city: string;
  items: { productId: string; name: string; qty: number; price: number; discount: number }[];
  subtotal: number; discountAmount: number; shipping: number; tax: number; total: number;
  status: string; payment: string; channel: string; createdAt: string; address: string;
  couponCode?: string;
}

export interface Product {
  id: string; name: string; category: string; brand: string; price: number;
  discount: number; rating: number; stock: number; sales: number; image: string;
}

export interface Customer {
  id: string; name: string; mobile: string; city: string; orders: number;
  totalSpent: number; loyalty: number; segment: string; lastOrder: string;
}

// Summarize orders
export function summarize(orders: Order[]) {
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(o => o.createdAt?.slice(0, 10) === today);
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;
  const uniqueCustomers = new Set(orders.map(o => o.mobile)).size;
  const conversionRate = orders.length > 0 ? Math.min(95, 3.2 + Math.random() * 2) : 0;
  return { todayOrders: todayOrders.length, totalRevenue, avgOrder, uniqueCustomers, conversionRate: +conversionRate.toFixed(1) };
}

export function growthRate(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  return +((current - previous) / previous * 100).toFixed(1);
}

export function channelStats(orders: Order[]) {
  const channels: Record<string, { orders: number; revenue: number; customers: Set<string> }> = {};
  orders.forEach(o => {
    const ch = o.channel || 'direct';
    if (!channels[ch]) channels[ch] = { orders: 0, revenue: 0, customers: new Set() };
    channels[ch].orders++;
    channels[ch].revenue += o.total || 0;
    channels[ch].customers.add(o.mobile);
  });
  return Object.entries(channels).map(([name, d]) => ({
    name, orders: d.orders, revenue: d.revenue,
    customers: d.customers.size, aov: d.orders ? +(d.revenue / d.orders).toFixed(0) : 0,
    clv: d.customers.size ? +(d.revenue / d.customers.size).toFixed(0) : 0
  }));
}

export function funnelStages(orders: Order[]) {
  const total = orders.length * 12;
  return [
    { stage: 'بازدید', count: total, rate: 100 },
    { stage: 'افزودن به سبد', count: Math.round(total * 0.35), rate: 35 },
    { stage: 'تکمیل اطلاعات', count: Math.round(total * 0.18), rate: 51 },
    { stage: 'پرداخت', count: Math.round(total * 0.08), rate: 44 },
    { stage: 'سفارش موفق', count: orders.length, rate: orders.length ? Math.round(orders.length / (total * 0.08) * 100) : 0 },
  ];
}

export function bottleneck(stages: { stage: string; rate: number }[]): string {
  let min = 100, label = '';
  stages.forEach((s, i) => { if (i > 0 && s.rate < min) { min = s.rate; label = s.stage; } });
  return label;
}

export function aggregateCustomers(orders: Order[]): Customer[] {
  const map: Record<string, Customer> = {};
  orders.forEach(o => {
    if (!map[o.mobile]) {
      map[o.mobile] = { id: o.mobile, name: o.customer, mobile: o.mobile, city: o.city, orders: 0, totalSpent: 0, loyalty: 0, segment: 'جدید', lastOrder: o.createdAt };
    }
    map[o.mobile].orders++;
    map[o.mobile].totalSpent += o.total || 0;
    map[o.mobile].loyalty = Math.floor(map[o.mobile].totalSpent / 10000);
    if (map[o.mobile].orders >= 10) map[o.mobile].segment = 'VIP';
    else if (map[o.mobile].orders >= 5) map[o.mobile].segment = 'وفادار';
  });
  return Object.values(map);
}

// Finance utilities
export function computePL(orders: Order[], settings: any) {
  const grossSales = orders.reduce((s, o) => s + (o.subtotal || 0), 0);
  const discounts = orders.reduce((s, o) => s + (o.discountAmount || 0), 0);
  const netRevenue = grossSales - discounts;
  const cogs = netRevenue * 0.55;
  const gatewayFee = netRevenue * ((settings?.gatewayFee || 1) / 100);
  const shippingCost = orders.length * 15000;
  const packagingCost = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0) * (settings?.packagingCost || 3000);
  const operatingCosts = 5000000;
  const grossProfit = netRevenue - cogs;
  const netProfit = grossProfit - gatewayFee - shippingCost - packagingCost - operatingCosts;
  return { grossSales, discounts, netRevenue, cogs, grossProfit, gatewayFee, shippingCost, packagingCost, operatingCosts, netProfit, margin: netRevenue ? +(netProfit / netRevenue * 100).toFixed(1) : 0 };
}

export function cashflowForecast(orders: Order[], days = 14) {
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOrders = orders.filter(o => o.createdAt?.slice(0, 10) === dateStr);
    const inflow = dayOrders.reduce((s, o) => s + (o.total || 0), 0);
    const outflow = 500000 + Math.random() * 300000;
    return { date: dateStr, inflow: Math.round(inflow), outflow: Math.round(outflow), balance: Math.round(inflow - outflow) };
  });
  return daily;
}

// Insights utilities
export function detectAnomalies(orders: Order[]): { date: string; revenue: number; avg: number; deviation: string }[] {
  const daily: Record<string, number> = {};
  orders.forEach(o => {
    const d = o.createdAt?.slice(0, 10) || '';
    daily[d] = (daily[d] || 0) + (o.total || 0);
  });
  const values = Object.values(daily);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length || 1));
  return Object.entries(daily).map(([date, revenue]) => ({
    date, revenue, avg: Math.round(avg),
    deviation: Math.abs(revenue - avg) > 2 * std ? (revenue > avg ? 'رشد غیرمنتظره' : 'افت غیرمنتظره') : 'عادی'
  })).filter(d => d.deviation !== 'عادی');
}

export function forecast7(orders: Order[]): { date: string; forecast: number }[] {
  const last7 = orders.slice(-7).map(o => o.total || 0);
  const avg = last7.length ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
  const trend = last7.length > 1 ? (last7[last7.length - 1] - last7[0]) / last7.length : 0;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return { date: d.toISOString().slice(0, 10), forecast: Math.max(0, Math.round(avg + trend * (i + 1))) };
  });
}

export function stockoutRisks(products: Product[]): { name: string; stock: number; dailyRate: number; daysLeft: number }[] {
  return products.filter(p => p.stock > 0 && p.stock <= 10).map(p => {
    const dailyRate = Math.max(0.5, p.sales / 30);
    return { name: p.name, stock: p.stock, dailyRate: +dailyRate.toFixed(1), daysLeft: Math.round(p.stock / dailyRate) };
  }).sort((a, b) => a.daysLeft - b.daysLeft);
}

export function wordCloudData(terms: { term: string; count: number }[]): { text: string; size: number }[] {
  const max = Math.max(...terms.map(t => t.count), 1);
  return terms.map(t => ({ text: t.term, size: Math.max(12, Math.round(t.count / max * 36)) }));
}
