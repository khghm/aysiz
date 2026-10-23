export interface Product {
  id: string; name: string; category: string; subcategory: string; brand: string;
  price: number; discount: number; rating: number; image: string; book: string[];
  colors: { name: string; hex: string }[]; sizes: string[]; stock: number;
  sales: number; isNew: boolean; effective: boolean; description: string;
  features: string[]; specs: Record<string, string>; sku: string;
  commission: number; vendor: string; metaTitle?: string; metaDesc?: string; metaKeywords?: string;
  reviews?: Review[];
}

export interface Category {
  id: string; name: string; icon: string; subs: { id: string; name: string }[];
}

export interface Review {
  id: string; productId: string; author: string; rating: number; text: string;
  pros: string[]; cons: string[]; status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export interface Article {
  id: string; title: string; summary: string; cat: string; readTime: string;
  date: string; colors: string[]; target: string; content: string; views: number;
  tags: string[];
}

export const categories: Category[] = [
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

export const brands = [
  'تاسیز', 'نایک', 'آدیداس', 'پوما', 'ریباک', 'آندرآرمور', 'کاترپیلار', 'نیوبالانس', 'اسکچرز', 'کروکس', 'ایزادی', 'هوپ'
];

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #f5576c 0%, #ff6f91 100%)',
  'linear-gradient(135deg, #c3cfe2 0%, #f5f7fa 100%)',
  'linear-gradient(135deg, #667eea 0%, #f093fb 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
];

export const seedProducts: Product[] = [
  {
    id: 'p1', name: 'شورت مردانه نخی پریمیوم', category: 'underwear', subcategory: 'briefs', brand: 'تاسیز',
    price: 285000, discount: 15, rating: 4.5, image: gradients[0], book: ['underwear', 'briefs'],
    colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'سرمه‌ای', hex: '#1A2238' }, { name: 'خاکستری', hex: '#6b7280' }],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'], stock: 45, sales: 230, isNew: true, effective: true,
    description: 'شورت مردانه از جنس نخ پنبه درجه یک با دوخت مقاوم و طراحی ارگونومیک. مناسب استفاده روزانه.',
    features: ['جنس نخ پنبه ۹۵٪', 'کش نرم و راحت', 'دوخت تقویت شده', 'قابل شستشو در ماشین'],
    specs: { 'جنس': 'نخ پنبه', 'نوع دوخت': 'ماشینی', 'کش': 'نرم سیلیکونی', 'ساخت': 'ایران' },
    sku: 'TS-BR-001', commission: 8, vendor: 'تاسیز'
  },
  {
    id: 'p2', name: 'سوتین زنانه اسپرت بدون فنر', category: 'underwear', subcategory: 'bra', brand: 'تاسیز',
    price: 420000, discount: 20, rating: 4.7, image: gradients[1], book: ['underwear', 'bra'],
    colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'سفید', hex: '#ffffff' }, { name: 'صورتی', hex: '#f9a8d4' }],
    sizes: ['A', 'B', 'C', 'D'], stock: 32, sales: 185, isNew: false, effective: true,
    description: 'سوتین اسپرت بدون فنر با پشتیبانی عالی، مناسب ورزش و استفاده روزانه.',
    features: ['بدون فنر', 'پارچه تنفس‌پذیر', 'بندهای قابل تنظیم', 'پشتیبانی متوسط'],
    specs: { 'جنس': 'پلی‌استر/اسپندکس', 'نوع': 'اسپرت بدون فنر', 'سایزبندی': 'A تا D', 'ساخت': 'ایران' },
    sku: 'TS-BR-002', commission: 8, vendor: 'تاسیز'
  },
  {
    id: 'p3', name: 'رکابی مردانه یقه گرد', category: 'underwear', subcategory: 'tank', brand: 'تاسیز',
    price: 195000, discount: 10, rating: 4.3, image: gradients[2], book: ['underwear', 'tank'],
    colors: [{ name: 'سفید', hex: '#ffffff' }, { name: 'مشکی', hex: '#1a1a1a' }, { name: 'طوسی', hex: '#9ca3af' }],
    sizes: ['M', 'L', 'XL', 'XXL'], stock: 60, sales: 310, isNew: false, effective: true,
    description: 'رکابی مردانه با یقه گرد و جنس نخ پنبه خنک، مناسب فصل گرما.',
    features: ['نخ پنبه ۱۰۰٪', 'یقه گرد کلاسیک', 'سبک و خنک', 'جذب عرق'],
    specs: { 'جنس': 'نخ پنبه', 'یقه': 'گرد', 'آستین': 'حلقه‌ای', 'ساخت': 'ایران' },
    sku: 'TS-TK-001', commission: 8, vendor: 'تاسیز'
  },
  {
    id: 'p4', name: 'تی‌شرت مردانه طرح‌دار', category: 'tshirt', subcategory: 'tshirt-m', brand: 'نایک',
    price: 890000, discount: 25, rating: 4.8, image: gradients[3], book: ['tshirt', 'tshirt-m'],
    colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'سفید', hex: '#ffffff' }, { name: 'آبی', hex: '#3b82f6' }],
    sizes: ['S', 'M', 'L', 'XL'], stock: 28, sales: 420, isNew: true, effective: true,
    description: 'تی‌شرت مردانه با طرح مدرن و جنس درای‌فیت، مناسب ورزش و استفاده روزمره.',
    features: ['تکنولوژی درای‌فیت', 'چاپ دیجیتال مقاوم', 'دوخت فلت‌لاک', 'برش اسلیم‌فیت'],
    specs: { 'جنس': 'پلی‌استر درای‌فیت', 'یقه': 'گرد', 'برش': 'اسلیم‌فیت', 'ساخت': 'ترکیه' },
    sku: 'NK-TS-001', commission: 10, vendor: ''
  },
  {
    id: 'p5', name: 'پیراهن مردانه آستین بلند کلاسیک', category: 'shirt', subcategory: 'shirt-m', brand: 'ایزادی',
    price: 1250000, discount: 30, rating: 4.6, image: gradients[4], book: ['shirt', 'shirt-m'],
    colors: [{ name: 'سفید', hex: '#ffffff' }, { name: 'آبی روشن', hex: '#93c5fd' }, { name: 'صورتی', hex: '#fda4af' }],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'], stock: 15, sales: 180, isNew: false, effective: true,
    description: 'پیراهن مردانه رسمی با پارچه تترون درجه یک، مناسب محیط کار و مجالس.',
    features: ['پارچه تترون مرغوب', 'دکمه‌های صدفی', 'یقه کلاسیک', 'اتوکشی آسان'],
    specs: { 'جنس': 'تترون', 'یقه': 'کلاسیک', 'آستین': 'بلند', 'ساخت': 'ایران' },
    sku: 'IZ-SH-001', commission: 12, vendor: ''
  },
  {
    id: 'p6', name: 'دمپایی ابری مردانه', category: 'slipper', subcategory: 'slipper-m', brand: 'کروکس',
    price: 350000, discount: 0, rating: 4.4, image: gradients[5], book: ['slipper', 'slipper-m'],
    colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'قهوه‌ای', hex: '#78350f' }, { name: 'سبز', hex: '#166534' }],
    sizes: ['40', '41', '42', '43', '44'], stock: 50, sales: 290, isNew: false, effective: true,
    description: 'دمپایی ابری فوق‌العاده سبک و راحت با زیره ضد لغزش.',
    features: ['فوم حافظه‌دار', 'ضد لغزش', 'فوق سبک', 'قابل شستشو'],
    specs: { 'جنس زیره': 'EVA', 'رویه': 'فوم', 'ضد لغزش': 'بله', 'ساخت': 'چین' },
    sku: 'CR-SL-001', commission: 8, vendor: ''
  },
  {
    id: 'p7', name: 'صندل زنانه تابستانی', category: 'sandal', subcategory: 'sandal-w', brand: 'اسکچرز',
    price: 780000, discount: 15, rating: 4.5, image: gradients[6], book: ['sandal', 'sandal-w'],
    colors: [{ name: 'عسلی', hex: '#d97706' }, { name: 'مشکی', hex: '#1a1a1a' }, { name: 'صورتی', hex: '#ec4899' }],
    sizes: ['36', '37', '38', '39', '40'], stock: 22, sales: 155, isNew: true, effective: true,
    description: 'صندل زنانه تابستانی با کفی طبی و طراحی شیک.',
    features: ['کفی طبی', 'بندهای قابل تنظیم', 'زیره ضد لغزش', 'سبک و راحت'],
    specs: { 'جنس': 'چرم مصنوعی', 'کفی': 'طبی', 'پاشنه': '۲ سانتی', 'ساخت': 'ویتنام' },
    sku: 'SK-SD-001', commission: 10, vendor: ''
  },
  {
    id: 'p8', name: 'جوراب مردانه ساق‌دار (۳ جفت)', category: 'socks', subcategory: 'socks-m', brand: 'تاسیز',
    price: 165000, discount: 10, rating: 4.2, image: gradients[7], book: ['socks', 'socks-m'],
    colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'سرمه‌ای', hex: '#1e3a5f' }, { name: 'طوسی', hex: '#6b7280' }],
    sizes: ['39-42', '42-45'], stock: 80, sales: 520, isNew: false, effective: true,
    description: 'بسته ۳ جفتی جوراب مردانه ساق‌دار از جنس نخ بامبو با خاصیت ضد باکتری.',
    features: ['نخ بامبو', 'ضد باکتری', 'کش نرم', 'بسته ۳ جفتی'],
    specs: { 'جنس': 'بامبو/پنبه', 'ساق': 'متوسط', 'تعداد': '۳ جفت', 'ساخت': 'ایران' },
    sku: 'TS-SK-001', commission: 8, vendor: 'تاسیز'
  },
  {
    id: 'p9', name: 'تی‌شرت زنانه یقه هفت', category: 'tshirt', subcategory: 'tshirt-w', brand: 'آدیداس',
    price: 750000, discount: 20, rating: 4.6, image: gradients[8], book: ['tshirt', 'tshirt-w'],
    colors: [{ name: 'سفید', hex: '#ffffff' }, { name: 'مشکی', hex: '#1a1a1a' }, { name: 'یاسی', hex: '#c4b5fd' }],
    sizes: ['S', 'M', 'L', 'XL'], stock: 35, sales: 380, isNew: true, effective: true,
    description: 'تی‌شرت زنانه با یقه هفت و برش زنانه، جنس نخ پنبه نرم.',
    features: ['یقه هفت', 'برش زنانه', 'نخ پنبه', 'چاپ سیلک'],
    specs: { 'جنس': 'نخ پنبه', 'یقه': 'هفت', 'برش': 'زنانه', 'ساخت': 'بنگلادش' },
    sku: 'AD-TS-001', commission: 10, vendor: ''
  },
  {
    id: 'p10', name: 'شورت زنانه بیکینی', category: 'underwear', subcategory: 'briefs', brand: 'تاسیز',
    price: 195000, discount: 12, rating: 4.4, image: gradients[9], book: ['underwear', 'briefs'],
    colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'سفید', hex: '#ffffff' }, { name: 'قرمز', hex: '#dc2626' }, { name: 'صورتی', hex: '#f9a8d4' }],
    sizes: ['S', 'M', 'L', 'XL'], stock: 55, sales: 440, isNew: false, effective: true,
    description: 'شورت زنانه مدل بیکینی با جنس میکروفایبر نرم و کشی راحت.',
    features: ['میکروفایبر', 'بدون درز', 'کش پهن', 'رنگ‌بندی متنوع'],
    specs: { 'جنس': 'میکروفایبر', 'مدل': 'بیکینی', 'درز': 'ندارد', 'ساخت': 'ایران' },
    sku: 'TS-BR-003', commission: 8, vendor: 'تاسیز'
  },
  {
    id: 'p11', name: 'پیراهن زنانه گل‌دار', category: 'shirt', subcategory: 'shirt-w', brand: 'هوپ',
    price: 980000, discount: 18, rating: 4.7, image: gradients[10], book: ['shirt', 'shirt-w'],
    colors: [{ name: 'آبی گل‌دار', hex: '#60a5fa' }, { name: 'صورتی گل‌دار', hex: '#f9a8d4' }],
    sizes: ['S', 'M', 'L', 'XL'], stock: 18, sales: 210, isNew: true, effective: true,
    description: 'پیراهن زنانه با طرح گل‌دار و جنس حریر نرم، مناسب مهمانی و استفاده روزانه.',
    features: ['طرح گل‌دار', 'جنس حریر', 'آستین پفی', 'قد تا زانو'],
    specs: { 'جنس': 'حریر', 'طرح': 'گل‌دار', 'قد': 'تا زانو', 'ساخت': 'ایران' },
    sku: 'HP-SH-001', commission: 12, vendor: ''
  },
  {
    id: 'p12', name: 'جوراب زنانه ساق‌بلند (۲ جفت)', category: 'socks', subcategory: 'socks-w', brand: 'تاسیز',
    price: 145000, discount: 5, rating: 4.1, image: gradients[11], book: ['socks', 'socks-w'],
    colors: [{ name: 'مشکی', hex: '#1a1a1a' }, { name: 'سفید', hex: '#ffffff' }, { name: 'طوسی', hex: '#9ca3af' }],
    sizes: ['36-39', '39-42'], stock: 70, sales: 350, isNew: false, effective: true,
    description: 'بسته ۲ جفتی جوراب زنانه ساق‌بلند با طرح ساده و جنس نخ پنبه.',
    features: ['نخ پنبه', 'ساق بلند', 'کش نرم', 'بسته ۲ جفتی'],
    specs: { 'جنس': 'نخ پنبه', 'ساق': 'بلند', 'تعداد': '۲ جفت', 'ساخت': 'ایران' },
    sku: 'TS-SK-002', commission: 8, vendor: 'تاسیز'
  },
];

