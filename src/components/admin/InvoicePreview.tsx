import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, finalPrice, faNum, faDateFull } from '../../utils/format';

export default function InvoicePreview({ invoice }: { invoice: any }) {
  const { orders } = useAdmin();
  const { settings } = useShop();
  const order = orders.find((o: any) => o.id === invoice.orderId);

  return (
    <div className="border border-cream-300 rounded-xl p-6 bg-white">
      <div className="flex justify-between items-start border-b-2 border-brand-900 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-brand-900 mb-2">فروشگاه اینترنتی پوشاک تای سیز</h2>
          <div className="text-[11px] text-cream-500 space-y-1">
            <p>تلفن: {settings.phone}</p>
            <p>ایمیل: {settings.email}</p>
            <p>آدرس: {settings.address}</p>
          </div>
        </div>
        <div className="text-left">
          <h3 className="text-lg font-bold text-brand-900 mb-2">فاکتور فروش</h3>
          <p className="text-[12px] text-cream-500">شماره: {invoice.number}</p>
          <p className="text-[12px] text-cream-500">تاریخ: {faDateFull(new Date(invoice.date))}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {invoice.status === 'paid' ? 'پرداخت شده' : 'در انتظار پرداخت'}
          </span>
        </div>
      </div>

      <div className="bg-cream-50 rounded-xl p-4 mb-6">
        <h4 className="text-[12px] font-bold text-brand-900 mb-2">مشخصات مشتری</h4>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div><span className="text-cream-500">نام: </span>{invoice.customer}</div>
          <div><span className="text-cream-500">موبایل: </span>{order?.mobile || '-'}</div>
          <div><span className="text-cream-500">شهر: </span>{order?.city || '-'}</div>
          <div><span className="text-cream-500">آدرس: </span>{order?.address || '-'}</div>
        </div>
      </div>

      <table className="w-full text-[11px] mb-6">
        <thead>
          <tr className="bg-brand-900 text-white">
            <th className="py-2 px-2 text-right">ردیف</th>
            <th className="py-2 px-2 text-right">شرح کالا</th>
            <th className="py-2 px-2 text-right">تعداد</th>
            <th className="py-2 px-2 text-right">قیمت واحد</th>
            <th className="py-2 px-2 text-right">تخفیف</th>
            <th className="py-2 px-2 text-right">قیمت نهایی</th>
          </tr>
        </thead>
        <tbody>
          {order?.items?.map((item: any, idx: number) => {
            const finalPrice = item.price * (1 - item.discount / 100);
            const totalPrice = finalPrice * item.qty;
            return (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-cream-50' : 'bg-white'}>
                <td className="py-2 px-2">{faNum(idx + 1)}</td>
                <td className="py-2 px-2">{item.name}</td>
                <td className="py-2 px-2 tnum">{faNum(item.qty)}</td>
                <td className="py-2 px-2 tnum">{formatPrice(item.price)}</td>
                <td className="py-2 px-2 tnum">{faNum(item.discount)}٪</td>
                <td className="py-2 px-2 tnum font-bold">{formatPrice(totalPrice)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="space-y-2 text-[12px]">
        <div className="flex justify-between py-1 border-b border-cream-200">
          <span>جمع کل:</span>
          <span className="tnum">{formatPrice(order?.subtotal || 0)} تومان</span>
        </div>
        <div className="flex justify-between py-1 border-b border-cream-200">
          <span>تخفیف:</span>
          <span className="tnum text-coral-600">-{formatPrice(order?.discountAmount || 0)} تومان</span>
        </div>
        <div className="flex justify-between py-1 border-b border-cream-200">
          <span>هزینه ارسال:</span>
          <span className="tnum">{formatPrice(order?.shipping || 0)} تومان</span>
        </div>
        <div className="flex justify-between py-1 border-b border-cream-200">
          <span>مالیات و عوارض:</span>
          <span className="tnum">{formatPrice(order?.tax || 0)} تومان</span>
        </div>
        <div className="flex justify-between py-2 font-bold text-[14px] text-brand-900 border-t-2 border-brand-900 mt-2">
          <span>مبلغ قابل پرداخت:</span>
          <span className="tnum">{formatPrice(order?.total || 0)} تومان</span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t-2 border-brand-900 text-center text-[11px] text-cream-500">
        <p>از خرید شما متشکریم | فروشگاه اینترنتی پوشاک تای سیز</p>
      </div>
    </div>
  );
}
