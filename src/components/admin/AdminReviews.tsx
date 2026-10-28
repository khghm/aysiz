import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '../../services/queryClient';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { faNum, dayLabel } from '../../utils/format';
import * as api from '../../services/api';
import { IconUser, IconStar, IconClock, IconCheck, IconX, IconEye, IconClipboard } from '../Icons';

export default function AdminReviews() {
  const { darkMode, log, isAdmin } = useAdmin();
  const { products, addToast } = useShop();
  const queryClient = useQueryClient();
  const reviewsQuery = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: () => api.catalog.reviews('', ''),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const reviews = reviewsQuery.data?.items ?? [];
  const setReviews = useCallback((items: any[]) => {
    queryClient.setQueryData(['admin', 'reviews'], { items });
    void queryClient.invalidateQueries({ queryKey: ['catalog', 'reviews'] });
  }, [queryClient]);
  useEffect(() => {
    if (reviewsQuery.error) addToast('danger', `بارگذاری دیدگاه‌ها ناموفق بود: ${reviewsQuery.error.message}`);
  }, [addToast, reviewsQuery.error]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [reply, setReply] = useState('');

  const filtered = reviews.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (ratingFilter > 0 && r.rating < ratingFilter) return false;
    if (search && !r.author.includes(search) && !r.text.includes(search)) return false;
    return true;
  });

  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    avgRating: reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length * 100) : 0
  }));

  const handleApprove = async (id: string) => {
    try {
      const saved = await api.catalog.updateReview(id, { status: 'approved' });
      setReviews(reviews.map((item) => item.id === id ? saved : item));
      log('تأیید نظر', id);
    } catch (error: any) {
      addToast('danger', `تأیید دیدگاه ناموفق بود: ${error.message}`);
    }
  };
  const handleReject = async (id: string) => {
    try {
      const saved = await api.catalog.updateReview(id, { status: 'rejected' });
      setReviews(reviews.map((item) => item.id === id ? saved : item));
      log('رد نظر', id, 'warning');
    } catch (error: any) {
      addToast('danger', `رد دیدگاه ناموفق بود: ${error.message}`);
    }
  };
  const handleReply = async () => {
    if (!reply.trim() || !selectedReview) return;
    try {
      const saved = await api.catalog.updateReview(selectedReview.id, { reply });
      setReviews(reviews.map((item) => item.id === selectedReview.id ? saved : item));
      setSelectedReview(saved);
      setReply('');
      log('پاسخ به نظر', selectedReview.id);
    } catch (error: any) {
      addToast('danger', `ثبت پاسخ ناموفق بود: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { l: 'کل نظرات', v: faNum(stats.total), c: 'bg-blue-50 text-blue-700', icon: <IconClipboard className="w-5 h-5" /> },
          { l: 'در انتظار بررسی', v: faNum(stats.pending), c: 'bg-amber-50 text-amber-700', icon: <IconClock className="w-5 h-5" /> },
          { l: 'تأیید شده', v: faNum(stats.approved), c: 'bg-emerald-50 text-emerald-700', icon: <IconCheck className="w-5 h-5" /> },
          { l: 'رد شده', v: faNum(stats.rejected), c: 'bg-coral-50 text-coral-700', icon: <IconX className="w-5 h-5" /> },
          { l: 'میانگین امتیاز', v: faNum(stats.avgRating.toFixed(1)), c: 'bg-purple-50 text-purple-700', icon: <IconStar className="w-5 h-5" /> },
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

      {/* Rating Distribution */}
      <div className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5`}>
        <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-brand-900'} mb-4`}>توزیع امتیازات</h3>
        <div className="space-y-2">
          {ratingDistribution.map(r => (
            <div key={r.star} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-16">
                <IconStar className="w-4 h-4 text-amber-500" filled />
                <span className="text-[12px] font-bold">{faNum(r.star)}</span>
              </div>
              <div className="flex-1 h-2.5 bg-cream-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${r.percentage}%` }}></div>
              </div>
              <span className="tnum text-[11px] font-bold w-12 text-left">{faNum(r.count)} ({faNum(r.percentage.toFixed(0))}٪)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو در نظرات..." className="flex-1 min-w-[200px] rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none" />
        <select value={filter} onChange={e => setFilter(e.target.value as any)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value="all">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="approved">تأیید شده</option>
          <option value="rejected">رد شده</option>
        </select>
        <select value={ratingFilter} onChange={e => setRatingFilter(+e.target.value)} className="rounded-xl border border-cream-300 bg-white px-3 py-2 text-[12px] outline-none">
          <option value={0}>همه امتیازات</option>
          <option value={5}>۵ ستاره</option>
          <option value={4}>۴ ستاره و بالاتر</option>
          <option value={3}>۳ ستاره و بالاتر</option>
          <option value={2}>۲ ستاره و بالاتر</option>
          <option value={1}>۱ ستاره</option>
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filtered.map(r => {
          const product = products.find(p => p.id === r.productId);
          return (
            <div key={r.id} className={`rounded-2xl border ${darkMode ? 'border-white/10 bg-[#151b26]' : 'border-cream-300 bg-white'} p-5 hover:shadow-lg transition-all`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                    <IconUser className="w-5 h-5 text-brand-700" />
                  </div>
                  <div>
                    <p className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>{r.author}</p>
                    <p className="text-[10px] text-cream-500">{product?.name || 'محصول نامشخص'} | {dayLabel(new Date(r.date))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <IconStar key={i} className={`w-4 h-4 ${i < r.rating ? 'text-amber-500' : 'text-cream-300'}`} filled={i < r.rating} />)}</div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-coral-100 text-coral-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status === 'approved' ? 'تأیید شده' : r.status === 'rejected' ? 'رد شده' : 'در انتظار'}
                  </span>
                </div>
              </div>
              
              <p className={`text-[12px] ${darkMode ? 'text-brand-200' : 'text-brand-700'} mb-3 leading-6`}>{r.text}</p>
              
              {r.pros && r.pros.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-emerald-700 mb-1">نقاط قوت:</p>
                  <div className="flex flex-wrap gap-1">{r.pros.map((p: any, i: number) => <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">{p}</span>)}</div>
                </div>
              )}
              
              {r.cons && r.cons.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-coral-700 mb-1">نقاط ضعف:</p>
                  <div className="flex flex-wrap gap-1">{r.cons.map((c: any, i: number) => <span key={i} className="text-[10px] bg-coral-50 text-coral-700 rounded-full px-2 py-0.5">{c}</span>)}</div>
                </div>
              )}

              {r.reply && (
                <div className={`rounded-lg ${darkMode ? 'bg-[#1a212c]' : 'bg-brand-50'} p-3 mb-3`}>
                  <p className="text-[10px] font-bold text-brand-700 mb-1">پاسخ مدیر:</p>
                  <p className="text-[11px] text-brand-700">{r.reply}</p>
                </div>
              )}

              <div className="flex gap-2">
                {r.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(r.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-bold hover:bg-emerald-200 transition-colors">
                      <IconCheck className="w-3.5 h-3.5" /> تأیید
                    </button>
                    <button onClick={() => handleReject(r.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-coral-100 text-coral-700 text-[11px] font-bold hover:bg-coral-200 transition-colors">
                      <IconX className="w-3.5 h-3.5" /> رد
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedReview(r)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cream-100 text-brand-700 text-[11px] font-bold hover:bg-cream-200 transition-colors">
                  <IconEye className="w-3.5 h-3.5" /> جزئیات
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedReview(null)}>
          <div className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl ${darkMode ? 'bg-[#151b26]' : 'bg-white'} p-6 animate-rise`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-brand-900'}`}>جزئیات نظر</h3>
              <button onClick={() => setSelectedReview(null)}><IconX className="w-5 h-5" /></button>
            </div>

            <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-cream-50'} p-4 mb-4`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                  <IconUser className="w-6 h-6 text-brand-700" />
                </div>
                <div>
                  <p className="font-bold">{selectedReview.author}</p>
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <IconStar key={i} className={`w-4 h-4 ${i < selectedReview.rating ? 'text-amber-500' : 'text-cream-300'}`} filled={i < selectedReview.rating} />)}</div>
                </div>
              </div>
              <p className="text-[12px] leading-6">{selectedReview.text}</p>
            </div>

            {selectedReview.reply ? (
              <div className={`rounded-xl ${darkMode ? 'bg-[#1a212c]' : 'bg-brand-50'} p-4`}>
                <p className="text-[11px] font-bold text-brand-700 mb-2">پاسخ مدیر:</p>
                <p className="text-[12px]">{selectedReview.reply}</p>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-bold text-cream-500 mb-2 block">پاسخ به نظر:</label>
                <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="پاسخ خود را بنویسید..." className="w-full rounded-xl border border-cream-300 px-3 py-2.5 text-[12px] outline-none h-24 resize-none" />
                <button onClick={handleReply} className="w-full mt-2 bg-brand-900 text-white py-2.5 rounded-xl font-bold text-[12px]">ارسال پاسخ</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
