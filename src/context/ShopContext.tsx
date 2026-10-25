import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Review, seedProducts, seedReviews, categories, brands, seedArticles, Article, Category } from '../data/products';
import { seedSettings, seedDiscountCodes } from '../data/adminData';
import { formatPrice, finalPrice, codeAmount } from '../utils/format';
import * as api from '../services/api';

type View = 'home' | 'shop' | 'product' | 'cart' | 'page' | 'blog' | 'post' | 'admin' | 'login' | 'account' | 'payment-result';

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
  validateCode: (code: string, subtotal: number) => Promise<any>;
  placeOrder: (info: any) => Promise<string>;
  orders: any[]; setOrders: (o: any[]) => void;
  money: (n: number) => string;
  refCode: string; setRefCode: (c: string) => void;
  customer: api.Customer | null; setCustomer: (c: api.Customer | null) => void;
  logoutCustomer: () => void;
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
  const [refCode, setRefCode] = useState(() => load('tasis-affiliate-ref', ''));
  const [affiliateVisitorId, setAffiliateVisitorId] = useState(() => load('tasis-affiliate-visitor', ''));
  const [customer, setCustomerState] = useState<api.Customer | null>(() => load('tasis-customer', null));

  const setCustomer = useCallback((c: api.Customer | null) => {
    setCustomerState(c);
    if (c) save('tasis-customer', c); else localStorage.removeItem('tasis-customer');
  }, []);
  const logoutCustomer = useCallback(() => {
    api.setToken(null);
    setCustomer(null);
  }, [setCustomer]);
  const setProducts = useCallback((p: Product[]) => { setProductsState(p); save('tasis-products', p); }, []);
  const setReviews = useCallback((r: Review[]) => { setReviewsState(r); save('tasis-reviews', r); }, []);
  const setArticles = useCallback((a: Article[]) => { setArticlesState(a); save('tasis-articles', a); }, []);
  const setSettings = useCallback((s: Settings) => { setSettingsState(s); save('tasis-settings', s); }, []);
  const setDiscountCodes = useCallback((c: any[]) => { setDiscountCodesState(c); save('tasis-codes', c); }, []);
  const setOrders = useCallback((o: any[]) => { setOrdersState(o); save('tasis-orders', o); }, []);

  useEffect(() => { save('tasis-cart', cart); }, [cart]);
  useEffect(() => { save('tasis-wishlist', wishlist); }, [wishlist]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const incomingRef = url.searchParams.get('ref');
    if (!incomingRef) return;
    const removeReferralFromUrl = () => {
      url.searchParams.delete('ref');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    };
    const visitorId = affiliateVisitorId || crypto.randomUUID();
    if (!affiliateVisitorId) {
      setAffiliateVisitorId(visitorId);
      save('tasis-affiliate-visitor', visitorId);
    }
    api.affiliate.track(incomingRef, visitorId).then((result) => {
      setRefCode(result.refCode);
      save('tasis-affiliate-ref', result.refCode);
      removeReferralFromUrl();
    }).catch((error) => addToast('danger', `ثبت لینک معرف ناموفق بود: ${error.message}`));
  }, []);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  useEffect(() => {
    const handleAdminError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      addToast('danger', message || 'عملیات پنل ناموفق بود');
    };
    const handleExpiredSession = () => setCustomer(null);
    window.addEventListener('admin-api-error', handleAdminError);
    window.addEventListener('auth-expired', handleExpiredSession);
    return () => {
      window.removeEventListener('admin-api-error', handleAdminError);
      window.removeEventListener('auth-expired', handleExpiredSession);
    };
  }, [addToast, setCustomer]);

  useEffect(() => {
    let active = true;
    api.catalog.products().then((result) => {
      if (!active) return;
      if (!Array.isArray(result?.items)) throw new Error('پاسخ فهرست محصولات معتبر نیست');
      setProductsState(result.items);
      save('tasis-products', result.items);
    }).catch((error) => addToast('danger', `بارگذاری محصولات ناموفق بود: ${error.message}`));
    api.catalog.settings().then((result) => {
      if (!active) return;
      setSettingsState((current) => ({ ...current, ...result }));
      save('tasis-settings', { ...settings, ...result });
    }).catch((error) => addToast('danger', `بارگذاری تنظیمات فروشگاه ناموفق بود: ${error.message}`));
    api.catalog.articles().then((result) => {
      if (!active) return;
      if (!Array.isArray(result?.items)) throw new Error('پاسخ فهرست مقاله‌ها معتبر نیست');
      setArticlesState(result.items);
      save('tasis-articles', result.items);
    }).catch((error) => addToast('danger', `بارگذاری وبلاگ ناموفق بود: ${error.message}`));
    api.catalog.reviews('', 'approved').then((result) => {
      if (!active) return;
      if (!Array.isArray(result?.items)) throw new Error('پاسخ فهرست دیدگاه‌ها معتبر نیست');
      setReviewsState(result.items);
      save('tasis-reviews', result.items);
    }).catch((error) => addToast('danger', `بارگذاری دیدگاه‌ها ناموفق بود: ${error.message}`));
    return () => { active = false; };
  }, [addToast]);

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

  const validateCode = async (code: string, subtotal: number) => {
    try {
      const result = await api.catalog.validateDiscount(code, subtotal);
      return { code: result.code };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'اعتبارسنجی کد تخفیف ناموفق بود' };
    }
  };

  const money = (n: number) => formatPrice(n) + ' تومان';

  // ثبت سفارش روی بک‌اند و هدایت به درگاه پرداخت (زرین‌پال)
  const placeOrder = async (info: any) => {
    const payload: api.CreateOrderPayload = {
      name: info.name, mobile: info.mobile, city: info.city, address: info.address, postalCode: info.postalCode,
      items: cart.map(i => ({ productId: i.product.id, qty: i.qty, size: i.size, color: i.color })),
      couponCode: appliedCode?.code || undefined,
      redeemPoints: info.redeemPoints || 0,
      affiliateVisitorId: affiliateVisitorId || undefined,
    };
    const { order } = await api.orders.create(payload);
    const pay = await api.orders.paymentStart(order.id);
    clearCart();
    setAppliedCode(null);
    window.location.href = pay.redirectUrl; // درگاه واقعی یا شبیه‌ساز تستی زرین‌پال
    return order.code;
  };

  return (
    <ShopContext.Provider value={{
      view, setView, selectedProduct, setSelectedProduct, selectedPage, setSelectedPage, selectedPost, setSelectedPost,
      products, setProducts, categories, brands, reviews, setReviews, articles, setArticles,
      cart, addToCart, removeFromCart, updateCartQty, clearCart,
      wishlist, toggleWishlist, toasts, addToast,
      settings, setSettings, discountCodes, setDiscountCodes, appliedCode, setAppliedCode,
      validateCode, placeOrder, orders, setOrders, money, refCode, setRefCode,
      customer, setCustomer, logoutCustomer
    }}>
      {children}
    </ShopContext.Provider>
  );
}
