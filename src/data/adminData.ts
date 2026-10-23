import { Order } from '../utils/analytics';

const now = new Date();
const daysAgo = (d: number) => { const dt = new Date(now); dt.setDate(dt.getDate() - d); return dt.toISOString(); };

export const seedOrders: Order[] = Array.from({ length: 30 }, (_, i) => ({
  id: `ord-${i + 1}`,
  code: `SQ-${String(100001 + i).slice(0)}`,
  customer: ['علی محمدی', 'مریم احمدی', 'رضا کریمی', 'زهرا نوری', 'حسن رضایی', 'فاطمه صادقی', 'محمد حسینی', 'نرگس امینی'][i % 8],
  mobile: `0912${String(1000000 + i * 111).slice(0, 7)}`,
  city: ['تهران', 'اصفهان', 'شیراز', 'تبریز', 'مشهد', 'کرج'][i % 6],
  items: [{ productId: `p${(i % 12) + 1}`, name: `محصول ${(i % 12) + 1}`, qty: 1 + (i % 3), price: 200000 + i * 50000, discount: i % 3 === 0 ? 15 : 0 }],
  subtotal: (200000 + i * 50000) * (1 + (i % 3)),
  discountAmount: i % 3 === 0 ? 50000 : 0,
  shipping: 25000,
  tax: Math.round((200000 + i * 50000) * 0.09),
  total: Math.round((200000 + i * 50000) * (1 + (i % 3)) * 1.09 + 25000 - (i % 3 === 0 ? 50000 : 0)),
  status: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'][i % 5],
  payment: ['online', 'card', 'wallet'][i % 3],
  channel: ['direct', 'instagram', 'telegram', 'website'][i % 4],
  createdAt: daysAgo(i % 14),
  address: `تهران، خیابان ولیعصر، پلاک ${10 + i}`,
  couponCode: i % 4 === 0 ? 'SOUQ10' : undefined
}));

export const seedDiscountCodes = [
  { id: 'dc1', code: 'SOUQ10', type: 'percent', value: 10, maxUses: 100, usedCount: 45, expiresAt: '2025-03-20', active: true },
  { id: 'dc2', code: 'FALL500', type: 'fixed', value: 500000, maxUses: 50, usedCount: 12, expiresAt: '2025-02-28', active: true },
  { id: 'dc3', code: 'WELCOME15', type: 'percent', value: 15, maxUses: 200, usedCount: 89, expiresAt: '2025-06-30', active: true },
  { id: 'dc4', code: 'SUMMER25', type: 'percent', value: 25, maxUses: 30, usedCount: 30, expiresAt: '2024-12-31', active: false },
];

export const seedSettings = {
  storeName: 'تاسیز', phone: '۰۲۱-۸۸۷۷۶۶۵۵', email: 'info@tasis.ir',
  address: 'تهران، خیابان ولیعصر، مجتمع تجاری تاسیز',
  freeShippingThreshold: 1500000, shippingCost: 45000,
  vatRate: 9, levyRate: 0, gatewayFee: 1.5, packagingCost: 3000,
  showPricesWithTax: false, maintenance: false,
  tickerTexts: ['ارسال رایگان برای خرید بالای ۱.۵ میلیون تومان', 'تخفیف ویژه لباس زیر تا ۳۰٪', 'ضمانت اصالت و بازگشت ۷ روزه'],
  logo: '', banners: [],
};

export const seedAffiliates = [
  { id: 'af1', name: 'سارا موسوی', username: 'sara_m', mobile: '09121234567', refCode: 'SARA20', level: 'gold', clicks: 1250, orders: 45, sales: 12500000, commission: 1250000, active: true, flagged: false },
  { id: 'af2', name: 'امیر جعفری', username: 'amir_j', mobile: '09131234567', refCode: 'AMIR15', level: 'silver', clicks: 800, orders: 22, sales: 6800000, commission: 680000, active: true, flagged: false },
  { id: 'af3', name: 'ناشناس', username: 'unknown_x', mobile: '09141234567', refCode: 'UNK50', level: 'platinum', clicks: 3500, orders: 2, sales: 400000, commission: 40000, active: true, flagged: true },
];

export const seedPayouts = [
  { id: 'po1', affiliateId: 'af1', amount: 500000, status: 'pending', date: daysAgo(2), tracking: '' },
  { id: 'po2', affiliateId: 'af2', amount: 300000, status: 'paid', date: daysAgo(7), tracking: 'TRX-001' },
];

