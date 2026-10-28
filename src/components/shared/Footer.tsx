import { useShop } from '../../context/ShopContext';
import { faNum } from '../../utils/format';
import { IconMail, IconPhone, IconMapPin } from '../Icons';

export default function Footer() {
  const { settings } = useShop();
  return (
    <footer className="bg-brand-950 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><span className="font-display text-sm">ت</span></div><span className="font-display text-lg">{settings.storeName || 'تای سیز'}</span></div>
          <p className="text-[12px] text-brand-300 leading-6">فروشگاه آنلاین پوشاک تای سیز با سال‌ها تجربه در تولید و فروش انواع پوشاک با کیفیت.</p>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">دسترسی سریع</h4>
          <ul className="space-y-2 text-[12px] text-brand-300"><li>صفحه اصلی</li><li>فروشگاه</li><li>مجله</li><li>درباره ما</li><li>تماس با ما</li></ul>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">خدمات مشتریان</h4>
          <ul className="space-y-2 text-[12px] text-brand-300"><li>راهنمای خرید</li><li>رویه بازگشت</li><li>قوانین و مقررات</li><li>حریم خصوصی</li></ul>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">ارتباط با ما</h4>
          <div className="space-y-2 text-[12px] text-brand-300">
            <p className="flex items-center gap-2"><IconPhone className="w-4 h-4" />{settings.phone}</p>
            <p className="flex items-center gap-2"><IconMail className="w-4 h-4" />{settings.email}</p>
            <p className="flex items-center gap-2"><IconMapPin className="w-4 h-4" />{settings.address}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-[11px] text-brand-400">تمامی حقوق محفوظ است | فروشگاه تای سیز {faNum(new Date().getFullYear())}</div>
    </footer>
  );
}
