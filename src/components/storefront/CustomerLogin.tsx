import { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { faNum } from '../../utils/format';
import * as api from '../../services/api';

export default function CustomerLogin() {
  const { setView, customer, setCustomer, addToast } = useShop();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [err, setErr] = useState('');
  const [devOtp, setDevOtp] = useState('');

  useEffect(() => { if (cooldown <= 0) return; const t = setInterval(() => setCooldown(c => c - 1), 1000); return () => clearInterval(t); }, [cooldown]);

  const requestCode = async () => {
    if (phone.replace(/\D/g, '').length < 11) { setErr('شماره موبایل معتبر وارد کنید'); return; }
    setLoading(true); setErr('');
    try {
      const res = await api.auth.requestOtp(phone);
      setStep('code');
      setCooldown(60);
      setDevOtp(res.devOtp || '');
      addToast('success', res.message);
    } catch (e: any) { setErr(e.message || 'خطا در ارسال کد'); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    if (code.length < 4) { setErr('کد تأیید را کامل وارد کنید'); return; }
    setLoading(true); setErr('');
    try {
      const res = await api.auth.verifyOtp(phone, code, name || undefined);
      api.setToken('1');
      setCustomer(res.customer);
      addToast('success', 'خوش آمدید!');
      setView('account');
    } catch (e: any) { setErr(e.message || 'کد تأیید نامعتبر است'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-12 animate-rise">
      <div className="bg-white rounded-2xl border border-cream-200 shadow-lg p-6 text-center">
        <div className="w-14 h-14 rounded-xl bg-brand-900 flex items-center justify-center mx-auto mb-4"><span className="text-white font-display text-xl">ت</span></div>
        <h2 className="font-display text-lg text-brand-900 mb-1">{step === 'phone' ? 'ورود / ثبت‌نام' : 'کد تأیید'}</h2>
        <p className="text-[12px] text-cream-500 mb-5">{step === 'phone' ? 'با شماره موبایل خود وارد شوید' : `کد ۶ رقمی ارسال‌شده به ${phone} را وارد کنید`}</p>

        {step === 'phone' ? (
          <div className="space-y-3 text-start">
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="۰۹۱۲۳۴۵۶۷۸۹" inputMode="tel" className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-center text-[15px] font-bold tracking-widest outline-none focus:border-brand-400" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="نام و نام خانوادگی (اختیاری)" className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-[13px] outline-none focus:border-brand-400" />
            {err && <p className="text-[11px] text-coral-600 font-bold text-center">{err}</p>}
            <button onClick={requestCode} disabled={loading} className="w-full bg-brand-900 text-white py-3 rounded-xl font-extrabold text-sm disabled:opacity-60">{loading ? 'در حال ارسال...' : 'دریافت کد تأیید'}</button>
          </div>
        ) : (
          <div className="space-y-3 text-start">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="------" inputMode="numeric" maxLength={6} className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-center text-[18px] font-bold tracking-[0.5em] outline-none focus:border-brand-400 tnum" />
            {devOtp && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                <p className="text-[11px] text-amber-700 font-bold">حالت تستی (کاوه‌نگار متصل نیست)</p>
                <p className="text-[15px] font-extrabold text-amber-800 tnum mt-1">کد شما: {devOtp}</p>
              </div>
            )}
            {err && <p className="text-[11px] text-coral-600 font-bold text-center">{err}</p>}
            <button onClick={verify} disabled={loading} className="w-full bg-brand-900 text-white py-3 rounded-xl font-extrabold text-sm disabled:opacity-60">{loading ? 'در حال بررسی...' : 'ورود به حساب'}</button>
            <button onClick={() => { if (cooldown === 0) requestCode(); }} disabled={cooldown > 0} className="w-full text-[11px] text-cream-500 py-1 disabled:opacity-50">{cooldown > 0 ? `ارسال مجدد تا ${faNum(cooldown)} ثانیه` : 'ارسال مجدد کد'}</button>
            <button onClick={() => { setStep('phone'); setCode(''); setDevOtp(''); }} className="w-full text-[11px] font-bold text-brand-600">ویرایش شماره موبایل</button>
          </div>
        )}
        <button onClick={() => setView('home')} className="mt-4 text-[11px] text-cream-500 hover:text-brand-700">بازگشت به فروشگاه</button>
      </div>
    </div>
  );
}