export const seedCommissionConfig = {
  baseRate: 10, cookieDays: 30, minWithdraw: 500000, maxPerOrder: 200000,
  levelBonus: { silver: 0, gold: 2, platinum: 5 },
  categoryRates: { underwear: 12, tshirt: 10, shirt: 10, slipper: 8, sandal: 8, socks: 8 },
  tiered: [{ min: 0, rate: 10 }, { min: 5000000, rate: 12 }, { min: 10000000, rate: 15 }],
};

export const seedTickets = [
  { id: 'tk1', customer: 'علی محمدی', mobile: '09121111111', subject: 'مشکل در سایز', message: 'سایز M کوچک بود', status: 'open', priority: 'high', assignee: 'پشتیبانی ۱', replies: [{ from: 'customer', text: 'سایز M کوچک بود، لطفاً تعویض کنید', date: daysAgo(1) }, { from: 'support', text: 'درخواست تعویض ثبت شد', date: daysAgo(0) }], createdAt: daysAgo(1) },
  { id: 'tk2', customer: 'مریم احمدی', mobile: '09122222222', subject: 'پیگیری سفارش', message: 'سفارش من کی ارسال می‌شود؟', status: 'answered', priority: 'medium', assignee: 'پشتیبانی ۲', replies: [{ from: 'customer', text: 'سفارش من کی ارسال می‌شود؟', date: daysAgo(3) }, { from: 'support', text: 'سفارش شما فردا ارسال می‌شود', date: daysAgo(2) }], createdAt: daysAgo(3) },
  { id: 'tk3', customer: 'رضا کریمی', mobile: '09123333333', subject: 'درخواست مرجوعی', message: 'می‌خواهم کالا را مرجوع کنم', status: 'pending', priority: 'low', assignee: '', replies: [], createdAt: daysAgo(0) },
];

export const seedRMAs = [
  { id: 'rma1', orderId: 'ord-1', productId: 'p1', productName: 'شورت مردانه نخی', reason: 'ایراد فنی', status: 'requested', customer: 'علی محمدی', date: daysAgo(2) },
  { id: 'rma2', orderId: 'ord-5', productId: 'p4', productName: 'تی‌شرت مردانه', reason: 'مغایرت با سفارش', status: 'approved', customer: 'حسن رضایی', date: daysAgo(5) },
];

export const seedCarriers = [
  { id: 'cr1', name: 'پست پیشتاز', baseCost: 35000, deliveryDays: '۳-۵ روز', active: true },
  { id: 'cr2', name: 'تیپاکس', baseCost: 55000, deliveryDays: '۱-۲ روز', active: true },
  { id: 'cr3', name: 'باربری تاسیز', baseCost: 25000, deliveryDays: '۲-۴ روز', active: false },
];

export const seedVendors = [
  { id: 'v1', name: 'تولیدی تاسیز', legalName: 'شرکت تاسیز', iban: 'IR0123456789', phone: '02188776655', fee: 8, active: true, totalSales: 45000000, totalItems: 1200, totalOrders: 350, balance: 3500000 },
  { id: 'v2', name: 'پوشاک نیلی', legalName: 'پوشاک نیلی', iban: 'IR9876543210', phone: '02177665544', fee: 12, active: true, totalSales: 18000000, totalItems: 450, totalOrders: 120, balance: 1500000 },
];

export const seedTasks = [
  { id: 'tsk1', title: 'بروزرسانی موجودی انبار', desc: 'بررسی و بروزرسانی موجودی محصولات', assignee: 'انباردار', priority: 'high', deadline: '2025-01-20', status: 'todo' },
  { id: 'tsk2', title: 'طراحی بنر جدید', desc: 'طراحی بنر تخفیف زمستانی', assignee: 'گرافیست', priority: 'medium', deadline: '2025-01-18', status: 'doing' },
  { id: 'tsk3', title: 'پاسخ به تیکت‌ها', desc: 'بررسی تیکت‌های باز', assignee: 'پشتیبانی', priority: 'high', deadline: '2025-01-15', status: 'done' },
];

export const seedRoles = [
  { id: 'role1', name: 'مدیر کل', color: '#1A2238', sections: ['home', 'reports', 'orders', 'products', 'finance', 'customers', 'reviews', 'discounts', 'growth', 'returns', 'support', 'operations', 'system', 'settings', 'insights', 'affiliates', 'pos', 'content', 'vendors', 'logistics', 'tasks'] },
  { id: 'role2', name: 'اپراتور فروش', color: '#3d61a3', sections: ['home', 'orders', 'products', 'customers', 'pos'] },
  { id: 'role3', name: 'پشتیبانی', color: '#166534', sections: ['home', 'orders', 'customers', 'reviews', 'support', 'returns'] },
  { id: 'role4', name: 'انباردار', color: '#78350f', sections: ['home', 'products', 'orders', 'logistics'] },
];

