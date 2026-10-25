// داده‌های اولیه فروشگاه — همسان با seed فرونت‌اند (src/data/products.ts و adminData.ts)
// این داده‌ها فقط بار اول (دیتابیس خالی) درج می‌شوند.

export const seedCategories = [
  { id: 'underwear', name: 'لباس زیر', icon: 'underwear', subs: [
    { id: 'briefs', name: 'شورت' }, { id: 'bra', name: 'سوتین' }, { id: 'tank', name: 'رکابی' }, { id: 'set', name: 'ست لباس زیر' }
  ]},
  { id: 'tshirt', name: 'تی‌شرت', icon: 'tshirt', subs: [
    { id: 'tshirt-m', name: 'تی‌شرت مردانه' }, { id: 'tshirt-w', name: 'تی‌شرت زنانه' }, { id: 'tshirt-k', name: 'تی‌شرت بچگانه' }
  ]},
  { id: 'shirt', name: 'پیراهن', icon: 'shirt', subs: [
    { id: 'shirt-m', name: 'پیراهن مردانه' }, { id: 'shirt-w', name: 'پیراهن زنانه' }
  ]},
  { id: 'slipper', name: 'دمپایی', icon: 'slipper', subs: [
    { id: 'slipper-m', name: 'دمپایی مردانه' }, { id: 'slipper-w', name: 'دمپایی زنانه' }
  ]},
  { id: 'sandal', name: 'صندل', icon: 'sandal', subs: [
    { id: 'sandal-m', name: 'صندل مردانه' }, { id: 'sandal-w', name: 'صندل زنانه' }
  ]},
  { id: 'socks', name: 'جوراب', icon: 'socks', subs: [
    { id: 'socks-m', name: 'جوراب مردانه' }, { id: 'socks-w', name: 'جوراب زنانه' }, { id: 'socks-k', name: 'جوراب بچگانه' }
  ]},
  { id: 'sport', name: 'پوشاک ورزشی', icon: 'sport', subs: [
    { id: 'sport-m', name: 'ورزشی مردانه' }, { id: 'sport-w', name: 'ورزشی زنانه' }
  ]},
  { id: 'kids', name: 'بچگانه', icon: 'kids', subs: [
    { id: 'kids-m', name: 'پسرانه' }, { id: 'kids-w', name: 'دخترانه' }
  ]},
];

export const seedBrands = [
  'تای سیز', 'نایک', 'آدیداس', 'پوما', 'ریباک', 'آندرآرمور', 'کاترپیلار', 'نیوبالانس', 'اسکچرز', 'کروکس', 'ایزادی', 'هوپ'
];

const productImages = [
  'https://image.qwenlm.ai/generated-images/ecd385e4-7010-4275-ab83-9c81f7b6d962/_result.png',
  'https://image.qwenlm.ai/generated-images/d33a122f-1bab-45c9-8cc6-65f62cf9ee96/_result.png',
  'https://image.qwenlm.ai/generated-images/bf09b6f6-66d6-40d5-bd7d-0354150d5aea/_result.png',
  'https://image.qwenlm.ai/generated-images/20fe0905-18f6-4328-a266-386a6e3ace17/_result.png',
  'https://image.qwenlm.ai/generated-images/9d05c93a-1788-41e1-ac1c-0c099f3ccae6/_result.png',
  'https://image.qwenlm.ai/generated-images/2ab539bc-1f75-4483-b3e5-4aec72efc844/_result.png',
  'https://image.qwenlm.ai/generated-images/f1cb6d5e-3a1a-4af5-82fd-1c7751b7b94a/_result.png',
  'https://image.qwenlm.ai/generated-images/ae7591e5-31a4-49de-8c3a-9eec171fc232/_result.png',
  'https://image.qwenlm.ai/generated-images/0e950246-2e50-4398-bf4d-ae48e21809ea/_result.png',
  'https://image.qwenlm.ai/generated-images/4c77f4f1-7bc5-47dd-b532-ced1ea7c7e32/_result.png',
];