export const seedArticles: Article[] = [
  { id: 'a1', title: 'راهنمای انتخاب سایز لباس زیر', summary: 'چگونه سایز مناسب شورت و سوتین خود را پیدا کنیم', cat: 'راهنمای خرید', readTime: '۵ دقیقه', date: '۱۴۰۳/۰۹/۱۵', colors: ['#667eea', '#764ba2'], target: '', content: '## انتخاب سایز صحیح\n\nانتخاب سایز مناسب لباس زیر بسیار مهم است. در این مقاله به شما کمک می‌کنیم.\n\n- اندازه‌گیری دور سینه\n- اندازه‌گیری زیر سینه\n- محاسبه سایز کاپ\n- انتخاب سایز شورت', views: 1250, tags: ['لباس زیر', 'سایزبندی', 'راهنما'] },
  { id: 'a2', title: 'ترندهای پوشاک زمستان ۱۴۰۳', summary: 'جدیدترین مد‌ها و رنگ‌های فصل سرد', cat: 'مد و فشن', readTime: '۷ دقیقه', date: '۱۴۰۳/۰۹/۲۰', colors: ['#f093fb', '#f5576c'], target: '', content: '## ترندهای زمستان\n\nامسال رنگ‌های گرم و بافت‌های درشت مد شده‌اند.\n\n- پالتوهای اورسایز\n- بافت‌های درشت\n- رنگ‌های خاکی و کرم', views: 890, tags: ['ترند', 'زمستان', 'مد'] },
  { id: 'a3', title: 'مراقبت از لباس‌های ظریف', summary: 'نکات شستشو و نگهداری لباس زیر و لباس‌های حساس', cat: 'نگهداری', readTime: '۴ دقیقه', date: '۱۴۰۳/۰۸/۱۰', colors: ['#4facfe', '#00f2fe'], target: '', content: '## شستشوی صحیح\n\n- شستشو با دست ترجیح داده شود\n- از آب سرد استفاده کنید\n- از خشک‌کن استفاده نکنید', views: 650, tags: ['نگهداری', 'شستشو', 'لباس زیر'] },
];