export const seedCampaigns = [
  { id: 'cmp1', name: 'تخفیف پلکانی زمستانه', type: 'tiered', config: { tiers: [{ min: 1000000, discount: 12 }, { min: 2000000, discount: 18 }] }, uses: 45, active: true },
  { id: 'cmp2', name: 'یکی بخر یکی ببر', type: 'bogo', config: {}, uses: 12, active: true },
  { id: 'cmp3', name: 'ارسال رایگان عید', type: 'freeship', config: {}, uses: 89, active: false },
];

export const seedInvoices = [
  { id: 'inv1', number: 'INV-001', orderId: 'ord-1', customer: 'علی محمدی', amount: 850000, status: 'paid', date: daysAgo(10) },
  { id: 'inv2', number: 'INV-002', orderId: 'ord-2', customer: 'مریم احمدی', amount: 1200000, status: 'pending', date: daysAgo(5) },
  { id: 'inv3', number: 'INV-003', orderId: 'ord-3', customer: 'رضا کریمی', amount: 650000, status: 'paid', date: daysAgo(3) },
];

export const seedExpenses = [
  { id: 'exp1', title: 'تبلیغات اینستاگرام', category: 'تبلیغات', amount: 5000000, date: daysAgo(7), note: 'کمپین زمستانه' },
  { id: 'exp2', title: 'حقوق پرسنل', category: 'حقوق', amount: 35000000, date: daysAgo(2), note: 'دی ماه' },
  { id: 'exp3', title: 'اجاره انبار', category: 'اجاره', amount: 8000000, date: daysAgo(1), note: 'دی ماه' },
];

export const seedBankTx = [
  { id: 'btx1', type: 'in', method: 'زرین‌پال', amount: 2500000, date: daysAgo(1), ref: 'ZP-001', matched: true },
  { id: 'btx2', type: 'in', method: 'آیدی‌پی', amount: 1800000, date: daysAgo(0), ref: 'IDP-002', matched: false },
  { id: 'btx3', type: 'out', method: 'پایا', amount: 5000000, date: daysAgo(2), ref: 'PAY-003', matched: true },
];

export const seedAbandoned = [
  { id: 'ab1', customer: 'فاطمه صادقی', mobile: '09125555555', items: 3, value: 1250000, date: daysAgo(1), recovered: false },
  { id: 'ab2', customer: 'محمد حسینی', mobile: '09126666666', items: 2, value: 890000, date: daysAgo(2), recovered: true },
];

export const seedSearchTerms = [
  { term: 'شورت مردانه', count: 245, trending: true },
  { term: 'سوتین اسپرت', count: 189, trending: true },
  { term: 'تی‌شرت نایک', count: 156, trending: false },
  { term: 'دمپایی ابری', count: 134, trending: true },
  { term: 'جوراب بامبو', count: 98, trending: false },
  { term: 'پیراهن مردانه', count: 87, trending: false },
];

export const seedPages = [
  { id: 'pg1', slug: 'about', title: 'درباره تاسیز', content: '## فروشگاه تاسیز\n\nتاسیز با سالها تجربه در تولید و فروش پوشاک...', metaTitle: 'درباره ما - تاسیز', metaDesc: 'آشنایی با فروشگاه تاسیز', keywords: 'تاسیز, درباره ما', published: true },
  { id: 'pg2', slug: 'contact', title: 'تماس با ما', content: '## اطلاعات تماس\n\n- تلفن: ۰۲۱-۸۸۷۷۶۶۵۵\n- ایمیل: info@tasis.ir\n- آدرس: تهران، خیابان ولیعصر', metaTitle: 'تماس با تاسیز', metaDesc: 'راه‌های ارتباطی با فروشگاه تاسیز', keywords: 'تماس, آدرس, تلفن', published: true },
  { id: 'pg3', slug: 'terms', title: 'قوانین و مقررات', content: '## قوانین فروشگاه\n\n۱. تمامی محصولات دارای ضمانت اصالت هستند.\n۲. امکان بازگشت تا ۷ روز وجود دارد.', metaTitle: 'قوانین - تاسیز', metaDesc: 'قوانین و مقررات استفاده از فروشگاه تاسیز', keywords: 'قوانین, مقررات', published: true },
];