export const seedProducts = [
  { id: 'p1', name: 'شورت مردانه نخی پریمیوم', category: 'underwear', subcategory: 'briefs', brand: 'تای سیز', price: 285000, discount: 15, rating: 4.5, image: productImages[0], book: ['underwear', 'briefs'], colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'سرمه‌ای', hex: '#1A2238' }, { name: 'خاکستری', hex: '#6b7280' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], stock: 45, sales: 230, isNew: true, effective: true, description: 'شورت مردانه از جنس نخ پنبه درجه یک با دوخت مقاوم و طراحی ارگونومیک. مناسب استفاده روزانه.', features: ['جنس نخ پنبه ۹۵٪', 'کش نرم و راحت', 'دوخت تقویت شده', 'قابل شستشو در ماشین'], specs: { 'جنس': 'نخ پنبه', 'نوع دوخت': 'ماشینی', 'کش': 'نرم سیلیکونی', 'ساخت': 'ایران' }, sku: 'TS-BR-001', commission: 8, vendor: 'تای سیز' },
  { id: 'p2', name: 'سوتین زنانه اسپرت بدون فنر', category: 'underwear', subcategory: 'bra', brand: 'تای سیز', price: 420000, discount: 20, rating: 4.7, image: productImages[1], book: ['underwear', 'bra'], colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'سفید', hex: '#ffffff' }, { name: 'صورتی', hex: '#f9a8d4' }], sizes: ['A', 'B', 'C', 'D'], stock: 32, sales: 185, isNew: false, effective: true, description: 'سوتین اسپرت بدون فنر با پشتیبانی عالی، مناسب ورزش و استفاده روزانه.', features: ['بدون فنر', 'پارچه تنفس‌پذیر', 'بندهای قابل تنظیم', 'پشتیبانی متوسط'], specs: { 'جنس': 'پلی‌استر/اسپندکس', 'نوع': 'اسپرت بدون فنر', 'سایزبندی': 'A تا D', 'ساخت': 'ایران' }, sku: 'TS-BR-002', commission: 8, vendor: 'تای سیز' },
  { id: 'p3', name: 'رکابی مردانه یقه گرد', category: 'underwear', subcategory: 'tank', brand: 'تای سیز', price: 195000, discount: 10, rating: 4.3, image: productImages[2], book: ['underwear', 'tank'], colors: [{ name: 'سفید', hex: '#ffffff' }, { name: 'مشکی', hex: '#1a1a1a' }, { name: 'طوسی', hex: '#9ca3af' }], sizes: ['M', 'L', 'XL', 'XXL'], stock: 60, sales: 310, isNew: false, effective: true, description: 'رکابی مردانه با یقه گرد و جنس نخ پنبه خنک، مناسب فصل گرما.', features: ['نخ پنبه ۱۰۰٪', 'یقه گرد کلاسیک', 'سبک و خنک', 'جذب عرق'], specs: { 'جنس': 'نخ پنبه', 'یقه': 'گرد', 'آستین': 'حلقه‌ای', 'ساخت': 'ایران' }, sku: 'TS-TK-001', commission: 8, vendor: 'تای سیز' },
  { id: 'p4', name: 'تی‌شرت مردانه طرح‌دار', category: 'tshirt', subcategory: 'tshirt-m', brand: 'نایک', price: 890000, discount: 25, rating: 4.8, image: productImages[3], book: ['tshirt', 'tshirt-m'], colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'سفید', hex: '#ffffff' }, { name: 'آبی', hex: '#3b82f6' }], sizes: ['S', 'M', 'L', 'XL'], stock: 28, sales: 420, isNew: true, effective: true, description: 'تی‌شرت مردانه با طرح مدرن و جنس درای‌فیت، مناسب ورزش و استفاده روزمره.', features: ['تکنولوژی درای‌فیت', 'چاپ دیجیتال مقاوم', 'دوخت فلت‌لاک', 'برش اسلیم‌فیت'], specs: { 'جنس': 'پلی‌استر درای‌فیت', 'یقه': 'گرد', 'برش': 'اسلیم‌فیت', 'ساخت': 'ترکیه' }, sku: 'NK-TS-001', commission: 10, vendor: '' },
  { id: 'p5', name: 'پیراهن مردانه آستین بلند کلاسیک', category: 'shirt', subcategory: 'shirt-m', brand: 'ایزادی', price: 1250000, discount: 30, rating: 4.6, image: productImages[4], book: ['shirt', 'shirt-m'], colors: [{ name: 'سفید', hex: '#ffffff' }, { name: 'آبی روشن', hex: '#93c5fd' }, { name: 'صورتی', hex: '#fda4af' }], sizes: ['S', 'M', 'L', 'XL', 'XXL'], stock: 15, sales: 180, isNew: false, effective: true, description: 'پیراهن مردانه رسمی با پارچه تترون درجه یک، مناسب محیط کار و مجالس.', features: ['پارچه تترون مرغوب', 'دکمه‌های صدفی', 'یقه کلاسیک', 'اتوکشی آسان'], specs: { 'جنس': 'تترون', 'یقه': 'کلاسیک', 'آستین': 'بلند', 'ساخت': 'ایران' }, sku: 'IZ-SH-001', commission: 12, vendor: '' },
  { id: 'p6', name: 'دمپایی ابری مردانه', category: 'slipper', subcategory: 'slipper-m', brand: 'کروکس', price: 350000, discount: 0, rating: 4.4, image: productImages[5], book: ['slipper', 'slipper-m'], colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'قهوه‌ای', hex: '#78350f' }, { name: 'سبز', hex: '#166534' }], sizes: ['40', '41', '42', '43', '44'], stock: 50, sales: 290, isNew: false, effective: true, description: 'دمپایی ابری فوق‌العاده سبک و راحت با زیره ضد لغزش.', features: ['فوم حافظه‌دار', 'ضد لغزش', 'فوق سبک', 'قابل شستشو'], specs: { 'جنس زیره': 'EVA', 'رویه': 'فوم', 'ضد لغزش': 'بله', 'ساخت': 'چین' }, sku: 'CR-SL-001', commission: 8, vendor: '' },
  { id: 'p7', name: 'صندل زنانه تابستانی', category: 'sandal', subcategory: 'sandal-w', brand: 'اسکچرز', price: 780000, discount: 15, rating: 4.5, image: productImages[6], book: ['sandal', 'sandal-w'], colors: [{ name: 'عسلی', hex: '#d97706' }, { name: 'مشکی', hex: '#1a1a1a' }, { name: 'صورتی', hex: '#ec4899' }], sizes: ['36', '37', '38', '39', '40'], stock: 22, sales: 155, isNew: true, effective: true, description: 'صندل زنانه تابستانی با کفی طبی و طراحی شیک.', features: ['کفی طبی', 'بندهای قابل تنظیم', 'زیره ضد لغزش', 'سبک و راحت'], specs: { 'جنس': 'چرم مصنوعی', 'کفی': 'طبی', 'پاشنه': '۲ سانتی', 'ساخت': 'ویتنام' }, sku: 'SK-SD-001', commission: 10, vendor: '' },
  { id: 'p8', name: 'جوراب مردانه ساق‌دار (۳ جفت)', category: 'socks', subcategory: 'socks-m', brand: 'تای سیز', price: 165000, discount: 10, rating: 4.2, image: productImages[7], book: ['socks', 'socks-m'], colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'سرمه‌ای', hex: '#1e3a5f' }, { name: 'طوسی', hex: '#6b7280' }], sizes: ['39-42', '42-45'], stock: 80, sales: 520, isNew: false, effective: true, description: 'بسته ۳ جفتی جوراب مردانه ساق‌دار از جنس نخ بامبو با خاصیت ضد باکتری.', features: ['نخ بامبو', 'ضد باکتری', 'کش نرم', 'بسته ۳ جفتی'], specs: { 'جنس': 'بامبو/پنبه', 'ساق': 'متوسط', 'تعداد': '۳ جفت', 'ساخت': 'ایران' }, sku: 'TS-SK-001', commission: 8, vendor: 'تای سیز' },
  { id: 'p9', name: 'تی‌شرت زنانه یقه هفت', category: 'tshirt', subcategory: 'tshirt-w', brand: 'آدیداس', price: 750000, discount: 20, rating: 4.6, image: productImages[8], book: ['tshirt', 'tshirt-w'], colors: [{ name: 'سفید', hex: '#ffffff' }, { name: 'مشکی', hex: '#1a1a1a' }, { name: 'یاسی', hex: '#c4b5fd' }], sizes: ['S', 'M', 'L', 'XL'], stock: 35, sales: 380, isNew: true, effective: true, description: 'تی‌شرت زنانه با یقه هفت و برش زنانه، جنس نخ پنبه نرم.', features: ['یقه هفت', 'برش زنانه', 'نخ پنبه', 'چاپ سیلک'], specs: { 'جنس': 'نخ پنبه', 'یقه': 'هفت', 'برش': 'زنانه', 'ساخت': 'بنگلادش' }, sku: 'AD-TS-001', commission: 10, vendor: '' },
  { id: 'p10', name: 'شورت زنانه بیکینی', category: 'underwear', subcategory: 'briefs', brand: 'تای سیز', price: 195000, discount: 12, rating: 4.4, image: productImages[9], book: ['underwear', 'briefs'], colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'سفید', hex: '#ffffff' }, { name: 'قرمز', hex: '#dc2626' }, { name: 'صورتی', hex: '#f9a8d4' }], sizes: ['S', 'M', 'L', 'XL'], stock: 55, sales: 440, isNew: false, effective: true, description: 'شورت زنانه مدل بیکینی با جنس میکروفایبر نرم و کشی راحت.', features: ['میکروفایبر', 'بدون درز', 'کش پهن', 'رنگ‌بندی متنوع'], specs: { 'جنس': 'میکروفایبر', 'مدل': 'بیکینی', 'درز': 'ندارد', 'ساخت': 'ایران' }, sku: 'TS-BR-003', commission: 8, vendor: 'تای سیز' },
];

