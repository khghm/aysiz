import { useShop } from '../../context/ShopContext';
import { faNum } from '../../utils/format';
import { IconChevronRight } from '../Icons';

export default function BlogPostView() {
  const { articles, selectedPost, setView } = useShop();
  const article = articles.find(a => a.id === selectedPost);
  
  if (!article) return <div className="max-w-7xl mx-auto px-4 py-6 text-center">مقاله یافت نشد</div>;

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-bold text-brand-900 mt-6 mb-3">{line.replace('## ', '')}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-bold text-brand-800 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      } else if (line.startsWith('- ')) {
        return <li key={i} className="text-[14px] text-brand-700 mr-4 mb-1 list-disc">{line.replace('- ', '')}</li>;
      } else if (line.trim()) {
        return <p key={i} className="text-[14px] text-brand-700 leading-7 mb-3">{line}</p>;
      }
      return null;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade">
      <button onClick={() => setView('blog')} className="flex items-center gap-2 text-brand-600 hover:text-brand-900 mb-4 text-[13px] font-bold">
        <IconChevronRight className="w-4 h-4" /> بازگشت به مجله
      </button>
      {article.image && (
        <img src={article.image} alt={article.title} className="w-full h-64 sm:h-80 object-cover rounded-2xl mb-6" />
      )}
      <div className="flex items-center gap-3 text-[11px] text-cream-500 mb-3">
        <span className="bg-brand-100 text-brand-700 px-2 py-1 rounded-lg font-bold">{article.cat}</span>
        <span>{article.date}</span>
        <span>|</span>
        <span>{article.readTime} مطالعه</span>
        <span>|</span>
        <span>{faNum(article.views)} بازدید</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand-900 mb-4">{article.title}</h1>
      <p className="text-[15px] text-brand-600 leading-8 mb-6">{article.summary}</p>
      <div className="prose max-w-none">
        {renderContent(article.content)}
      </div>
      <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-cream-200">
        {article.tags.map(t => (
          <span key={t} className="text-[11px] bg-cream-100 text-brand-700 rounded-full px-3 py-1 font-bold">{t}</span>
        ))}
      </div>
    </div>
  );
}
