import { useShop } from '../../context/ShopContext';

export default function Toasts() {
  const { toasts } = useShop();
  return (
    <div className="fixed bottom-6 left-6 z-[999] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`animate-rise rounded-xl px-4 py-3 text-sm font-bold shadow-lg ${t.type === 'success' ? 'bg-emerald-600 text-white' : t.type === 'danger' ? 'bg-coral-500 text-white' : 'bg-brand-900 text-white'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