export const seedArticles = [
  { id: 'a1', title: 'راهنمای انتخاب سایز لباس زیر', summary: 'چگونه سایز مناسب شورت و سوتین خود را پیدا کنیم', cat: 'راهنمای خرید', readTime: '۵ دقیقه', date: '۱۴۰۳/۰۹/۱۵', colors: ['#667eea', '#764ba2'], target: '', image: '', content: '## انتخاب سایز صحیح\n\nانتخاب سایز مناسب لباس زیر بسیار مهم است. در این مقاله به شما کمک می‌کنیم.\n\n### اندازه‌گیری دور سینه\nبرای اندازه‌گیری دور سینه، متر را در پهن‌ترین بخش سینه قرار دهید.\n\n### محاسبه سایز کاپ\nتفاوت بین دور سینه و زیر سینه را محاسبه کنید:\n- ۱۰-۱۲ سانتی‌متر: کاپ A\n- ۱۲-۱۴ سانتی‌متر: کاپ B\n- ۱۴-۱۶ سانتی‌متر: کاپ C', views: 1250, tags: ['لباس زیر', 'سایزبندی', 'راهنما'] },
  { id: 'a2', title: 'ترندهای پوشاک زمستان ۱۴۰۳', summary: 'جدیدترین مد‌ها و رنگ‌های فصل سرد', cat: 'مد و فشن', readTime: '۷ دقیقه', date: '۱۴۰۳/۰۹/۲۰', colors: ['#f093fb', '#f5576c'], target: '', image: '', content: '## ترندهای زمستان ۱۴۰۳\n\nامسال رنگ‌های گرم و بافت‌های درشت مد شده‌اند.\n\n### پالتوهای اورسایز\nپالتوهای اورسایز با برش آزاد، یکی از محبوب‌ترین ترندهای امسال هستند.', views: 890, tags: ['ترند', 'زمستان', 'مد'] },
  { id: 'a3', title: 'مراقبت از لباس‌های ظریف', summary: 'نکات شستشو و نگهداری لباس زیر و لباس‌های حساس', cat: 'نگهداری', readTime: '۴ دقیقه', date: '۱۴۰۳/۰۸/۱۰', colors: ['#4facfe', '#00f2fe'], target: '', image: '', content: '## شستشوی صحیح لباس‌های ظریف\n\n### شستشو با دست\nاز آب ولرم و شوینده ملایم استفاده کنید.\n\n### خشک کردن\nاز خشک‌کن استفاده نکنید؛ لباس‌ها را در سایه خشک کنید.', views: 650, tags: ['نگهداری', 'شستشو', 'لباس زیر'] },
];

