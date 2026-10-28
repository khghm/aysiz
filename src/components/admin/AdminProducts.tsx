import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '../../services/queryClient';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { categories } from '../../data/products';
import { formatPrice, finalPrice, faNum } from '../../utils/format';
import * as api from '../../services/api';
import { IconCheck, IconX, IconPlus, IconEdit, IconTrash, IconPackage, IconUpload, IconAlert } from '../Icons';

export default function AdminProducts() {
  const { darkMode, log, isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ['admin', 'products', 'all'],
    queryFn: () => api.catalog.products('?limit=1000&includeInactive=true'),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const products = productsQuery.data?.items ?? [];
  const setProducts = useCallback((items: any[]) => {
    queryClient.setQueryData(['admin', 'products', 'all'], (current: any) => ({
      ...(current || {}),
      items,
      total: items.length,
    }));
  }, [queryClient]);
  const { setView, setSelectedProduct, setProducts: setShopProducts, addToast } = useShop();
  useEffect(() => {
    if (productsQuery.error) addToast('danger', `بارگذاری محصولات ناموفق بود: ${productsQuery.error.message}`);
  }, [addToast, productsQuery.error]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [showLowStockPanel, setShowLowStockPanel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const getThreshold = (p: any) => p.lowStockThreshold || 5;
  const getStockStatus = (p: any): 'out' | 'critical' | 'low' | 'ok' => {
    const threshold = getThreshold(p);
    if (p.stock === 0) return 'out';
    if (p.stock <= threshold * 0.4) return 'critical';
    if (p.stock <= threshold) return 'low';
    return 'ok';
  };

  const filtered = products.filter(p => {
    if (catFilter && p.category !== catFilter) return false;
    if (search && !p.name.includes(search) && !p.brand.includes(search)) return false;
    if (stockFilter === 'low') { const s = getStockStatus(p); if (s !== 'low' && s !== 'critical') return false; }
    if (stockFilter === 'out' && p.stock !== 0) return false;
    if (stockFilter === 'ok' && getStockStatus(p) !== 'ok') return false;
    return true;
  });
  const active = products.filter(p => p.effective).length;
  const lowStockProducts = products.filter(p => { const s = getStockStatus(p); return s === 'low' || s === 'critical'; });
  const lowStock = lowStockProducts.length;
  const outOfStock = products.filter(p => p.stock === 0).length;
  const criticalStock = products.filter(p => getStockStatus(p) === 'critical').length;

  const saveProduct = async () => {
    setFormError(null);
    if (!editing?.name?.trim()) { setFormError('نام محصول الزامی است'); return; }
    if (!Number.isFinite(Number(editing.price)) || Number(editing.price) <= 0) { setFormError('قیمت معتبر محصول الزامی است'); return; }
    if (!editing?.image && !pendingImageFile) { setFormError('تصویر محصول الزامی است'); return; }
    try {
      let product: any;
      if (editing.id) {
        product = await api.catalog.updateProduct(editing.id, editing);
      } else {
        const created: any = await api.catalog.createProduct({ ...editing, image: '', images: [], id: `p-${Date.now()}` });
        product = created?.product || created;
        if (pendingImageFile) {
          const res: any = await api.catalog.uploadProductImage(product.id, pendingImageFile);
          product = { ...product, image: res.image.url, images: [res.image] };
        }
      }
      const next = editing.id
        ? products.map((item) => item.id === product.id ? product : item)
        : [...products, product];
      setProducts(next);
      setShopProducts(next);
      log(`${editing.id ? 'ویرایش' : 'افزودن'} محصول ${product.name}`, product.id);
      addToast('success', 'محصول ذخیره شد');
      setPendingImageFile(null);
      setShowForm(false);
      setEditing(null);
    } catch (error: any) {
      addToast('danger', `ذخیره محصول ناموفق بود: ${error.message}`);
    }
  };
  const deleteProduct = async (id: string) => {
    if (confirm('آیا از حذف این محصول مطمئن هستید؟')) {
      try {
        await api.catalog.deleteProduct(id);
        const next = products.filter((product) => product.id !== id);
        setProducts(next);
        setShopProducts(next);
        log('حذف محصول', id, 'warning');
        addToast('success', 'محصول حذف شد');
      } catch (error: any) {
        addToast('danger', `حذف محصول ناموفق بود: ${error.message}`);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleImageUpload fired', e.target.files);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!editing?.id) {
      setPendingImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (editing) setEditing({ ...editing, image: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
      return;
    }
    (async () => {
      try {
        const mod = await import('../../services/api');
        const res: any = await mod.catalog.uploadProductImage(editing.id, file);
        console.log('upload result', res);
        setEditing((prev: any) => ({ ...prev, image: res.image.url, images: [...(prev.images || []), res.image] }));
       } catch (err: any) {
          console.error('upload error', err);
          addToast('danger', `آپلود تصویر ناموفق بود: ${err?.message || err}`);
      }
    })();
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { l: 'کل کالاها', v: faNum(products.length), c: 'bg-blue-50 text-blue-700', icon: <IconPackage className="w-5 h-5" /> },
          { l: 'فعال', v: faNum(active), c: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="w-5 h-5" /> },
          { l: 'کم‌موجود', v: faNum(lowStock), c: 'bg-amber-50 text-amber-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'بحرانی', v: faNum(criticalStock), c: 'bg-coral-50 text-coral-700', icon: <IconAlert className="w-5 h-5" /> },
          { l: 'ناموجود', v: faNum(outOfStock), c: 'bg-gray-100 text-gray-700', icon: <IconX className="w-5 h-5" /> },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-cream-500">{s.l}</p>
              <div className={`${s.c} p-1.5 rounded-lg`}>{s.icon}</div>
            </div>
            <p className={`text-lg font-extrabold tnum ${darkMode ? 'text-white' : 'text-brand-900'}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Low Stock Alert Panel */}
      {lowStock > 0 && (
        <div className={`rounded-2xl border-2 ${lowStock > 5 ? 'border-coral-300 bg-coral-50' : 'border-amber-300 bg-amber-50'} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`${lowStock > 5 ? 'bg-coral-500' : 'bg-amber-500'} p-2 rounded-lg`}>
                <IconAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`text-[13px] font-bold ${lowStock > 5 ? 'text-coral-700' : 'text-amber-700'}`}>هشدار موجودی کم</h3>
                <p className="text-[10px] text-cream-500">{faNum(lowStock)} محصول نیاز به شارژ مجدد دارند</p>
              </div>
            </div>
            <button onClick={() => setShowLowStockPanel(!showLowStockPanel)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${lowStock > 5 ? 'bg-coral-500 text-white' : 'bg-amber-500 text-white'}`}>
              {showLowStockPanel ? 'بستن' : 'مشاهده'}
            </button>
          </div>
          {showLowStockPanel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
              {lowStockProducts.slice(0, 9).map(p => {
                const status = getStockStatus(p);
                const threshold = getThreshold(p);
                const percentage = Math.min(100, (p.stock / threshold) * 100);
                return (
                  <div key={p.id} className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-200 bg-white'} p-3 flex items-center gap-3`}>
                    <img src={p.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${status === 'critical' ? 'bg-coral-500' : 'bg-amber-500'}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className={`tnum text-[10px] font-bold ${status === 'critical' ? 'text-coral-600' : 'text-amber-600'}`}>{faNum(p.stock)}/{faNum(threshold)}</span>
                      </div>
                    </div>
                    <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600 flex-shrink-0">
                      <IconEdit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو محصول..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="">همه دسته‌ها</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value as any)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه وضعیت‌ها</option>
          <option value="low">کم‌موجود</option>
          <option value="out">ناموجود</option>
          <option value="ok">موجودی کافی</option>
        </select>
        <button onClick={() => { setEditing({ name: '', category: 'underwear', subcategory: 'briefs', brand: 'تای سیز', price: 0, discount: 0, rating: 0, image: '', book: [], colors: [], sizes: [], stock: 0, sales: 0, isNew: true, effective: true, description: '', features: [], specs: {}, sku: '', commission: 8, vendor: '', lowStockThreshold: 5 }); setShowForm(true); }} className="bg-brand-900 text-white px-4 py-2 rounded-xl text-[12px] font-bold flex items-center gap-1"><IconPlus className="w-4 h-4" />افزودن محصول</button>
      </div>

      {/* Products Table */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className={`border-y ${darkMode ? 'border-white/10 bg-white/5' : 'border-cream-300 bg-cream-100/70'}`}>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">تصویر</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نام</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">برند</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">قیمت</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">موجودی</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">وضعیت موجودی</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">نمایش</th>
              <th className="text-start py-2.5 px-3 font-bold text-cream-500 text-[10.5px]">عملیات</th>
            </tr></thead>
            <tbody>{filtered.map(p => {
              const status = getStockStatus(p);
              const threshold = getThreshold(p);
              const percentage = Math.min(100, (p.stock / threshold) * 100);
              const statusConfig = {
                out: { label: 'ناموجود', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
                critical: { label: 'بحرانی', color: 'bg-coral-100 text-coral-700', dot: 'bg-coral-500' },
                low: { label: 'کم‌موجود', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
                ok: { label: 'موجود', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
              }[status];
              return (
              <tr key={p.id} className={`border-b ${darkMode ? 'border-white/5 hover:bg-white/5' : 'border-cream-100 hover:bg-brand-50/40'} ${status === 'critical' ? (darkMode ? 'bg-coral-950/20' : 'bg-coral-50/50') : status === 'low' ? (darkMode ? 'bg-amber-950/20' : 'bg-amber-50/30') : ''}`}>
                <td className="py-2 px-3"><img src={p.image} className="w-9 h-9 rounded-lg object-cover" alt="" /></td>
                <td className="py-2 px-3 font-bold">{p.name}</td>
                <td className="py-2 px-3">{p.brand}</td>
                <td className="py-2 px-3 tnum">{formatPrice(finalPrice(p.price, p.discount))}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className={`tnum font-bold ${status === 'critical' ? 'text-coral-600' : status === 'low' ? 'text-amber-600' : status === 'out' ? 'text-gray-500' : ''}`}>{faNum(p.stock)}</span>
                    <div className="w-16 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${status === 'critical' ? 'bg-coral-500' : status === 'low' ? 'bg-amber-500' : status === 'out' ? 'bg-gray-400' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="py-2 px-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                    {statusConfig.label}
                  </span>
                </td>
                <td className="py-2 px-3"><button onClick={async () => {
                  const updated = { ...p, effective: !p.effective };
                  try {
                    await api.catalog.updateProduct(p.id, updated);
                    const next = products.map((item) => item.id === p.id ? updated : item);
                    setProducts(next);
                    setShopProducts(next);
                    log(`${updated.effective ? 'فعال' : 'غیرفعال'} کردن محصول ${p.name}`, p.id);
                  } catch (error: any) {
                    addToast('danger', `تغییر وضعیت محصول ناموفق بود: ${error.message}`);
                  }
                }} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.effective ? 'bg-emerald-100 text-emerald-700' : 'bg-cream-100 text-cream-500'}`}>{p.effective ? 'فعال' : 'غیرفعال'}</button></td>
                <td className="py-2 px-3 flex gap-1">
                  <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-cream-100 text-brand-600"><IconEdit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-coral-50 text-coral-500"><IconTrash className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
      {showForm && editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{editing.id ? 'ویرایش محصول' : 'افزودن محصول'}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); setFormError(null); setPendingImageFile(null); }} className="p-1.5 rounded-lg hover:bg-cream-100 text-cream-500"><IconX className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">نام محصول</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">دسته‌بندی</label><select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">برند</label><input value={editing.brand} onChange={e => setEditing({ ...editing, brand: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">قیمت (تومان)</label><input type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">تخفیف (٪)</label><input type="number" value={editing.discount} onChange={e => setEditing({ ...editing, discount: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
                <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">موجودی</label><input type="number" value={editing.stock} onChange={e => setEditing({ ...editing, stock: +e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none" /></div>
              </div>
              <div className={`rounded-xl border ${darkMode ? 'border-white/10 bg-[#1a212c]' : 'border-amber-200 bg-amber-50'} p-3`}>
                <label className="text-[11px] font-bold text-amber-700 mb-1 flex items-center gap-1"><IconAlert className="w-3.5 h-3.5" /> حد هشدار موجودی</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={editing.lowStockThreshold || 5} onChange={e => setEditing({ ...editing, lowStockThreshold: +e.target.value })} className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] outline-none" min="1" />
                  <span className="text-[10px] text-amber-600">عدد</span>
                </div>
                <p className="text-[10px] text-cream-500 mt-1">وقتی موجودی به این عدد برسد، هشدار نمایش داده می‌شود</p>
              </div>
              <div><label className="text-[11px] font-bold text-cream-500 mb-1 block">توضیحات</label><textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="w-full rounded-xl border border-cream-300 px-3 py-2 text-[12px] outline-none h-20 resize-none" /></div>
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-1 block">تصویر محصول</label>
                <div className="flex items-center gap-3">
                  {editing.image && <img src={editing.image} className="w-16 h-16 rounded-xl object-cover" alt="" />}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <button onClick={() => { console.log('upload button clicked', editing?.id); if (fileRef.current) fileRef.current.value = ''; fileRef.current?.click(); }} className="border border-cream-300 rounded-xl px-3 py-2 text-[11px] font-bold flex items-center gap-1 hover:border-brand-400"><IconUpload className="w-4 h-4" />آپلود تصویر</button>
                  {editing.image && <button onClick={async () => {
                    const img = (editing.images || []).find((i: any) => i.url === editing.image);
                    if (editing.id && img?.id) {
                      try { await api.catalog.deleteProductImage(editing.id, img.id); } catch (e: any) { addToast('danger', `حذف تصویر ناموفق بود: ${e?.message || e}`); }
                    }
                    setEditing({ ...editing, image: '', images: [] });
                    setPendingImageFile(null);
                  }} className="border border-coral-300 text-coral-600 rounded-xl px-3 py-2 text-[11px] font-bold flex items-center gap-1 hover:bg-coral-50"><IconTrash className="w-4 h-4" />حذف تصویر</button>}
                </div>
              </div>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={editing.isNew} onChange={e => setEditing({ ...editing, isNew: e.target.checked })} />جدید</label>
                <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={editing.effective} onChange={e => setEditing({ ...editing, effective: e.target.checked })} />فعال در سایت</label>
              </div>
            </div>
              {formError && <div className="mt-3 rounded-xl bg-coral-50 border border-coral-200 px-3 py-2 text-[11px] font-bold text-coral-700">{formError}</div>}
              <div className="flex gap-2 mt-4">
              <button onClick={saveProduct} className="flex-1 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px]">ذخیره</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-cream-300 text-[12px] font-bold">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
