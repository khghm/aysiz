import { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { faNum, faDateFull } from '../../utils/format';
import * as api from '../../services/api';
import { IconHome, IconStar, IconTruck, IconShield, IconEdit, IconMenu, IconSun, IconMoon, IconBell, IconSettings, IconChart, IconPackage, IconUsers, IconTag, IconDollar, IconReturn, IconTicket, IconRocket, IconLogout, IconClipboard, IconLink, IconStore, IconBox, IconCalendar, IconTrending } from '../Icons';
import AdminLogin from './AdminLogin';
import AdminContent from './AdminContent';

export default function AdminPanel() {
  const admin = useAdmin();
  const shop = useShop();
  const { isAdmin, setIsAdmin, darkMode, toggleDark, currentRole, adminIdentity, adminSection, setAdminSection } = admin;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const allowedSections = adminIdentity?.sections || [];
  const visibleSection = allowedSections.includes(adminSection)
    ? adminSection
    : allowedSections.includes('home') ? 'home' : allowedSections[0] || 'home';

  if (!isAdmin) return <AdminLogin />;
  if (!adminIdentity) return <div className="min-h-screen grid place-items-center text-sm text-cream-500">در حال بررسی دسترسی مدیر...</div>;

  const sections = [
    { id: 'home', label: 'نمای کلی', icon: <IconHome className="w-5 h-5" /> },
    { id: 'reports', label: 'گزارش‌ها و تحلیل', icon: <IconChart className="w-5 h-5" /> },
    { id: 'orders', label: 'سفارش‌ها', icon: <IconClipboard className="w-5 h-5" /> },
    { id: 'products', label: 'محصولات', icon: <IconPackage className="w-5 h-5" /> },
    { id: 'finance', label: 'امور مالی', icon: <IconDollar className="w-5 h-5" /> },
    { id: 'customers', label: 'مشتریان و CRM', icon: <IconUsers className="w-5 h-5" /> },
    { id: 'reviews', label: 'نظرات کاربران', icon: <IconStar className="w-5 h-5" /> },
    { id: 'discounts', label: 'کدهای تخفیف', icon: <IconTag className="w-5 h-5" /> },
    { id: 'growth', label: 'بازاریابی', icon: <IconRocket className="w-5 h-5" /> },
    { id: 'returns', label: 'مرجوعی‌ها', icon: <IconReturn className="w-5 h-5" /> },
    { id: 'support', label: 'پشتیبانی و تیکت', icon: <IconTicket className="w-5 h-5" /> },
    { id: 'operations', label: 'عملیات', icon: <IconBox className="w-5 h-5" /> },
    { id: 'system', label: 'سیستم و امنیت', icon: <IconShield className="w-5 h-5" /> },
    { id: 'settings', label: 'تنظیمات', icon: <IconSettings className="w-5 h-5" /> },
    { id: 'insights', label: 'تحلیل هوشمند', icon: <IconTrending className="w-5 h-5" /> },
    { id: 'affiliates', label: 'افیلیت و بازاریابان', icon: <IconLink className="w-5 h-5" /> },
    { id: 'pos', label: 'صندوق فروش', icon: <IconStore className="w-5 h-5" /> },
    { id: 'content', label: 'مدیریت محتوا', icon: <IconEdit className="w-5 h-5" /> },
    { id: 'vendors', label: 'فروشندگان', icon: <IconUsers className="w-5 h-5" /> },
    { id: 'logistics', label: 'ارسال و لجستیک', icon: <IconTruck className="w-5 h-5" /> },
    { id: 'tasks', label: 'وظایف و تیم', icon: <IconCalendar className="w-5 h-5" /> },
  ].filter(s => allowedSections.includes(s.id));

  const sectionTitles: Record<string, string> = {};
  sections.forEach(s => sectionTitles[s.id] = s.label);

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-[#10151d]' : 'bg-cream-50'}`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 start-0 z-40 w-64 bg-brand-950 border-e border-white/5 overflow-y-auto transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0'}`}>
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><span className="text-white font-display text-sm">ت</span></div><span className="font-display text-white text-lg">پنل تای سیز</span></div>
        </div>
        <nav className="p-3 space-y-1">
          {sections.map(s => (
            <button key={s.id} onClick={() => { setAdminSection(s.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all ${visibleSection === s.id ? 'bg-brand-600/15 text-accent-500 border-r-2 border-accent-500' : 'text-brand-100/70 hover:bg-white/5 hover:text-white'}`}>
              {s.icon}<span>{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/5 mt-4">
          <button onClick={() => { setIsAdmin(false); api.setToken(null); api.auth.adminLogout().catch(() => {}); shop.setView('home'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold text-coral-400 hover:bg-white/5"><IconLogout className="w-4 h-4" />خروج</button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:mr-64">
        {/* Topbar */}
        <header className={`sticky top-0 z-30 ${darkMode ? 'bg-[#151b26]/90' : 'bg-white/90'} backdrop-blur-md border-b ${darkMode ? 'border-white/10' : 'border-cream-300'}`}>
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <button className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><IconMenu className="w-5 h-5" /></button>
              <h1 className={`font-display text-xl sm:text-2xl ${darkMode ? 'text-white' : 'text-brand-900'}`}>{sectionTitles[visibleSection] || 'نمای کلی'}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] ${darkMode ? 'text-brand-300' : 'text-cream-500'}`}>{faDateFull()}</span>
              <span className={`rounded-xl border px-2 py-1.5 text-[11px] font-bold ${darkMode ? 'bg-[#1a212c] border-white/10 text-white' : 'border-cream-300 bg-white text-brand-900'}`} title={adminIdentity.username}>
                {adminIdentity.name} · {currentRole}
              </span>
              <button onClick={toggleDark} className={`p-2 rounded-xl ${darkMode ? 'bg-white/5 text-accent-500' : 'bg-cream-100 text-brand-700'}`}>{darkMode ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />}</button>
              <div className="relative">
                <IconBell className={`w-5 h-5 ${darkMode ? 'text-brand-300' : 'text-brand-700'}`} />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-coral-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold animate-pop">{faNum(admin.orders.filter((o: any) => o.status === 'pending').length)}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl animate-fade">
          <AdminContent section={visibleSection} />
        </main>
      </div>
    </div>
  );
}
