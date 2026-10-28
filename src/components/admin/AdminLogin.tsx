import { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import * as api from '../../services/api';

export default function AdminLogin() {
  const { setIsAdmin, isAdmin } = useAdmin();
  const { setView } = useShop();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setErr(''); setLoading(true);
    try {
      const res = await api.auth.adminLogin(user, pass);
      api.setToken('1'); // توکن ادمین برای فراخوانی‌های محافظت‌شده
      setIsAdmin(true);
    } catch (e: any) {
      setErr(e.message || 'نام کاربری یا رمز عبور اشتباه است');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-brand-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-brand-600/20 blur-3xl animate-floaty" />
        <div className="absolute bottom-20 left-20 w-72 h-72 rounded-full bg-coral-600/15 blur-3xl animate-floaty" style={{ animationDelay: '3s' }} />
      </div>
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm animate-rise">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-brand-900 flex items-center justify-center mx-auto mb-3"><span className="text-white font-display text-xl">ت</span></div>
          <h2 className="font-display text-xl text-brand-900">پنل مدیریت تای سیز</h2>
          <p className="text-[12px] text-cream-500 mt-1">برای ورود اطلاعات مدیر را وارد کنید</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-brand-700 mb-1 block">نام کاربری</label>
            <input value={user} onChange={e => setUser(e.target.value)} placeholder="نام کاربری" className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-[13px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-brand-700 mb-1 block">رمز عبور</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="رمز عبور" className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-[13px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" onKeyDown={e => e.key === 'Enter' && login()} />
          </div>
          {err && <p className="text-[11px] text-coral-600 font-bold">{err}</p>}
          <button onClick={login} disabled={loading} className="w-full bg-brand-900 text-white py-3 rounded-xl font-extrabold text-sm hover:bg-brand-700 transition-colors shadow-lg shadow-brand-900/25 disabled:opacity-60">{loading ? 'در حال ورود...' : 'ورود به پنل'}</button>
          {import.meta.env.DEV && <button onClick={() => { setUser('admin'); setPass('admin123'); }} className="w-full border border-cream-300 py-2.5 rounded-xl text-[12px] font-bold text-brand-700 hover:border-accent-500 transition-colors">ورود سریع با حساب آزمایشی</button>}
          <button onClick={() => setView('home')} className="w-full text-[12px] text-cream-500 hover:text-brand-700 mt-2">بازگشت به فروشگاه</button>
        </div>
      </div>
    </div>
  );
}
