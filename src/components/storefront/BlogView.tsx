import { useShop } from '../../context/ShopContext';
import { faNum } from '../../utils/format';

export default function BlogView() {
  const { articles, setView, setSelectedPost } = useShop();
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade">
      <h1 className="font-display text-xl text-brand-900 mb-6">مجله تای سیز</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map(a => (
          <div key={a.id} className="rounded-2xl overflow-hidden border border-cream-200 hover:shadow-lg transition-all cursor-pointer" onClick={() => { setSelectedPost(a.id); setView('post'); }}>
            {a.image ? (
              <img src={a.image} alt={a.title} className="w-full h-40 object-cover" />
            ) : (
              <div className="h-40" style={{ background: `linear-gradient(135deg, ${a.colors[0]}, ${a.colors[1]})` }} />
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 text-[10px] text-cream-500 mb-1"><span>{a.cat}</span><span>|</span><span>{a.readTime}</span><span>|</span><span>{faNum(a.views)} بازدید</span></div>
              <h3 className="text-[14px] font-bold text-brand-900">{a.title}</h3>
              <p className="text-[12px] text-cream-500 mt-1 line-clamp-2">{a.summary}</p>
              <div className="flex flex-wrap gap-1 mt-2">{a.tags.map(t => <span key={t} className="text-[9px] bg-cream-100 text-brand-700 rounded-full px-2 py-0.5">{t}</span>)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
