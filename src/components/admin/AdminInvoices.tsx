import { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { formatPrice, finalPrice, faNum, faDateFull, dayLabel } from '../../utils/format';
import * as api from '../../services/api';
import { IconCheck, IconX, IconEye, IconPrint } from '../Icons';
import InvoicePreview from './InvoicePreview';

export default function AdminInvoices() {
  const { orders, invoices, setInvoices, darkMode, log } = useAdmin();
  const { settings, addToast } = useShop();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = invoices.filter((inv: any) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (search && !inv.number.includes(search) && !inv.customer.includes(search)) return false;
    return true;
  });

  const settleInvoice = async (invoice: any) => {
    const paymentReference = window.prompt('شماره پیگیری درگاه یا رسید بانکی را وارد کنید:');
    if (!paymentReference?.trim()) return;
    try {
      const saved = await api.finance.invoices.update(invoice.id, {
        ...invoice, status: 'paid', paymentReference: paymentReference.trim(),
      });
      setInvoices(invoices.map((item: any) => item.id === saved.id ? saved : item));
      setSelectedInvoice((current: any) => current?.id === saved.id ? saved : current);
      log(`ثبت تسویه فاکتور ${saved.number}`, saved.id);
      addToast('success', 'تسویه فاکتور با مرجع پرداخت ثبت شد');
    } catch (error: any) {
      addToast('danger', `ثبت تسویه ناموفق بود: ${error.message}`);
    }
  };

  const printInvoice = (inv: any) => {
    const order = orders.find((o: any) => o.id === inv.orderId);
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8">
<title>فاکتور ${inv.number}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Vazirmatn', Tahoma, sans-serif; direction: rtl; background: #fff; color: #1A2238; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1A2238; padding-bottom: 20px; margin-bottom: 30px; }
  .logo-section { flex: 1; }
  .logo { font-size: 32px; font-weight: bold; color: #1A2238; margin-bottom: 8px; }
  .store-info { font-size: 11px; color: #666; line-height: 1.8; }
  .invoice-info { text-align: left; }
  .invoice-title { font-size: 24px; font-weight: bold; color: #1A2238; margin-bottom: 10px; }
  .invoice-number { font-size: 14px; color: #666; margin-bottom: 5px; }
  .invoice-date { font-size: 12px; color: #666; }
  .customer-section { background: #f9f6eb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
  .customer-title { font-size: 13px; font-weight: bold; color: #1A2238; margin-bottom: 12px; }
  .customer-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; }
  .customer-info div { display: flex; gap: 8px; }
  .customer-info strong { color: #1A2238; min-width: 80px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  thead { background: linear-gradient(135deg, #1A2238 0%, #2d4a85 100%); color: white; }
  th { padding: 12px 8px; text-align: right; font-size: 11px; font-weight: bold; }
  td { padding: 10px 8px; border-bottom: 1px solid #e8e1cc; font-size: 12px; text-align: right; }
  tbody tr:nth-child(even) { background: #f9f6eb; }
  .text-left { text-align: left; }
  .totals { margin-top: 20px; }
  .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #e8e1cc; }
  .total-row.final { font-size: 16px; font-weight: bold; color: #1A2238; border-top: 2px solid #1A2238; border-bottom: none; margin-top: 10px; padding-top: 15px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #1A2238; text-align: center; font-size: 11px; color: #666; line-height: 1.8; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: bold; }
  .badge-paid { background: #d1fae5; color: #065f46; }
  .badge-pending { background: #fef3c7; color: #92400e; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <div class="logo">فروشگاه اینترنتی پوشاک تای سیز</div>
      <div class="store-info">
        <div>تلفن: ${esc(settings.phone)}</div>
        <div>ایمیل: ${esc(settings.email)}</div>
        <div>آدرس: ${esc(settings.address)}</div>
      </div>
    </div>
    <div class="invoice-info">
      <div class="invoice-title">فاکتور فروش</div>
      <div class="invoice-number">شماره فاکتور: ${esc(inv.number)}</div>
      <div class="invoice-date">تاریخ: ${faDateFull(new Date(inv.date))}</div>
      <div style="margin-top: 8px;"><span class="badge ${inv.status === 'paid' ? 'badge-paid' : 'badge-pending'}">${inv.status === 'paid' ? 'پرداخت شده' : 'در انتظار پرداخت'}</span></div>
    </div>
  </div>

  <div class="customer-section">
    <div class="customer-title">مشخصات مشتری</div>
    <div class="customer-info">
      <div><strong>نام:</strong> <span>${esc(inv.customer)}</span></div>
      <div><strong>موبایل:</strong> <span>${esc(order?.mobile || '-')}</span></div>
      <div><strong>شهر:</strong> <span>${esc(order?.city || '-')}</span></div>
      <div><strong>آدرس:</strong> <span>${esc(order?.address || '-')}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>ردیف</th>
        <th>شرح کالا</th>
        <th>تعداد</th>
        <th>قیمت واحد (تومان)</th>
        <th>تخفیف (٪)</th>
        <th>قیمت نهایی (تومان)</th>
      </tr>
    </thead>
    <tbody>
      ${order?.items?.map((item: any, idx: number) => {
        const finalPrice = item.price * (1 - item.discount / 100);
        const totalPrice = finalPrice * item.qty;
        return `
          <tr>
            <td>${faNum(idx + 1)}</td>
            <td>${esc(item.name)}</td>
            <td class="text-left">${faNum(item.qty)}</td>
            <td class="text-left">${formatPrice(item.price)}</td>
            <td class="text-left">${faNum(item.discount)}٪</td>
            <td class="text-left">${formatPrice(totalPrice)}</td>
          </tr>
        `;
      }).join('') || ''}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>جمع کل کالاها:</span>
      <span>${formatPrice(order?.subtotal || 0)} تومان</span>
    </div>
    <div class="total-row">
      <span>تخفیف:</span>
      <span>${formatPrice(order?.discountAmount || 0)} تومان</span>
    </div>
    <div class="total-row">
      <span>هزینه ارسال:</span>
      <span>${formatPrice(order?.shipping || 0)} تومان</span>
    </div>
    <div class="total-row">
      <span>مالیات و عوارض:</span>
      <span>${formatPrice(order?.tax || 0)} تومان</span>
    </div>
    <div class="total-row final">
      <span>مبلغ قابل پرداخت:</span>
      <span>${formatPrice(order?.total || 0)} تومان</span>
    </div>
  </div>

  <div class="footer">
    <div>از خرید شما متشکریم | فروشگاه اینترنتی پوشاک تای سیز</div>
    <div>این فاکتور معتبر و مورد تأیید می‌باشد</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    log(`چاپ فاکتور ${inv.number}`, inv.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو شماره فاکتور یا نام مشتری..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه وضعیت‌ها</option>
          <option value="paid">پرداخت شده</option>
          <option value="pending">در انتظار</option>
        </select>
      </div>

      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">شماره فاکتور</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مشتری</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">مبلغ</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تاریخ</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت</th>
                <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv: any) => (
                <tr key={inv.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                  <td className="py-2.5 px-3 font-bold">{inv.number}</td>
                  <td className="py-2.5 px-3">{inv.customer}</td>
                  <td className="py-2.5 px-3 tnum">{formatPrice(inv.amount)}</td>
                  <td className="py-2.5 px-3 text-[11px] text-cream-500">{dayLabel(new Date(inv.date))}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-600' : 'bg-amber-600'}`}></span>
                      {inv.status === 'paid' ? 'پرداخت شده' : 'در انتظار'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      <button onClick={() => setSelectedInvoice(inv)} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600" title="مشاهده">
                        <IconEye className="w-4 h-4" />
                      </button>
                      <button onClick={() => printInvoice(inv)} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600" title="چاپ">
                        <IconPrint className="w-4 h-4" />
                      </button>
                      {inv.status !== 'paid' && (
                        <button onClick={() => settleInvoice(inv)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="ثبت تسویه با مرجع پرداخت">
                          <IconCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>فاکتور {selectedInvoice.number}</h3>
              <button onClick={() => setSelectedInvoice(null)}><IconX className="w-5 h-5" /></button>
            </div>
            <InvoicePreview invoice={selectedInvoice} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => printInvoice(selectedInvoice)} className="flex-1 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px] flex items-center justify-center gap-2">
                <IconPrint className="w-4 h-4" /> چاپ فاکتور
              </button>
              {selectedInvoice.status !== 'paid' && (
                <button onClick={() => settleInvoice(selectedInvoice)} className="px-4 py-2.5 rounded-xl border border-cream-300 text-[12px] font-bold">
                  ثبت تسویه فاکتور
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
