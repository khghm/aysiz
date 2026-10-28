import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { content as contentApi } from '../../services/api';
import { faNum } from '../../utils/format';
import { IconPlus, IconEdit, IconTrash, IconEye, IconClipboard, IconCamera } from '../Icons';

export default function AdminContentManager() {
  const { pages, setPages, banners, setBanners, posts, setPosts, darkMode, log } = useAdmin();
  const [tab, setTab] = useState<'pages' | 'banners' | 'blog' | 'seo'>('pages');
  const [editing, setEditing] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const openEditor = (item: any) => {
    setEditing(item);
    setImageFile(null);
    setSaveError('');
  };

  const saveEditing = async () => {
    if (!editing) return;
    const title = String(editing.title || '').trim();
    if (!title) {
      setSaveError('عنوان محتوا الزامی است');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      let updated = { ...editing, title };
      const exists = [...pages, ...banners, ...posts].some((item: any) => item.id === updated.id);
      if (!updated.id) updated.id = `content-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      if (imageFile) {
        const type = updated.slug !== undefined ? 'pages' : updated.category !== undefined ? 'posts' : 'banners';
        const image = await contentApi.uploadContentImage(type, updated.id, imageFile, title);
        updated = {
          ...updated,
          image: image.url,
          images: [...(Array.isArray(updated.images) ? updated.images : []), image],
        };
      }

      if (exists) {
        if (pages.some((item: any) => item.id === updated.id)) setPages(pages.map((item: any) => item.id === updated.id ? updated : item));
        else if (posts.some((item: any) => item.id === updated.id)) setPosts(posts.map((item: any) => item.id === updated.id ? updated : item));
        else setBanners(banners.map((item: any) => item.id === updated.id ? updated : item));
      } else if (updated.slug !== undefined) setPages([...pages, updated]);
      else if (updated.category !== undefined) setPosts([...posts, updated]);
      else setBanners([...banners, updated]);

      log(`${exists ? 'ویرایش' : 'ایجاد'} محتوا`, title);
      setEditing(null);
      setImageFile(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'ذخیره محتوا ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    pages: pages.length,
    banners: banners.length,
    activeBanners: banners.filter((b: any) => b.active).length,
    posts: posts.length,
    totalViews: posts.reduce((s: number, p: any) => s + (p.views || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'صفحات', v: faNum(stats.pages), c: 'bg-blue-50 text-blue-700', icon: <IconClipboard className="w-5 h-5" /> },
          { l: 'بنرهای فعال', v: `${faNum(stats.activeBanners)}/${faNum(stats.banners)}`, c: 'bg-purple-50 text-purple-700', icon: <IconCamera className="w-5 h-5" /> },
          { l: 'پست‌های وبلاگ', v: faNum(stats.posts), c: 'bg-emerald-50 text-emerald-700', icon: <IconEdit className="w-5 h-5" /> },
          { l: 'کل بازدید', v: faNum(stats.totalViews), c: 'bg-amber-50 text-amber-700', icon: <IconEye className="w-5 h-5" /> },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2"><p className="text-[10px] text-cream-500">{k.l}</p><div className={k.c + ' p-1.5 rounded-lg'}>{k.icon}</div></div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-cream-300">
        {[{ k: 'pages', l: 'صفحات ایستا' }, { k: 'banners', l: 'بنرها و اسلایدر' }, { k: 'blog', l: 'وبلاگ' }, { k: 'seo', l: 'ابزار سئو' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`pb-2 px-3 text-[12px] font-bold border-b-2 transition-colors ${tab === t.k ? 'border-brand-900 text-brand-900' : 'border-transparent text-cream-500 hover:text-brand-700'}`}>{t.l}</button>
        ))}
      </div>

      {/* Pages Tab */}
      {tab === 'pages' && (
        <div className="space-y-3">
          <button onClick={() => openEditor({ id: '', slug: '', title: '', image: '', content: '', metaTitle: '', metaDesc: '', keywords: '', published: true })} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1 shadow-lg shadow-brand-900/25"><IconPlus className="w-4 h-4" />صفحه جدید</button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pages.map((p: any) => (
              <div key={p.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 hover:shadow-lg transition-all`}>
                <div className="flex items-center gap-3 mb-2">
                  {p.image && <img src={p.image} className="w-12 h-12 rounded-lg object-cover" alt="" />}
                  <div className="flex-1 flex items-center justify-between">
                    <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{p.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.published ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{p.published ? 'منتشر شده' : 'پیش‌نویس'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-cream-500 mb-3 font-mono">/{p.slug}</p>
                <div className="flex gap-1">
                  <button onClick={() => openEditor(p)} className="flex-1 py-1.5 rounded-lg bg-cream-100 text-brand-700 text-[10px] font-bold flex items-center justify-center gap-1"><IconEdit className="w-3 h-3" /> ویرایش</button>
                  <button onClick={() => { setPages(pages.filter((x: any) => x.id !== p.id)); log('حذف صفحه', p.title, 'warning'); }} className="py-1.5 px-3 rounded-lg bg-coral-100 text-coral-700 text-[10px] font-bold"><IconTrash className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banners Tab */}
      {tab === 'banners' && (
        <div className="space-y-3">
          <button onClick={() => openEditor({ id: '', title: '', image: '', subtitle: '', btnText: 'مشاهده', position: 'home', active: true, expiresAt: '', color1: '#1A2238', color2: '#3d61a3' })} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1 shadow-lg shadow-brand-900/25"><IconPlus className="w-4 h-4" />بنر جدید</button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {banners.map((b: any) => (
              <div key={b.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden hover:shadow-lg transition-all`}>
                <div className="relative h-24 flex items-center justify-center overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${b.color1}, ${b.color2})` }}>
                  {b.image && <img src={b.image} className="absolute inset-0 h-full w-full object-cover" alt="" />}
                  <div className="relative z-10 rounded bg-black/25 px-2 text-center">
                    <p className="text-[13px] font-bold">{b.title}</p>
                    <p className="text-[10px] opacity-80">{b.subtitle}</p>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-cream-500">جایگاه: {b.position} | انقضا: {b.expiresAt}</p>
                  </div>
                  <button onClick={() => openEditor(b)} className="py-1.5 px-3 rounded-lg bg-cream-100 text-brand-700 text-[10px] font-bold"><IconEdit className="w-3 h-3" /></button>
                  <button onClick={() => setBanners(banners.map((x: any) => x.id === b.id ? { ...x, active: !x.active } : x))} className={`w-10 h-5 rounded-full relative transition-colors ${b.active ? 'bg-emerald-500' : 'bg-cream-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${b.active ? 'right-0.5' : 'right-5'}`}></span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blog Tab */}
      {tab === 'blog' && (
        <div className="space-y-3">
          <button onClick={() => openEditor({ id: '', title: '', image: '', category: '', tags: [], content: '', views: 0, date: new Date().toISOString(), color1: '#667eea', color2: '#764ba2', published: true, comments: 0 })} className="bg-brand-900 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1 shadow-lg shadow-brand-900/25"><IconPlus className="w-4 h-4" />پست جدید</button>
          <div className="space-y-3">
            {posts.map((p: any) => (
              <div key={p.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4 hover:shadow-lg transition-all flex gap-4`}>
                {p.image
                  ? <img src={p.image} className="w-20 h-20 rounded-xl flex-shrink-0 object-cover" alt="" />
                  : <div className="w-20 h-20 rounded-xl flex-shrink-0" style={{ background: `linear-gradient(135deg, ${p.color1 || '#667eea'}, ${p.color2 || '#764ba2'})` }} />}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{p.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${p.published ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{p.published ? 'منتشر شده' : 'پیش‌نویس'}</span>
                  </div>
                  <p className="text-[10px] text-cream-500">{p.category} | {faNum(p.views || 0)} بازدید | {faNum(p.comments || 0)} نظر</p>
                  <div className="flex gap-1 mt-2">
                    {p.tags?.slice(0, 3).map((t: string) => <span key={t} className="text-[9px] bg-cream-100 text-brand-700 rounded-full px-2 py-0.5">{t}</span>)}
                    <button onClick={() => openEditor(p)} aria-label={`ویرایش ${p.title}`} className="py-1.5 px-3 rounded-lg bg-cream-100 text-brand-700 text-[10px] font-bold"><IconEdit className="w-3 h-3" /></button>
                    <button onClick={() => {
                      if (!window.confirm(`پست «${p.title}» حذف شود؟`)) return;
                      setPosts(posts.filter((post: any) => post.id !== p.id));
                      log('حذف پست وبلاگ', p.title, 'warning');
                    }} aria-label={`حذف ${p.title}`} className="py-1.5 px-3 rounded-lg bg-coral-100 text-coral-700 text-[10px] font-bold"><IconTrash className="w-3 h-3" /></button>
                   </div>
                 </div>
               </div>
             ))}
           </div>
         </div>
       )}

      {/* SEO Tab */}
      {tab === 'seo' && (
        <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
          <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>ابزار سئو - بررسی وضعیت متا</h3>
          <div className="space-y-2">
            {pages.map((p: any) => (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'}`}>
                <div>
                  <p className="text-[12px] font-bold">{p.title}</p>
                  <p className="text-[10px] text-cream-500">/{p.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.metaTitle ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">متا تنظیم شده</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-coral-100 text-coral-700">فاقد متا</span>
                  )}
                  <button onClick={() => openEditor(p)} className="p-1.5 rounded-lg hover:bg-cream-100"><IconEdit className="w-3.5 h-3.5 text-brand-600" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl bg-brand-50 border border-brand-200">
            <h4 className="text-[12px] font-bold text-brand-900 mb-2">پیش‌نمایش نتایج گوگل</h4>
            <div className="bg-white rounded-lg p-3 border border-cream-200">
              <p className="text-[13px] text-blue-700 font-bold">عنوان صفحه در نتایج گوگل نمایش داده می‌شود</p>
              <p className="text-[11px] text-emerald-700">www.tasis.ir/page-slug</p>
              <p className="text-[11px] text-cream-500 mt-1">توضیحات متا در این قسمت نمایش داده می‌شود. این متن باید جذاب و شامل کلمات کلیدی باشد.</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { if (!saving) { setEditing(null); setImageFile(null); } }}>
          <div className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>{editing.id ? 'ویرایش' : 'ایجاد'} محتوا</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">عنوان</label>
                <input autoFocus value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">تصویر</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => {
                    const file = event.target.files?.[0] || null;
                    setImageFile(file);
                    setSaveError('');
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      setImageFile(null);
                      setSaveError('حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد');
                      event.target.value = '';
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setEditing((current: any) => current ? { ...current, image: String(reader.result || '') } : current);
                    reader.onerror = () => setSaveError('خواندن تصویر ناموفق بود');
                    reader.readAsDataURL(file);
                  }} className="min-w-0 flex-1 text-[11px]" />
                  {editing.image && <img src={editing.image} className="w-16 h-16 rounded-xl object-cover" alt="" />}
                </div>
              </div>
              {editing.slug !== undefined && <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">نامک (slug)</label><input value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none font-mono" /></div>}
              {editing.category !== undefined && <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">دسته‌بندی</label><input value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>}
              {editing.category !== undefined && <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">خلاصه</label><textarea value={editing.summary || ''} onChange={e => setEditing({ ...editing, summary: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none h-16 resize-none" /></div>}
              {editing.category !== undefined && editing.cat !== undefined && <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">زمان مطالعه</label><input value={editing.readTime || ''} onChange={e => setEditing({ ...editing, readTime: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>}
              {editing.subtitle !== undefined && <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">زیرعنوان</label><input value={editing.subtitle || ''} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>}
              {editing.btnText !== undefined && <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">متن دکمه</label><input value={editing.btnText || ''} onChange={e => setEditing({ ...editing, btnText: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>}
              {editing.content !== undefined && <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">محتوا (مارک‌داون)</label><textarea value={editing.content || ''} onChange={e => setEditing({ ...editing, content: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none h-32 resize-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" /></div>}
              {editing.slug !== undefined && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">متا تایتل</label><input value={editing.metaTitle || ''} onChange={e => setEditing({ ...editing, metaTitle: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
                  <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">کلمات کلیدی</label><input value={editing.keywords || ''} onChange={e => setEditing({ ...editing, keywords: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
                </div>
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">متا دیسکریپشن</label><textarea value={editing.metaDesc || ''} onChange={e => setEditing({ ...editing, metaDesc: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none h-16 resize-none" /></div>
              </>}
            </div>
            {saveError && <p role="alert" className="mt-3 text-[11px] text-coral-700">{saveError}</p>}
            <button onClick={saveEditing} disabled={saving} className="w-full mt-4 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px] shadow-lg shadow-brand-900/25 disabled:opacity-60">
              {saving ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