export const seedReviews = [
  { id: 'r1', productId: 'p1', author: 'علی محمدی', rating: 5, text: 'کیفیت عالی و بسیار راحت. حتماً دوباره خرید می‌کنم.', pros: ['کیفیت بالا', 'راحت'], cons: [], status: 'approved', date: '۱۴۰۳/۰۹/۱۰' },
  { id: 'r2', productId: 'p2', author: 'مریم احمدی', rating: 4, text: 'خیلی خوبه ولی سایزبندی کمی کوچک است.', pros: ['جنس خوب', 'طراحی زیبا'], cons: ['سایز کوچک'], status: 'approved', date: '۱۴۰۳/۰۹/۰۸' },
  { id: 'r3', productId: 'p4', author: 'رضا کریمی', rating: 5, text: 'بهترین تی‌شرت ورزشی که تا حالا خریدم.', pros: ['سبک', 'تنفس‌پذیر', 'طراحی عالی'], cons: [], status: 'approved', date: '۱۴۰۳/۰۹/۰۵' },
];

export const seedDiscountCodes = [
  { id: 'dc1', code: 'SOUQ10', type: 'percent', value: 10, maxUses: 100, usedCount: 0, expiresAt: '2027-03-20', active: true },
  { id: 'dc2', code: 'FALL500', type: 'fixed', value: 500000, maxUses: 50, usedCount: 0, expiresAt: '2027-02-28', active: true },
  { id: 'dc3', code: 'WELCOME15', type: 'percent', value: 15, maxUses: 200, usedCount: 0, expiresAt: '2027-06-30', active: true },
];

