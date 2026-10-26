import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categories, brands } from '../data/products';
import * as api from '../services/api';
import { useShopStore, shopMoney } from '../stores/shopStore';

export const useShop = () => ({
  ...useShopStore(),
  categories,
  brands,
  money: shopMoney,
});

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const addToast = useShopStore((state) => state.addToast);
  const setCustomer = useShopStore((state) => state.setCustomer);
  const productsQuery = useQuery({
    queryKey: ['catalog', 'products'],
    queryFn: async () => {
      const result = await api.catalog.products();
      if (!Array.isArray(result?.items)) throw new Error('پاسخ فهرست محصولات معتبر نیست');
      return result.items;
    },
    staleTime: 60_000,
  });
  const settingsQuery = useQuery({
    queryKey: ['catalog', 'settings'],
    queryFn: api.catalog.settings,
    staleTime: 60_000,
  });
  const articlesQuery = useQuery({
    queryKey: ['catalog', 'articles'],
    queryFn: async () => {
      const result = await api.catalog.articles();
      if (!Array.isArray(result?.items)) throw new Error('پاسخ فهرست مقاله‌ها معتبر نیست');
      return result.items;
    },
    staleTime: 60_000,
  });
  const reviewsQuery = useQuery({
    queryKey: ['catalog', 'reviews', '', 'approved'],
    queryFn: async () => {
      const result = await api.catalog.reviews('', 'approved');
      if (!Array.isArray(result?.items)) throw new Error('پاسخ فهرست دیدگاه‌ها معتبر نیست');
      return result.items;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (productsQuery.data) useShopStore.getState().setProducts(productsQuery.data);
  }, [productsQuery.data]);

  useEffect(() => {
    if (settingsQuery.data && typeof settingsQuery.data === 'object') {
      const current = useShopStore.getState().settings;
      useShopStore.getState().setSettings({ ...current, ...settingsQuery.data });
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (articlesQuery.data) useShopStore.getState().setArticles(articlesQuery.data);
  }, [articlesQuery.data]);

  useEffect(() => {
    if (reviewsQuery.data) useShopStore.getState().setReviews(reviewsQuery.data);
  }, [reviewsQuery.data]);

  useEffect(() => {
    if (productsQuery.error) addToast('danger', `بارگذاری محصولات ناموفق بود: ${productsQuery.error.message}`);
  }, [productsQuery.error, addToast]);

  useEffect(() => {
    if (settingsQuery.error) addToast('danger', `بارگذاری تنظیمات فروشگاه ناموفق بود: ${settingsQuery.error.message}`);
  }, [settingsQuery.error, addToast]);

  useEffect(() => {
    if (articlesQuery.error) addToast('danger', `بارگذاری وبلاگ ناموفق بود: ${articlesQuery.error.message}`);
  }, [articlesQuery.error, addToast]);

  useEffect(() => {
    if (reviewsQuery.error) addToast('danger', `بارگذاری دیدگاه‌ها ناموفق بود: ${reviewsQuery.error.message}`);
  }, [reviewsQuery.error, addToast]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const incomingRef = url.searchParams.get('ref');
    if (!incomingRef) return;

    const state = useShopStore.getState();
    const visitorId = state.affiliateVisitorId || crypto.randomUUID();
    if (!state.affiliateVisitorId) state.setAffiliateVisitorId(visitorId);
    api.affiliate.track(incomingRef, visitorId).then((result) => {
      useShopStore.getState().setRefCode(result.refCode);
      url.searchParams.delete('ref');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }).catch((error) => {
      useShopStore.getState().addToast('danger', `ثبت لینک معرف ناموفق بود: ${error.message}`);
    });
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

  return <>{children}</>;
}
