import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { faNum } from '../../utils/format';
import { IconPlus } from '../Icons';

export default function AdminTasks() {
  const { tasks, setTasks, darkMode, log } = useAdmin();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', desc: '', assignee: '', priority: 'medium', deadline: '', status: 'todo' });
  const columns = [{ id: 'todo', label: 'در انتظار', color: 'bg-cream-100' }, { id: 'doing', label: 'در حال انجام', color: 'bg-blue-100' }, { id: 'done', label: 'انجام شده', color: 'bg-emerald-100' }];

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(true)} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1"><IconPlus className="w-4 h-4" />وظیفه جدید</button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => (
          <div key={col.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <h3 className={`text-[12px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-3 flex items-center gap-2`}><span className={`w-2 h-2 rounded-full ${col.color === 'bg-cream-100' ? 'bg-cream-400' : col.color === 'bg-blue-100' ? 'bg-blue-500' : 'bg-emerald-500'}`} />{col.label} ({faNum(tasks.filter((t: any) => t.status === col.id).length)})</h3>
            <div className="space-y-2">{tasks.filter((t: any) => t.status === col.id).map((t: any) => (
              <div key={t.id} className={`rounded-xl border ${darkMode ? 'border-white/10' : 'border-cream-200'} p-3`}>
                <p className="text-[12px] font-bold">{t.title}</p>
                <p className="text-[10px] text-cream-500 mt-0.5">{t.assignee} | {t.priority}</p>
                <div className="flex gap-1 mt-2">
                  {columns.filter(c => c.id !== col.id).map(c => (<button key={c.id} onClick={() => { setTasks(tasks.map((x: any) => x.id === t.id ? { ...x, status: c.id } : x)); }} className="px-2 py-0.5 rounded text-[9px] font-bold bg-cream-100 text-brand-700">{c.label}</button>))}
                  <button onClick={() => { setTasks(tasks.filter((x: any) => x.id !== t.id)); }} className="px-2 py-0.5 rounded text-[9px] font-bold bg-coral-100 text-coral-700">حذف</button>
                </div>
              </div>
            ))}</div>
          </div>
        ))}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className={`w-full max-w-sm rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-3">وظیفه جدید</h3>
            <div className="space-y-2">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="عنوان" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <input value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="توضیحات" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <input value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} placeholder="مسئول" className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none"><option value="low">کم</option><option value="medium">متوسط</option><option value="high">زیاد</option></select>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" />
            </div>
            <button onClick={() => { setTasks([...tasks, { ...form, id: `tsk-${Date.now()}` }]); setShowForm(false); setForm({ title: '', desc: '', assignee: '', priority: 'medium', deadline: '', status: 'todo' }); log('ایجاد وظیفه جدید', form.title); }} className="w-full mt-3 bg-brand-900 text-white py-2 rounded-xl font-bold text-[12px]">ذخیره</button>
          </div>
        </div>
      )}
    </div>
  );
}