export const seedSettings = {
  storeName: 'تای سیز', phone: '۰۲۱-۸۸۷۷۶۶۵۵', email: 'info@tasis.ir',
  address: 'تهران، خیابان ولیعصر، مجتمع تجاری تای سیز',
  freeShippingThreshold: 1500000, shippingCost: 45000,
  vatRate: 9, levyRate: 0, gatewayFee: 1.5, packagingCost: 3000,
  showPricesWithTax: false, maintenance: false,
  tickerTexts: ['ارسال رایگان برای خرید بالای ۱.۵ میلیون تومان', 'تخفیف ویژه لباس زیر تا ۳۰٪', 'ضمانت اصالت و بازگشت ۷ روزه'],
  logo: '', banners: [],
};

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const seedTickets = [
  { id: 'tk1', customer: 'علی محمدی', mobile: '09121111111', subject: 'مشکل در سایز', message: 'سایز M کوچک بود', status: 'open', priority: 'high', assignee: 'پشتیبانی ۱', replies: [{ from: 'customer', text: 'سایز M کوچک بود، لطفاً تعویض کنید', date: daysAgo(1) }, { from: 'support', text: 'درخواست تعویض ثبت شد', date: daysAgo(0) }], createdAt: daysAgo(1) },
  { id: 'tk2', customer: 'مریم احمدی', mobile: '09122222222', subject: 'پیگیری سفارش', message: 'سفارش من کی ارسال می‌شود؟', status: 'answered', priority: 'medium', assignee: 'پشتیبانی ۲', replies: [{ from: 'customer', text: 'سفارش من کی ارسال می‌شود؟', date: daysAgo(3) }, { from: 'support', text: 'سفارش شما فردا ارسال می‌شود', date: daysAgo(2) }], createdAt: daysAgo(3) },
  { id: 'tk3', customer: 'رضا کریمی', mobile: '09123333333', subject: 'درخواست مرجوعی', message: 'می‌خواهم کالا را مرجوع کنم', status: 'pending', priority: 'low', assignee: '', replies: [], createdAt: daysAgo(0) },
];

export const seedCarriers = [
  { id: 'cr1', name: 'پست پیشتاز', baseCost: 35000, deliveryDays: '۳-۵ روز', active: true },
  { id: 'cr2', name: 'تیپاکس', baseCost: 55000, deliveryDays: '۱-۲ روز', active: true },
  { id: 'cr3', name: 'باربری تای سیز', baseCost: 25000, deliveryDays: '۲-۴ روز', active: false },
];

