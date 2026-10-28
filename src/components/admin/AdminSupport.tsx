import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { faNum, dayLabel } from '../../utils/format';
import { IconClock, IconCheck, IconX, IconClipboard, IconAlert, IconSend } from '../Icons';

export default function AdminSupport() {
  const { tickets, setTickets, darkMode, log } = useAdmin();
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filtered = tickets.filter((t: any) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });

  const stats = {
    open: tickets.filter((t: any) => t.status === 'open').length,
    pending: tickets.filter((t: any) => t.status === 'pending').length,
    answered: tickets.filter((t: any) => t.status === 'answered').length,
    closed: tickets.filter((t: any) => t.status === 'closed').length,
  };

  const priorityColors: Record<string, string> = { high: 'bg-coral-100 text-coral-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' };
  const priorityLabels: Record<string, string> = { high: 'فوری', medium: 'متوسط', low: 'کم' };
  const statusLabels: Record<string, string> = { open: 'باز', pending: 'در انتظار', answered: 'پاسخ داده شده', closed: 'بسته' };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'تیکت‌های باز', v: faNum(stats.open), c: 'bg-coral-50 text-coral-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'در انتظار پاسخ', v: faNum(stats.pending), c: 'bg-amber-50 text-amber-700', icon: <IconClock className="w-5 h-5" /> },
          { l: 'پاسخ داده شده', v: faNum(stats.answered), c: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="w-5 h-5" /> },
          { l: 'بسته شده', v: faNum(stats.closed), c: 'bg-blue-50 text-blue-700', icon: <IconClipboard className="w-5 h-5" /> },
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

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه وضعیت‌ها</option>
          <option value="open">باز</option>
          <option value="pending">در انتظار</option>
          <option value="answered">پاسخ داده شده</option>
          <option value="closed">بسته</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه اولویت‌ها</option>
          <option value="high">فوری</option>
          <option value="medium">متوسط</option>
          <option value="low">کم</option>
        </select>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filtered.map((t: any) => (
          <div key={t.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 cursor-pointer hover:shadow-lg transition-all`} onClick={() => setSelected(t)}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{t.subject}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${priorityColors[t.priority]}`}>{priorityLabels[t.priority]}</span>
                </div>
                <p className="text-[11px] text-cream-500">{t.customer} | {t.mobile}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${t.status === 'open' ? 'bg-coral-100 text-coral-700' : t.status === 'answered' ? 'bg-emerald-100 text-emerald-700' : t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-cream-100 text-cream-500'}`}>
                {statusLabels[t.status]}
              </span>
            </div>
            <p className="text-[12px] text-brand-700 line-clamp-2">{t.message}</p>
            <div className="flex items-center justify-between mt-3 text-[10px] text-cream-500">
              <span>{dayLabel(new Date(t.createdAt))}</span>
              <span>{t.assignee || 'بدون مسئول'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className={`w-full max-w-lg rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise max-h-[85vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{selected.subject}</h3>
              <button onClick={() => setSelected(null)}><IconX className="w-5 h-5" /></button>
            </div>

            {/* Ticket Info */}
            <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-4 mb-4`}>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-cream-500">مشتری: </span><span className="font-bold">{selected.customer}</span></div>
                <div><span className="text-cream-500">موبایل: </span><span className="tnum">{selected.mobile}</span></div>
                <div><span className="text-cream-500">اولویت: </span><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${priorityColors[selected.priority]}`}>{priorityLabels[selected.priority]}</span></div>
                <div><span className="text-cream-500">مسئول: </span><span className="font-bold">{selected.assignee || '-'}</span></div>
              </div>
            </div>

            {/* Chat History */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {selected.replies?.map((r: any, i: number) => (
                <div key={i} className={`p-3 rounded-xl text-[12px] ${r.from === 'customer' ? (darkMode ? 'bg-[#1a212c]' : 'bg-cream-50') : (darkMode ? 'bg-brand-900/20' : 'bg-brand-50')}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[10px] text-cream-500">{r.from === 'customer' ? 'مشتری' : 'پشتیبانی'}</span>
                    <span className="text-[9px] text-cream-500">{dayLabel(new Date(r.date))}</span>
                  </div>
                  <p className="text-brand-700">{r.text}</p>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="flex gap-2">
              <input value={reply} onChange={e => setReply(e.target.value)} placeholder="پاسخ خود را بنویسید..." className="flex-1 rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
              <button onClick={() => {
                if (!reply.trim()) return;
                const updated = tickets.map((t: any) => t.id === selected.id ? { ...t, replies: [...(t.replies || []), { from: 'support', text: reply, date: new Date().toISOString() }], status: 'answered' } : t);
                setTickets(updated);
                setSelected({ ...selected, status: 'answered', replies: [...(selected.replies || []), { from: 'support', text: reply, date: new Date().toISOString() }] });
                setReply('');
                log(`پاسخ به تیکت ${selected.subject}`, selected.id);
              }} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1">
                <IconSend className="w-4 h-4" /> ارسال
              </button>
            </div>

            {/* Status Change */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-cream-200">
              {['open', 'pending', 'answered', 'closed'].map(s => (
                <button key={s} onClick={() => { setTickets(tickets.map((t: any) => t.id === selected.id ? { ...t, status: s } : t)); setSelected({ ...selected, status: s }); log(`تغییر وضعیت تیکت به ${statusLabels[s]}`, selected.id); }} className={`flex-1 py-2 rounded-xl text-[10px] font-bold ${selected.status === s ? 'bg-brand-900 text-white' : 'bg-cream-100 text-brand-700'}`}>
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
