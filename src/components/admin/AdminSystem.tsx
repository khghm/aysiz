import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { faNum, dayLabel, toExcel, downloadFile } from '../../utils/format';
import * as api from '../../services/api';
import { IconUser, IconLock, IconShield, IconUsers, IconDownload, IconUpload, IconClipboard, IconLink, IconAlert } from '../Icons';

export default function AdminSystem() {
  const { roles, audit, loginHistory, errorLog, setErrorLog, integrations, darkMode, log, setIsAdmin, adminIdentity } = useAdmin();
  const { addToast } = useShop();
  const [tab, setTab] = useState<'roles' | 'users' | 'audit' | 'security' | 'integrations' | 'backup'>('roles');
  const [auditFilter, setAuditFilter] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [search, setSearch] = useState('');
  const backupRef = useRef<HTMLInputElement>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [userForm, setUserForm] = useState({ id: '', username: '', name: '', roleId: '', password: '' });
  const [userError, setUserError] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState('');

  const loadAdminUsers = () => {
    setUsersLoading(true);
    api.admin.users.list().then(({ items }) => setAdminUsers(items)).catch((error) => {
      setUserError(error instanceof Error ? error.message : 'بارگذاری حساب‌های مدیر ناموفق بود');
    }).finally(() => setUsersLoading(false));
  };

  useEffect(() => {
    if (tab === 'users') loadAdminUsers();
  }, [tab]);

  const saveAdminUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setUserError('');
    try {
      const ownRoleChanged = userForm.id === adminIdentity?.id && userForm.roleId !== adminIdentity.roleId;
      if (userForm.id) {
        const { id, password, ...fields } = userForm;
        await api.admin.users.update(id, { ...fields, ...(password ? { password } : {}) });
      } else {
        await api.admin.users.create(userForm);
      }
      if (ownRoleChanged) {
        window.location.reload();
        return;
      }
      setUserForm({ id: '', username: '', name: '', roleId: '', password: '' });
      loadAdminUsers();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'ذخیره حساب مدیر ناموفق بود');
    }
  };

  const deleteAdminUser = async (id: string) => {
    if (!window.confirm('حساب مدیر حذف شود؟ این عملیات قابل بازگشت نیست.')) return;
    setUserError('');
    try {
      await api.admin.users.delete(id);
      loadAdminUsers();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'حذف حساب مدیر ناموفق بود');
    }
  };

  const stats = {
    totalAudit: audit.length,
    warnings: audit.filter((a: any) => a.severity === 'warning').length,
    criticals: audit.filter((a: any) => a.severity === 'critical').length,
    failedLogins: loginHistory.filter((l: any) => !l.success).length,
    activeErrors: errorLog.filter((e: any) => !e.resolved).length,
    configuredIntegrations: integrations.length,
  };

  const filteredAudit = audit.filter((a: any) => {
    if (auditFilter !== 'all' && a.severity !== auditFilter) return false;
    if (search && !a.action.includes(search) && !a.actor.includes(search)) return false;
    return true;
  });

  const exportBackup = async () => {
    setBackupBusy(true);
    setBackupError('');
    try {
      const data = await api.admin.backup.export();
      downloadFile(JSON.stringify(data, null, 2), `tasis-database-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
      log('خروجی پشتیبان پایگاه‌داده', 'system');
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'تهیه فایل پشتیبان ناموفق بود');
    } finally {
      setBackupBusy(false);
    }
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      addToast('danger', 'فایل پشتیبان بیش از حد بزرگ است');
      e.target.value = '';
      return;
    }
    if (!window.confirm('بازیابی، تمام داده‌های عملیاتی پایگاه‌داده فعلی را جایگزین می‌کند. حساب مدیر جاری حفظ می‌شود. فایل شامل اطلاعات مشتری و hash رمزها است و باید محرمانه نگهداری شود. ادامه می‌دهید؟')) {
      e.target.value = '';
      return;
    }
    setBackupBusy(true);
    setBackupError('');
    try {
      const data = JSON.parse(await file.text());
      await api.admin.backup.restore(data);
      addToast('success', 'بازیابی پایگاه‌داده انجام شد. صفحه دوباره بارگذاری می‌شود.');
      setTimeout(() => window.location.reload(), 1500);
      window.location.reload();
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'بازیابی فایل پشتیبان ناموفق بود');
    } finally {
      setBackupBusy(false);
      e.target.value = '';
    }
  };

  const clearErrors = () => {
    setErrorLog([]);
    log('پاک‌سازی خطاهای فنی', 'system');
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { l: 'کل رویدادها', v: faNum(stats.totalAudit), c: 'bg-blue-50 text-blue-700', icon: <IconClipboard className="w-5 h-5" /> },
          { l: 'هشدارها', v: faNum(stats.warnings), c: 'bg-amber-50 text-amber-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'بحرانی', v: faNum(stats.criticals), c: 'bg-coral-50 text-coral-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'ورود ناموفق', v: faNum(stats.failedLogins), c: 'bg-purple-50 text-purple-700', icon: <IconLock className="w-5 h-5" /> },
          { l: 'خطاهای فعال', v: faNum(stats.activeErrors), c: 'bg-coral-50 text-coral-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'یکپارچگی‌های تعریف‌شده', v: faNum(stats.configuredIntegrations), c: 'bg-emerald-50 text-emerald-700', icon: <IconLink className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{k.l}</p>
              <div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[
          { k: 'roles', l: 'نقش‌ها و دسترسی‌ها', icon: <IconUsers className="w-4 h-4" /> },
          { k: 'users', l: 'حساب‌های مدیر', icon: <IconUser className="w-4 h-4" /> },
          { k: 'audit', l: 'لاگ رویدادها', icon: <IconClipboard className="w-4 h-4" /> },
          { k: 'security', l: 'امنیت و ورودها', icon: <IconShield className="w-4 h-4" /> },
          { k: 'integrations', l: 'یکپارچگی‌ها', icon: <IconLink className="w-4 h-4" /> },
          { k: 'backup', l: 'پشتیبان‌گیری', icon: <IconDownload className="w-4 h-4" /> }
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 flex items-center gap-1.5 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>
            {t.icon}{t.l}
          </button>
        ))}
      </div>

      {/* Roles Tab */}
      {tab === 'roles' && (
        <div className="space-y-4">
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-800">دسترسی حساب‌ها براساس نقش اختصاص‌یافته در سرور اعمال می‌شود. دسترسی مؤثر پس از تغییر نقش در درخواست بعدی به‌روزرسانی خواهد شد.</p>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>نقش‌های سیستمی</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roles.map((r: any) => (
                <div key={r.id} className={`rounded-xl border-2 ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-cream-200 bg-cream-50'} p-4 hover:shadow-lg transition-all`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: r.color }}>
                        <IconUsers className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{r.name}</p>
                        <p className="text-[10px] text-cream-500">{faNum(r.sections.length)} بخش قابل دسترسی</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.sections.slice(0, 5).map((s: string) => (
                      <span key={s} className="text-[9px] bg-white rounded-full px-2 py-0.5 text-brand-700">{s}</span>
                    ))}
                    {r.sections.length > 5 && <span className="text-[9px] bg-white rounded-full px-2 py-0.5 text-brand-700">+{faNum(r.sections.length - 5)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <form onSubmit={saveAdminUser} className={`grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`md:col-span-2 text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{userForm.id ? 'ویرایش حساب مدیر' : 'ایجاد حساب مدیر'}</h3>
            <input required disabled={Boolean(userForm.id)} value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} placeholder="نام کاربری" className="rounded-xl border border-cream-300 px-3 py-2 text-[12px]" />
            <input required value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} placeholder="نام نمایشی" className="rounded-xl border border-cream-300 px-3 py-2 text-[12px]" />
            <select required value={userForm.roleId} onChange={e => setUserForm({ ...userForm, roleId: e.target.value })} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px]">
              <option value="">انتخاب نقش</option>
              {roles.map((role: any) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            <input required={!userForm.id} type="password" minLength={12} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder={userForm.id ? 'رمز جدید (اختیاری، حداقل ۱۲ کاراکتر)' : 'رمز عبور (حداقل ۱۲ کاراکتر)'} className="rounded-xl border border-cream-300 px-3 py-2 text-[12px]" />
            {userError && <p className="md:col-span-2 text-[12px] font-bold text-coral-600">{userError}</p>}
            <div className="md:col-span-2 flex gap-2">
              <button disabled={usersLoading} className="rounded-xl bg-brand-900 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50">{userForm.id ? 'ذخیره تغییرات' : 'ایجاد حساب'}</button>
              {userForm.id && <button type="button" onClick={() => setUserForm({ id: '', username: '', name: '', roleId: '', password: '' })} className="rounded-xl border border-cream-300 px-4 py-2 text-[12px] font-bold">انصراف</button>}
            </div>
          </form>
          <div className={`overflow-x-auto rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'}`}>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-cream-300 text-start"><th className="p-3 text-start">نام کاربری</th><th className="p-3 text-start">نام</th><th className="p-3 text-start">نقش</th><th className="p-3 text-start">عملیات</th></tr></thead>
              <tbody>{adminUsers.map((user: any) => (
                <tr key={user.id} className="border-b border-cream-100">
                  <td className="p-3">{user.username}{user.id === adminIdentity?.id ? ' (شما)' : ''}</td>
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.roleName || 'بدون نقش'}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => setUserForm({ id: user.id, username: user.username, name: user.name, roleId: user.roleId || '', password: '' })} className="font-bold text-brand-700">ویرایش</button>
                    <button disabled={user.id === adminIdentity?.id} onClick={() => deleteAdminUser(user.id)} className="font-bold text-coral-600 disabled:opacity-40">حذف</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {usersLoading && <p className="p-4 text-[11px] text-cream-500">در حال بارگذاری...</p>}
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو در رویدادها..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
            <select value={auditFilter} onChange={e => setAuditFilter(e.target.value as any)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
              <option value="all">همه شدت‌ها</option>
              <option value="normal">عادی</option>
              <option value="warning">هشدار</option>
              <option value="critical">بحرانی</option>
            </select>
            <button onClick={() => downloadFile(toExcel(filteredAudit.map((a: any) => ({ 'رویداد': a.action, 'کاربر': a.actor, 'نقش': a.role, 'هدف': a.target, 'شدت': a.severity, 'تاریخ': dayLabel(new Date(a.at)) })), 'لاگ رویدادها'), 'audit-log.xls', 'application/vnd.ms-excel')} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-cream-300 text-[11px] font-bold"><IconDownload className="w-3.5 h-3.5" />خروجی اکسل</button>
          </div>
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">رویداد</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">کاربر</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نقش</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">هدف</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">شدت</th>
                    <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.slice(0, 50).map((a: any) => (
                    <tr key={a.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} transition-colors`}>
                      <td className="py-2.5 px-3 font-bold">{a.action}</td>
                      <td className="py-2.5 px-3">{a.actor}</td>
                      <td className="py-2.5 px-3 text-[11px]">{a.role}</td>
                      <td className="py-2.5 px-3 text-[11px] font-mono">{a.target}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${a.severity === 'critical' ? 'bg-coral-100 text-coral-700' : a.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {a.severity === 'critical' ? 'بحرانی' : a.severity === 'warning' ? 'هشدار' : 'عادی'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-cream-500">{dayLabel(new Date(a.at))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {tab === 'security' && (
        <div className="space-y-4">
          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>تاریخچه ورود کاربران</h3>
            <div className="space-y-2">
              {loginHistory.map((l: any) => (
                <div key={l.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${l.success ? 'bg-emerald-100' : 'bg-coral-100'}`}>
                      <IconUser className={`w-5 h-5 ${l.success ? 'text-emerald-700' : 'text-coral-700'}`} />
                    </div>
                    <div>
                      <p className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{l.user}</p>
                      <p className="text-[10px] text-cream-500">{l.role} | {l.ip} | {l.browser}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${l.success ? 'bg-emerald-100 text-emerald-700' : 'bg-coral-100 text-coral-700'}`}>
                      {l.success ? 'موفق' : 'ناموفق'}
                    </span>
                    <p className="text-[10px] text-cream-500 mt-1">{dayLabel(new Date(l.time))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>خطاهای فنی</h3>
              {errorLog.length > 0 && (
                <button onClick={clearErrors} className="px-3 py-1.5 rounded-xl bg-coral-100 text-coral-700 text-[11px] font-bold">پاک‌سازی همه</button>
              )}
            </div>
            {errorLog.length === 0 ? (
              <p className="text-[12px] text-cream-500 text-center py-8">هیچ خطای فنی ثبت نشده است</p>
            ) : (
              <div className="space-y-2">
                {errorLog.map((e: any) => (
                  <div key={e.id} className={`flex items-center justify-between p-3 rounded-xl ${e.resolved ? (darkMode ? 'bg-[#1a212c]' : 'bg-cream-50') : 'bg-coral-50 border border-coral-200'}`}>
                    <div className="flex items-center gap-3">
                      <IconAlert className={`w-5 h-5 ${e.resolved ? 'text-cream-500' : 'text-coral-600'}`} />
                      <div>
                        <p className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{e.message}</p>
                        <p className="text-[10px] text-cream-500">{dayLabel(new Date(e.time))}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${e.resolved ? 'bg-emerald-100 text-emerald-700' : 'bg-coral-100 text-coral-700'}`}>
                      {e.resolved ? 'حل شده' : 'فعال'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {tab === 'integrations' && (
        <div className="space-y-3">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">وضعیت‌های این فهرست اتصال زنده را تأیید نمی‌کنند. سلامت سرویس‌ها باید از پیکربندی امن سرور و آزمون اتصال واقعی بررسی شود؛ این پنل هنوز آزمون اتصال ندارد.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {integrations.map((i: any) => (
            <div key={i.id} className={`rounded-2xl border-2 ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-200 bg-white'} p-5 hover:shadow-lg transition-all`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cream-100">
                    <IconLink className="w-6 h-6 text-cream-500" />
                  </div>
                  <div>
                    <p className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{i.name}</p>
                    <p className="text-[10px] text-cream-500">{i.type === 'payment' ? 'درگاه پرداخت' : 'سرویس ارسال'}</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 text-[11px] font-bold">تأییدنشده</span>
              </div>
              <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-3`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cream-500">تعداد تراکنش:</span>
                  <span className="font-bold">نامشخص</span>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Backup Tab */}
      {tab === 'backup' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-6 space-y-4`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
              <IconDownload className="w-6 h-6 text-brand-700" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>پشتیبان‌گیری و بازیابی</h3>
              <p className="text-[11px] text-cream-500">نسخه کامل جداول PostgreSQL</p>
            </div>
          </div>
          <p className="text-[12px] text-brand-700 leading-6">فایل پشتیبان شامل تمام جداول عملیاتی، اطلاعات مشتریان و hash رمز حساب‌های مدیر است. فایل را رمزگذاری و در محل امن نگهداری کنید؛ این قابلیت جایگزین نسخه پشتیبان زمان‌بندی‌شده و خارج از سرور نیست.</p>
          {backupError && <p className="rounded-xl bg-coral-50 p-3 text-[12px] font-bold text-coral-700">{backupError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button disabled={backupBusy} onClick={exportBackup} className="flex items-center justify-center gap-2 bg-brand-900 text-white px-4 py-3 rounded-xl text-[12px] font-bold shadow-lg shadow-brand-900/25 hover:bg-brand-950 transition-colors disabled:opacity-50">
              <IconDownload className="w-5 h-5" />{backupBusy ? 'در حال انجام...' : 'دانلود فایل پشتیبان'}
            </button>
            <input ref={backupRef} type="file" accept=".json" onChange={importBackup} className="hidden" />
            <button disabled={backupBusy} onClick={() => backupRef.current?.click()} className="flex items-center justify-center gap-2 border-2 border-brand-900 text-brand-900 px-4 py-3 rounded-xl text-[12px] font-bold hover:bg-brand-50 transition-colors disabled:opacity-50">
              <IconUpload className="w-5 h-5" />بازیابی از فایل
            </button>
          </div>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <IconAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold text-amber-700 mb-1">توجه مهم</p>
                <p className="text-[11px] text-amber-600 leading-5">بازیابی در تراکنش انجام می‌شود و در صورت نامعتبر بودن هر جدول، همه تغییرها rollback می‌شوند. حساب جاری و نقش مدیر سیستمی آن حفظ خواهد شد. برای آمادگی پروداکشن، ذخیره‌سازی خارج از سرور و زمان‌بندی خودکار backup همچنان لازم است.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
