import { useShop } from '../../context/ShopContext';
import { Product } from '../../data/products';
import { formatPrice, finalPrice, faNum } from '../../utils/format';
import { IconHeart, IconPlus } from '../Icons';
import Stars from './Stars';

export default function ProductCard({ product }: { product: Product }) {
  const { setSelectedProduct, setView, addToCart, toggleWishlist, wishlist, money } = useShop();
  const liked = wishlist.includes(product.id);
  const fp = finalPrice(product.price, product.discount);
  return (
    <div className="group rounded-2xl border border-cream-300 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-cream-50 cursor-pointer" onClick={() => { setSelectedProduct(product.id); setView('product'); }}>
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        {product.discount > 0 && (
          <span className="absolute top-2 start-2 bg-coral-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">{faNum(product.discount)}٪</span>
        )}
        {product.isNew && (
          <span className="absolute top-2 end-2 bg-emerald-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">جدید</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }} className="absolute bottom-2 end-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow hover:scale-110 transition-transform">
          <IconHeart className={`w-4 h-4 ${liked ? 'text-coral-500' : 'text-brand-700'}`} filled={liked} />
        </button>
      </div>
      <div className="p-3">
        <p className="text-[10px] text-brand-600 font-medium mb-0.5">{product.brand}</p>
        <h3 className="text-[12px] font-bold text-brand-900 line-clamp-2 mb-1.5 cursor-pointer hover:text-brand-600" onClick={() => { setSelectedProduct(product.id); setView('product'); }}>{product.name}</h3>
        <Stars rating={product.rating} />
        <div className="mt-2 flex items-center justify-between">
          <div>
            {product.discount > 0 && <span className="text-[10px] text-cream-500 line-through block">{formatPrice(product.price)}</span>}
            <span className="text-[13px] font-extrabold text-brand-900">{formatPrice(fp)} <span className="text-[9px] font-normal">تومان</span></span>
          </div>
          <button onClick={() => addToCart({ product, qty: 1, size: product.sizes[0], color: product.colors[0]?.name || '' })} className="w-8 h-8 rounded-xl bg-brand-900 text-white flex items-center justify-center hover:bg-brand-700 transition-colors">
            <IconPlus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