export const seedVendors = [
  { id: 'v1', name: 'تولیدی تای سیز', legalName: 'شرکت تای سیز', iban: 'IR0123456789', phone: '02188776655', fee: 8, active: true, totalSales: 45000000, totalItems: 1200, totalOrders: 350, balance: 3500000 },
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
  { id: 'cmp1', name: 'تخفیف پلکانی زمستانه', type: 'tiered', config: { tiers: [{ min: 1000000, discount: 12 }, { min: 2000000, discount: 18 }] }, uses: 0, active: false },
  { id: 'cmp2', name: 'یکی بخر یکی ببر', type: 'bogo', config: {}, uses: 0, active: false },
  { id: 'cmp3', name: 'ارسال رایگان عید', type: 'freeship', config: {}, uses: 0, active: false },
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
  { id: 'st1', term: 'شورت مردانه', count: 245, trending: true },
  { id: 'st2', term: 'سوتین اسپرت', count: 189, trending: true },
  { id: 'st3', term: 'تی‌شرت نایک', count: 156, trending: false },
  { id: 'st4', term: 'دمپایی ابری', count: 134, trending: true },
  { id: 'st5', term: 'جوراب بامبو', count: 98, trending: false },
  { id: 'st6', term: 'پیراهن مردانه', count: 87, trending: false },
];

export const seedPages = [
  { id: 'pg1', slug: 'about', title: 'درباره تای سیز', content: '## فروشگاه تای سیز\n\nتای سیز با سالها تجربه در تولید و فروش پوشاک...', metaTitle: 'درباره ما - تای سیز', metaDesc: 'آشنایی با فروشگاه تای سیز', keywords: 'تای سیز, درباره ما', published: true },
  { id: 'pg2', slug: 'contact', title: 'تماس با ما', content: '## اطلاعات تماس\n\n- تلفن: ۰۲۱-۸۸۷۷۶۶۵۵\n- ایمیل: info@tasis.ir\n- آدرس: تهران، خیابان ولیعصر', metaTitle: 'تماس با تای سیز', metaDesc: 'راه‌های ارتباطی با فروشگاه تای سیز', keywords: 'تماس, آدرس, تلفن', published: true },
  { id: 'pg3', slug: 'terms', title: 'قوانین و مقررات', content: '## قوانین فروشگاه\n\n۱. تمامی محصولات دارای ضمانت اصالت هستند.\n۲. امکان بازگشت تا ۷ روز وجود دارد.', metaTitle: 'قوانین - تای سیز', metaDesc: 'قوانین و مقررات استفاده از فروشگاه تای سیز', keywords: 'قوانین, مقررات', published: true },
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
  { id: 'aut1', name: 'خوش‌آمدگویی مشتری جدید', event: 'register', channel: 'sms', template: 'سلام {name}! به تای سیز خوش آمدید.', active: false, sent: 0 },
  { id: 'aut2', name: 'یادآوری سبد رها شده', event: 'abandoned_cart', channel: 'sms', template: 'سبد خرید شما منتظر است! کد تخفیف: CART10', active: false, sent: 0 },
  { id: 'aut3', name: 'تبریک تولد', event: 'birthday', channel: 'sms', template: 'تولدتان مبارک! هدیه ویژه تای سیز برای شما', active: false, sent: 0 },
];

export const seedLoyalty = {
  pointsPerThousand: 1, pointValue: 100, redemptionCapPercent: 10,
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

export const seedAffiliates = [
  { id: 'af1', name: 'سارا موسوی', username: 'sara_m', mobile: '09121234567', refCode: 'SARA20', level: 'gold', clicks: 1250, orders: 45, sales: 12500000, commission: 1250000, active: true, flagged: false },
  { id: 'af2', name: 'امیر جعفری', username: 'amir_j', mobile: '09131234567', refCode: 'AMIR15', level: 'silver', clicks: 800, orders: 22, sales: 6800000, commission: 680000, active: true, flagged: false },
  { id: 'af3', name: 'ناشناس', username: 'unknown_x', mobile: '09141234567', refCode: 'UNK50', level: 'platinum', clicks: 3500, orders: 2, sales: 400000, commission: 40000, active: true, flagged: false },
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