export const seedReviews: Review[] = [
  { id: 'r1', productId: 'p1', author: 'علی محمدی', rating: 5, text: 'کیفیت عالی و بسیار راحت. حتماً دوباره خرید می‌کنم.', pros: ['کیفیت بالا', 'راحت'], cons: [], status: 'approved', date: '۱۴۰۳/۰۹/۱۰' },
  { id: 'r2', productId: 'p2', author: 'مریم احمدی', rating: 4, text: 'خیلی خوبه ولی سایزبندی کمی کوچک است.', pros: ['جنس خوب', 'طراحی زیبا'], cons: ['سایز کوچک'], status: 'approved', date: '۱۴۰۳/۰۹/۰۸' },
  { id: 'r3', productId: 'p4', author: 'رضا کریمی', rating: 5, text: 'بهترین تی‌شرت ورزشی که تا حالا خریدم.', pros: ['سبک', 'تنفس‌پذیر', 'طراحی عالی'], cons: [], status: 'approved', date: '۱۴۰۳/۰۹/۰۵' },
  { id: 'r4', productId: 'p5', author: 'حسن رضایی', rating: 3, text: 'کیفیت خوب ولی قیمت بالاست.', pros: ['پارچه مرغوب'], cons: ['قیمت بالا', 'چروک‌پذیری'], status: 'pending', date: '۱۴۰۳/۰۹/۱۲' },
  { id: 'r5', productId: 'p9', author: 'سارا نوری', rating: 5, text: 'عالی! دقیقاً مثل عکسش بود.', pros: ['رنگ ثابت', 'جنس نرم'], cons: [], status: 'pending', date: '۱۴۰۳/۰۹/۱۴' },
];
