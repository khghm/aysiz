import { create } from 'zustand';
import type { Product, Review, Article } from '../data/products';
import { seedProducts, seedReviews, seedArticles } from '../data/products';
import { seedSettings, seedDiscountCodes } from '../data/adminData';
import { formatPrice } from '../utils/format';
import * as api from '../services/api';
import { queryClient } from '../services/queryClient';

export type ShopView = 'home' | 'shop' | 'product' | 'cart' | 'page' | 'blog' | 'post' | 'admin' | 'login' | 'account' | 'payment-result';

export interface CartItem {
  product: Product;
  qty: number;
  size: string;
  color: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'info' | 'danger';
  message: string;
}

export interface ShopSettings {
  storeName: string;
  phone: string;
  email: string;
  address: string;
  freeShippingThreshold: number;
  shippingCost: number;
  vatRate: number;
  levyRate: number;
  gatewayFee: number;
  packagingCost: number;
  showPricesWithTax: boolean;
  maintenance: boolean;
  tickerTexts: string[];
  logo: string;
  banners: any[];
}

interface ShopState {
  view: ShopView;
  selectedProduct: string | null;
  selectedPage: string;
  selectedPost: string;
  products: Product[];
  reviews: Review[];
  articles: Article[];
  cart: CartItem[];
  wishlist: string[];
  toasts: Toast[];
  settings: ShopSettings;
  discountCodes: any[];
  appliedCode: any;
  orders: any[];
  refCode: string;
  affiliateVisitorId: string;
  customer: api.Customer | null;
  setView: (view: ShopView) => void;
  setSelectedProduct: (id: string | null) => void;
  setSelectedPage: (page: string) => void;
  setSelectedPost: (post: string) => void;
  setProducts: (products: Product[]) => void;
  setReviews: (reviews: Review[]) => void;
  setArticles: (articles: Article[]) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  updateCartQty: (index: number, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (id: string) => void;
  addToast: (type: Toast['type'], message: string) => void;
  setSettings: (settings: ShopSettings) => void;
  setDiscountCodes: (codes: any[]) => void;
  setAppliedCode: (code: any) => void;
  validateCode: (code: string, subtotal: number) => Promise<any>;
  placeOrder: (info: any) => Promise<string>;
  setOrders: (orders: any[]) => void;
  setRefCode: (code: string) => void;
  setCustomer: (customer: api.Customer | null) => void;
  logoutCustomer: () => void;
  setAffiliateVisitorId: (id: string) => void;
}

const load = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const save = (key: string, value: unknown) => {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[shop] Failed to save "${key}"`, error);
  }
};

export const useShopStore = create<ShopState>((set, get) => ({
  view: 'home',
  selectedProduct: null,
  selectedPage: '',
  selectedPost: '',
  products: load('tasis-products', seedProducts),
  reviews: load('tasis-reviews', seedReviews),
  articles: load('tasis-articles', seedArticles),
  cart: load('tasis-cart', []),
  wishlist: load('tasis-wishlist', []),
  toasts: [],
  settings: load('tasis-settings', seedSettings),
  discountCodes: load('tasis-codes', seedDiscountCodes),
  appliedCode: null,
  orders: load('tasis-orders', []),
  refCode: load('tasis-affiliate-ref', ''),
  affiliateVisitorId: load('tasis-affiliate-visitor', ''),
  customer: load('tasis-customer', null),
  setView: (view) => set({ view }),
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
  setSelectedPage: (selectedPage) => set({ selectedPage }),
  setSelectedPost: (selectedPost) => set({ selectedPost }),
  setProducts: (products) => {
    set({ products });
    save('tasis-products', products);
  },
  setReviews: (reviews) => {
    set({ reviews });
    save('tasis-reviews', reviews);
  },
  setArticles: (articles) => {
    set({ articles });
    save('tasis-articles', articles);
  },
  addToCart: (item) => {
    const cart = get().cart;
    const index = cart.findIndex((current) =>
      current.product.id === item.product.id && current.size === item.size && current.color === item.color);
    const nextCart = index >= 0
      ? cart.map((current, currentIndex) => currentIndex === index
        ? { ...current, qty: current.qty + item.qty }
        : current)
      : [...cart, item];
    set({ cart: nextCart });
    save('tasis-cart', nextCart);
    get().addToast('success', 'محصول به سبد خرید اضافه شد');
  },
  removeFromCart: (index) => {
    const cart = get().cart.filter((_item, currentIndex) => currentIndex !== index);
    set({ cart });
    save('tasis-cart', cart);
  },
  updateCartQty: (index, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(index);
      return;
    }
    const cart = get().cart.map((item, currentIndex) => currentIndex === index ? { ...item, qty: quantity } : item);
    set({ cart });
    save('tasis-cart', cart);
  },
  clearCart: () => {
    set({ cart: [] });
    save('tasis-cart', []);
  },
  toggleWishlist: (id) => {
    const wishlist = get().wishlist.includes(id)
      ? get().wishlist.filter((item) => item !== id)
      : [...get().wishlist, id];
    set({ wishlist });
    save('tasis-wishlist', wishlist);
  },
  addToast: (type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })), 3200);
  },
  setSettings: (settings) => {
    set({ settings });
    save('tasis-settings', settings);
  },
  setDiscountCodes: (discountCodes) => {
    set({ discountCodes });
    save('tasis-codes', discountCodes);
  },
  setAppliedCode: (appliedCode) => set({ appliedCode }),
  validateCode: async (code, subtotal) => {
    try {
      const result = await api.catalog.validateDiscount(code, subtotal);
      return { code: result.code };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'اعتبارسنجی کد تخفیف ناموفق بود' };
    }
  },
  placeOrder: async (info) => {
    const state = get();
    const payload: api.CreateOrderPayload = {
      name: info.name,
      mobile: info.mobile,
      city: info.city,
      address: info.address,
      postalCode: info.postalCode,
      items: state.cart.map((item) => ({
        productId: item.product.id,
        qty: item.qty,
        size: item.size,
        color: item.color,
      })),
      couponCode: state.appliedCode?.code || undefined,
      redeemPoints: info.redeemPoints || 0,
      affiliateVisitorId: state.affiliateVisitorId || undefined,
    };
    const { order } = await api.orders.create(payload);
    const payment = await api.orders.paymentStart(order.id);
    get().clearCart();
    set({ appliedCode: null });
    window.location.href = payment.redirectUrl;
    return order.code;
  },
  setOrders: (orders) => {
    set({ orders });
    save('tasis-orders', orders);
  },
  setRefCode: (refCode) => set({ refCode }),
  setCustomer: (customer) => {
    set({ customer });
    if (customer) save('tasis-customer', customer);
    else {
      if (typeof window !== 'undefined') window.localStorage.removeItem('tasis-customer');
      queryClient.removeQueries({ queryKey: ['customer'] });
    }
  },
  logoutCustomer: () => {
    api.setToken(null);
    get().setCustomer(null);
  },
  setAffiliateVisitorId: (affiliateVisitorId) => {
    set({ affiliateVisitorId });
    save('tasis-affiliate-visitor', affiliateVisitorId);
  },
}));

export const shopMoney = (amount: number) => `${formatPrice(amount)} تومان`;