export const seedBanners = [
  { id: 'bn1', title: 'تخفیف ویژه زمستانه', subtitle: 'تا ۵۰٪ تخفیف روی تمام محصولات', btnText: 'مشاهده محصولات', position: 'home', active: true, expiresAt: '2025-03-20', color1: '#1A2238', color2: '#3d61a3' },
  { id: 'bn2', title: 'لباس زیر راحتی', subtitle: 'مجموعه جدید با جنس نخ پنبه', btnText: 'خرید کنید', position: 'category', active: true, expiresAt: '2025-02-28', color1: '#f093fb', color2: '#f5576c' },
];

export const seedPosts = [
  { id: 'pst1', title: 'راهنمای انتخاب لباس زیر مناسب', category: 'راهنمای خرید', tags: ['لباس زیر', 'راهنما'], content: '## انتخاب صحیح\n\nانتخاب لباس زیر مناسب بسیار مهم است...', views: 450, date: daysAgo(5), color1: '#667eea', color2: '#764ba2', published: true, comments: 12 },
  { id: 'pst2', title: 'ترندهای پوشاک ۱۴۰۴', category: 'مد و فشن', tags: ['ترند', 'مد'], content: '## ترندهای جدید\n\nامسال رنگ‌های...', views: 320, date: daysAgo(10), color1: '#f093fb', color2: '#f5576c', published: true, comments: 8 },
];

export const seedAutomations = [
  { id: 'aut1', name: 'خوش‌آمدگویی مشتری جدید', event: 'register', channel: 'sms', template: 'سلام {name}! به تاسیز خوش آمدید.', active: true, sent: 234 },
  { id: 'aut2', name: 'یادآوری سبد رها شده', event: 'abandoned_cart', channel: 'sms', template: 'سبد خرید شما منتظر است! کد تخفیف: CART10', active: true, sent: 89 },
  { id: 'aut3', name: 'تبریک تولد', event: 'birthday', channel: 'sms', template: 'تولدتان مبارک! هدیه ویژه تاسیز برای شما', active: false, sent: 45 },
];

export const seedLoyalty = {
  pointsPerThousand: 1, pointValue: 100,
  members: [
    { id: 'lm1', name: 'علی محمدی', points: 2500, tier: 'gold' },
    { id: 'lm2', name: 'مریم احمدی', points: 1800, tier: 'silver' },
    { id: 'lm3', name: 'رضا کریمی', points: 3200, tier: 'platinum' },
  ]
};

export const seedIntegrations = [
  { id: 'int1', name: 'زرین‌پال', type: 'payment', connected: true, txCount: 456 },
  { id: 'int2', name: 'آیدی‌پی', type: 'payment', connected: false, txCount: 0 },
  { id: 'int3', name: 'پست ایران', type: 'shipping', connected: true, txCount: 234 },
  { id: 'int4', name: 'تیپاکس', type: 'shipping', connected: true, txCount: 89 },
];

export const seedAuditLog = [
  { id: 'log1', action: 'ورود به سیستم', actor: 'admin', role: 'مدیر کل', target: '-', severity: 'normal', at: daysAgo(0) },
  { id: 'log2', action: 'ویرایش محصول', actor: 'admin', role: 'مدیر کل', target: 'p1', severity: 'normal', at: daysAgo(0) },
  { id: 'log3', action: 'حذف سفارش', actor: 'operator', role: 'اپراتور فروش', target: 'ord-5', severity: 'warning', at: daysAgo(1) },
];

export const seedSurveys = [
  { id: 'sv1', title: 'نظرسنجی رضایت مشتری', questions: ['از خرید خود راضی هستید؟', 'کیفیت محصولات چگونه بود؟'], responses: 45, avgRating: 4.2, target: 'all', active: true },
];

export const seedAssets = [
  { id: 'ast1', name: 'دستگاه دوخت صنعتی', value: 150000000, lifeYears: 10, purchaseDate: '2022-01-01' },
  { id: 'ast2', name: 'سیستم حسابداری', value: 25000000, lifeYears: 5, purchaseDate: '2023-06-01' },
];

export const seedLoginHistory = [
  { id: 'lh1', user: 'admin', role: 'مدیر کل', ip: '192.168.1.1', browser: 'Chrome 120', time: daysAgo(0), success: true },
  { id: 'lh2', user: 'unknown', role: '-', ip: '10.0.0.5', browser: 'Firefox 119', time: daysAgo(1), success: false },
];

export const seedErrorLog = [
  { id: 'err1', message: 'خطا در اتصال به درگاه پرداخت', time: daysAgo(2), resolved: true },
  { id: 'err2', message: 'تایم‌اوت API پست', time: daysAgo(1), resolved: false },
];
