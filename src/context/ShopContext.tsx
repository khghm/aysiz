import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Review, seedProducts, seedReviews, categories, brands, seedArticles, Article, Category } from '../data/products';
import { seedSettings, seedDiscountCodes } from '../data/adminData';
import { formatPrice, finalPrice, codeAmount } from '../utils/format';

type View = 'home' | 'shop' | 'product' | 'cart' | 'page' | 'blog' | 'post' | 'admin' | 'login';

interface CartItem { product: Product; qty: number; size: string; color: string; }
interface Toast { id: string; type: 'success' | 'info' | 'danger'; message: string; }
interface Settings { storeName: string; phone: string; email: string; address: string; freeShippingThreshold: number; shippingCost: number; vatRate: number; levyRate: number; gatewayFee: number; packagingCost: number; showPricesWithTax: boolean; maintenance: boolean; tickerTexts: string[]; logo: string; banners: any[]; }

interface ShopContextType {
  view: View; setView: (v: View) => void;
  selectedProduct: string | null; setSelectedProduct: (id: string | null) => void;
  selectedPage: string; setSelectedPage: (s: string) => void;
  selectedPost: string; setSelectedPost: (s: string) => void;
  products: Product[]; setProducts: (p: Product[]) => void;
  categories: Category[]; brands: string[];
  reviews: Review[]; setReviews: (r: Review[]) => void;
  articles: Article[]; setArticles: (a: Article[]) => void;
  cart: CartItem[]; addToCart: (item: CartItem) => void; removeFromCart: (idx: number) => void; updateCartQty: (idx: number, qty: number) => void; clearCart: () => void;
  wishlist: string[]; toggleWishlist: (id: string) => void;
  toasts: Toast[]; addToast: (type: Toast['type'], message: string) => void;
  settings: Settings; setSettings: (s: Settings) => void;
  discountCodes: any[]; setDiscountCodes: (c: any[]) => void;
  appliedCode: any; setAppliedCode: (c: any) => void;
  validateCode: (code: string) => any;
  placeOrder: (info: any) => string;
  orders: any[]; setOrders: (o: any[]) => void;
  money: (n: number) => string;
  refCode: string; setRefCode: (c: string) => void;
}

const ShopContext = createContext<ShopContextType>({} as ShopContextType);

export const useShop = () => useContext(ShopContext);

const load = <T,>(key: string, fallback: T): T => {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch { return fallback; }
};
const save = (key: string, val: any) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<View>('home');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState('');
  const [selectedPost, setSelectedPost] = useState('');
  const [products, setProductsState] = useState<Product[]>(() => load('tasis-products', seedProducts));
  const [reviews, setReviewsState] = useState<Review[]>(() => load('tasis-reviews', seedReviews));
  const [articles, setArticlesState] = useState<Article[]>(() => load('tasis-articles', seedArticles));
  const [cart, setCart] = useState<CartItem[]>(() => load('tasis-cart', []));
  const [wishlist, setWishlist] = useState<string[]>(() => load('tasis-wishlist', []));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [settings, setSettingsState] = useState<Settings>(() => load('tasis-settings', seedSettings));
  const [discountCodes, setDiscountCodesState] = useState(() => load('tasis-codes', seedDiscountCodes));
  const [appliedCode, setAppliedCode] = useState<any>(null);
  const [orders, setOrdersState] = useState<any[]>(() => load('tasis-orders', []));
  const [refCode, setRefCode] = useState('');

  const setProducts = (p: Product[]) => { setProductsState(p); save('tasis-products', p); };
  const setReviews = (r: Review[]) => { setReviewsState(r); save('tasis-reviews', r); };
  const setArticles = (a: Article[]) => { setArticlesState(a); save('tasis-articles', a); };
  const setSettings = (s: Settings) => { setSettingsState(s); save('tasis-settings', s); };
  const setDiscountCodes = (c: any[]) => { setDiscountCodesState(c); save('tasis-codes', c); };
  const setOrders = (o: any[]) => { setOrdersState(o); save('tasis-orders', o); };

  useEffect(() => { save('tasis-cart', cart); }, [cart]);
  useEffect(() => { save('tasis-wishlist', wishlist); }, [wishlist]);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  const addToCart = (item: CartItem) => {
    setCart(c => {
      const idx = c.findIndex(x => x.product.id === item.product.id && x.size === item.size && x.color === item.color);
      if (idx >= 0) { const n = [...c]; n[idx].qty += item.qty; return n; }
      return [...c, item];
    });
    addToast('success', 'محصول به سبد خرید اضافه شد');
  };

  const removeFromCart = (idx: number) => setCart(c => c.filter((_, i) => i !== idx));
  const updateCartQty = (idx: number, qty: number) => {
    if (qty <= 0) return removeFromCart(idx);
    setCart(c => { const n = [...c]; n[idx].qty = qty; return n; });
  };
  const clearCart = () => setCart([]);
  const toggleWishlist = (id: string) => {
    setWishlist(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]);
  };

  const validateCode = (code: string) => {
    const c = discountCodes.find((x: any) => x.code === code.toUpperCase());
    if (!c) return { error: 'کد تخفیف نامعتبر است' };
    if (!c.active) return { error: 'کد تخفیف غیرفعال است' };
    if (new Date(c.expiresAt) < new Date()) return { error: 'کد تخفیف منقضی شده است' };
    if (c.usedCount >= c.maxUses) return { error: 'ظرفیت کد تخفیف تکمیل شده' };
    return { code: c };
  };

  const money = (n: number) => formatPrice(n) + ' تومان';

  const placeOrder = (info: any) => {
    const subtotal = cart.reduce((s, i) => s + finalPrice(i.product.price, i.product.discount) * i.qty, 0);
    const discountAmt = appliedCode ? codeAmount(appliedCode, subtotal) : 0;
    const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingCost;
    const taxRate = settings.showPricesWithTax ? (settings.vatRate + settings.levyRate) / 100 : 0;
    const tax = Math.round((subtotal - discountAmt) * taxRate);
    const total = subtotal - discountAmt + shipping + tax;
    const code = `SQ-${String(Date.now()).slice(-6)}`;
    const order = {
      id: `ord-${Date.now()}`, code, customer: info.name, mobile: info.mobile, city: info.city,
      items: cart.map(i => ({ productId: i.product.id, name: i.product.name, qty: i.qty, price: i.product.price, discount: i.product.discount })),
      subtotal, discountAmount: discountAmt, shipping, tax, total,
      status: 'pending', payment: 'online', channel: 'website',
      createdAt: new Date().toISOString(), address: info.address, couponCode: appliedCode?.code
    };
    const newOrders = [...orders, order];
    setOrders(newOrders);
    if (appliedCode) {
      const codes = discountCodes.map((c: any) => c.code === appliedCode.code ? { ...c, usedCount: c.usedCount + 1 } : c);
      setDiscountCodes(codes);
    }
    clearCart();
    setAppliedCode(null);
    return code;
  };

  return (
    <ShopContext.Provider value={{
      view, setView, selectedProduct, setSelectedProduct, selectedPage, setSelectedPage, selectedPost, setSelectedPost,
      products, setProducts, categories, brands, reviews, setReviews, articles, setArticles,
      cart, addToCart, removeFromCart, updateCartQty, clearCart,
      wishlist, toggleWishlist, toasts, addToast,
      settings, setSettings, discountCodes, setDiscountCodes, appliedCode, setAppliedCode,
      validateCode, placeOrder, orders, setOrders, money, refCode, setRefCode
    }}>
      {children}
    </ShopContext.Provider>
  );
}
