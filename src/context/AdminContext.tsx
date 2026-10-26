import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { useAdminStore } from '../stores/adminStore';

const load = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[admin] Failed to save preference "${key}"`, error);
  }
};

const reportAdminError = (message: string, error: unknown) => {
  console.error(`[admin] ${message}`, error);
  if (typeof window !== 'undefined') {
    const detail = error instanceof Error ? error.message : String(error);
    window.dispatchEvent(new CustomEvent('admin-api-error', { detail: `${message}: ${detail}` }));
  }
};

type CollectionApi = {
  list: () => Promise<{ items: any[] }>;
  create?: (item: any) => Promise<any>;
  update?: (id: string, item: any) => Promise<any>;
  delete?: (id: string) => Promise<any>;
};

async function syncCollection(apiCollection: CollectionApi, previous: any[], next: any[]) {
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const nextById = new Map(next.map((item) => [item.id, item]));
  const requests: Promise<any>[] = [];

  for (const [id, item] of previousById) {
    if (!nextById.has(id)) {
      if (!apiCollection.delete) throw new Error(`Delete is not supported for item ${id}`);
      requests.push(apiCollection.delete(id));
    } else if (JSON.stringify(item) !== JSON.stringify(nextById.get(id))) {
      if (!apiCollection.update) throw new Error(`Update is not supported for item ${id}`);
      requests.push(apiCollection.update(id, nextById.get(id)));
    }
  }

  for (const [id, item] of nextById) {
    if (!previousById.has(id)) {
      if (!apiCollection.create) throw new Error(`Create is not supported for item ${id}`);
      requests.push(apiCollection.create(item));
    }
  }

  await Promise.all(requests);
}

type CollectionQueryData = { items: any[] };
type CollectionSetter = React.Dispatch<React.SetStateAction<any[]>>;

function useBackendCollection(
  apiCollection: CollectionApi,
  cacheKey: readonly unknown[],
  enabled: boolean,
): [any[], CollectionSetter] {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: cacheKey,
    queryFn: apiCollection.list,
    enabled,
    staleTime: 30_000,
  });
  const mutation = useMutation({
    mutationFn: ({ previous, next }: { previous: any[]; next: any[] }) =>
      syncCollection(apiCollection, previous, next),
    onMutate: async ({ next }) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<CollectionQueryData>(cacheKey);
      queryClient.setQueryData<CollectionQueryData>(cacheKey, { items: next });
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(cacheKey, context.previous);
      reportAdminError('ذخیره تغییرات پنل ناموفق بود', error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });

  const setItems: CollectionSetter = useCallback((value) => {
    const previous = queryClient.getQueryData<CollectionQueryData>(cacheKey)?.items
      ?? query.data?.items
      ?? [];
    const updated = typeof value === 'function' ? value(previous) : value;
    const next = updated.map((item) => item.id ? item : { ...item, id: crypto.randomUUID() });
    if (enabled) mutation.mutate({ previous, next });
    else queryClient.setQueryData<CollectionQueryData>(cacheKey, { items: next });
  }, [cacheKey, enabled, mutation.mutate, query.data?.items, queryClient]);

  useEffect(() => {
    if (query.error) reportAdminError('بارگذاری اطلاعات پنل ناموفق بود', query.error);
  }, [query.error]);

  return [query.data?.items ?? [], setItems];
}

function useBackendValue<T>(
  initial: T,
  cacheKey: readonly unknown[],
  enabled: boolean,
  read: () => Promise<T>,
  write: (value: T) => Promise<any>,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: cacheKey,
    queryFn: read,
    enabled,
    staleTime: 30_000,
  });
  const mutation = useMutation({
    mutationFn: write,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<T>(cacheKey);
      queryClient.setQueryData(cacheKey, next);
      return { previous };
    },
    onError: (error, _next, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(cacheKey, context.previous);
      reportAdminError('ذخیره تنظیمات پنل ناموفق بود', error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback((nextValue) => {
    const previous = queryClient.getQueryData<T>(cacheKey) ?? query.data ?? initial;
    const next = typeof nextValue === 'function'
      ? (nextValue as (previous: T) => T)(previous)
      : nextValue;
    if (enabled) mutation.mutate(next);
    else queryClient.setQueryData(cacheKey, next);
  }, [cacheKey, enabled, initial, mutation.mutate, query.data, queryClient]);

  useEffect(() => {
    if (query.error) reportAdminError('بارگذاری تنظیمات پنل ناموفق بود', query.error);
  }, [query.error]);

  return [query.data ?? initial, setValue];
}

export interface AdminContextType {
  isAdmin: boolean; setIsAdmin: (value: boolean) => void;
  darkMode: boolean; toggleDark: () => void;
  currentRole: string;
  adminIdentity: { id: string; username: string; name: string; roleId: string; roleName: string; sections: string[] } | null;
  roles: any[]; setRoles: CollectionSetter;
  orders: any[]; setOrders: CollectionSetter;
  tickets: any[]; setTickets: CollectionSetter;
  rmas: any[]; setRmas: CollectionSetter;
  carriers: any[]; setCarriers: CollectionSetter;
  vendors: any[]; setVendors: CollectionSetter;
  tasks: any[]; setTasks: CollectionSetter;
  campaigns: any[]; setCampaigns: CollectionSetter;
  invoices: any[]; setInvoices: CollectionSetter;
  expenses: any[]; setExpenses: CollectionSetter;
  bankTx: any[]; setBankTx: CollectionSetter;
  abandoned: any[]; setAbandoned: CollectionSetter;
  searchTerms: any[]; setSearchTerms: CollectionSetter;
  pages: any[]; setPages: CollectionSetter;
  banners: any[]; setBanners: CollectionSetter;
  posts: any[]; setPosts: CollectionSetter;
  automations: any[]; setAutomations: CollectionSetter;
  loyalty: any; setLoyalty: React.Dispatch<React.SetStateAction<any>>;
  integrations: any[]; setIntegrations: CollectionSetter;
  audit: any[]; setAudit: CollectionSetter;
  surveys: any[]; setSurveys: CollectionSetter;
  assets: any[]; setAssets: CollectionSetter;
  loginHistory: any[]; setLoginHistory: CollectionSetter;
  errorLog: any[]; setErrorLog: CollectionSetter;
  affiliates: any[]; setAffiliates: CollectionSetter;
  payouts: any[]; setPayouts: CollectionSetter;
  affConf: any; setAffConf: React.Dispatch<React.SetStateAction<any>>;
  log: (action: string, target: string, severity?: string) => void;
  adminSection: string; setAdminSection: (section: string) => void;
}

const AdminContext = createContext<AdminContextType>({} as AdminContextType);
export const useAdmin = () => useContext(AdminContext);

const queryKeys = {
  identity: ['admin', 'identity'] as const,
  orders: ['admin', 'orders'] as const,
  audit: ['admin', 'audit'] as const,
};

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const isAdmin = useAdminStore((state) => state.isAdmin);
  const setIsAdmin = useAdminStore((state) => state.setIsAdmin);
  const darkMode = useAdminStore((state) => state.darkMode);
  const toggleDark = useAdminStore((state) => state.toggleDark);
  const currentRole = useAdminStore((state) => state.currentRole);
  const adminIdentity = useAdminStore((state) => state.adminIdentity);
  const setAdminIdentity = useAdminStore((state) => state.setAdminIdentity);
  const setCurrentRole = useAdminStore((state) => state.setCurrentRole);
  const adminSection = useAdminStore((state) => state.adminSection);
  const setSavedAdminSection = useAdminStore((state) => state.setAdminSection);
  const hasSection = (section: string) => Boolean(adminIdentity?.sections.includes(section));

  const [roles, setRoles] = useBackendCollection(api.admin.roles, ['admin', 'roles'], isAdmin && hasSection('system'));
  const [tickets, setTickets] = useBackendCollection(api.support.tickets, ['admin', 'tickets'], isAdmin && hasSection('support'));
  const [rmas, setRmas] = useBackendCollection(api.support.rmas, ['admin', 'rmas'], isAdmin && hasSection('returns'));
  const [carriers, setCarriers] = useBackendCollection(api.logistics.carriers, ['admin', 'carriers'], isAdmin && hasSection('logistics'));
  const [vendors, setVendors] = useBackendCollection(api.logistics.vendors, ['admin', 'vendors'], isAdmin && hasSection('vendors'));
  const [tasks, setTasks] = useBackendCollection(api.tasks, ['admin', 'tasks'], isAdmin && hasSection('tasks'));
  const [campaigns, setCampaigns] = useBackendCollection(api.marketing.campaigns, ['admin', 'campaigns'], isAdmin && hasSection('growth'));
  const [invoices, setInvoices] = useBackendCollection(api.finance.invoices, ['admin', 'invoices'], isAdmin && hasSection('finance'));
  const [expenses, setExpenses] = useBackendCollection(api.finance.expenses, ['admin', 'expenses'], isAdmin && hasSection('finance'));
  const [bankTx, setBankTx] = useBackendCollection(api.finance.bankTx, ['admin', 'bank-transactions'], isAdmin && hasSection('finance'));
  const [abandoned, setAbandoned] = useBackendCollection(api.analytics.abandoned, ['admin', 'abandoned'], isAdmin && hasSection('insights'));
  const [searchTerms, setSearchTerms] = useBackendCollection(api.analytics.searchTerms, ['admin', 'search-terms'], isAdmin && hasSection('insights'));
  const [pages, setPages] = useBackendCollection(api.content.pages, ['admin', 'pages'], isAdmin && hasSection('content'));
  const [banners, setBanners] = useBackendCollection(api.content.banners, ['admin', 'banners'], isAdmin && hasSection('content'));
  const [posts, setPosts] = useBackendCollection(api.content.posts, ['admin', 'posts'], isAdmin && hasSection('content'));
  const [automations, setAutomations] = useBackendCollection(api.marketing.automations, ['admin', 'automations'], isAdmin && hasSection('growth'));
  const [loyalty, setLoyalty] = useBackendValue<any>(null, ['admin', 'loyalty'], isAdmin && hasSection('growth'), api.admin.loyalty.get, api.admin.loyalty.update);
  const [integrations, setIntegrations] = useBackendCollection(api.admin.integrations, ['admin', 'integrations'], isAdmin && hasSection('system'));
  const [surveys, setSurveys] = useBackendCollection(api.analytics.surveys, ['admin', 'surveys'], isAdmin && hasSection('insights'));
  const [assets, setAssets] = useBackendCollection(api.analytics.assets, ['admin', 'assets'], isAdmin && hasSection('system'));
  const [loginHistory, setLoginHistory] = useBackendCollection(api.analytics.loginHistory, ['admin', 'login-history'], isAdmin && hasSection('system'));
  const [errorLog, setErrorLog] = useBackendCollection(api.analytics.errorLog, ['admin', 'error-log'], isAdmin && hasSection('system'));
  const [affiliates, setAffiliates] = useBackendCollection(api.affiliate.affiliates, ['admin', 'affiliates'], isAdmin && hasSection('affiliates'));
  const [payouts, setPayouts] = useBackendCollection(api.affiliate.payouts, ['admin', 'payouts'], isAdmin && hasSection('affiliates'));
  const [affConf, setAffConf] = useBackendValue<any>(null, ['admin', 'affiliate-config'], isAdmin && hasSection('affiliates'), api.admin.affConfig.get, api.admin.affConfig.update);

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders,
    queryFn: () => api.orders.list(),
    enabled: isAdmin && hasSection('orders'),
    staleTime: 30_000,
  });
  const identityQuery = useQuery({
    queryKey: queryKeys.identity,
    queryFn: async () => (await api.admin.me()).admin,
    enabled: isAdmin,
    retry: false,
    staleTime: 60_000,
  });
  const auditQuery = useQuery({
    queryKey: queryKeys.audit,
    queryFn: api.admin.audit.list,
    enabled: isAdmin && hasSection('system'),
    staleTime: 30_000,
  });

  const auditMutation = useMutation({
    mutationFn: api.admin.audit.create,
    onMutate: async (entry) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.audit });
      const previous = queryClient.getQueryData<{ items: any[] }>(queryKeys.audit);
      queryClient.setQueryData<{ items: any[] }>(queryKeys.audit, {
        items: [entry, ...(previous?.items ?? [])],
      });
      return { previous };
    },
    onError: (error, _entry, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.audit, context.previous);
      reportAdminError('ثبت رویداد مدیریتی ناموفق بود', error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.audit }),
  });

  useEffect(() => {
    if (identityQuery.data) {
      setAdminIdentity(identityQuery.data);
      setCurrentRole(identityQuery.data.roleName);
      save('tasis-role', identityQuery.data.roleName);
    }
  }, [identityQuery.data, setAdminIdentity, setCurrentRole]);

  useEffect(() => {
    if (!isAdmin || !identityQuery.error) return;
    reportAdminError('بارگذاری هویت مدیر ناموفق بود', identityQuery.error);
    api.setToken(null);
    setIsAdmin(false);
  }, [identityQuery.error, isAdmin, setIsAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setAdminIdentity(null);
      setCurrentRole('');
      queryClient.removeQueries({ queryKey: ['admin'] });
    }
  }, [isAdmin, queryClient, setAdminIdentity, setCurrentRole]);

  useEffect(() => {
    if (ordersQuery.error) reportAdminError('بارگذاری سفارش‌های پنل ناموفق بود', ordersQuery.error);
  }, [ordersQuery.error]);

  useEffect(() => {
    if (auditQuery.error) reportAdminError('بارگذاری گزارش رویدادها ناموفق بود', auditQuery.error);
  }, [auditQuery.error]);

  useEffect(() => {
    const handleExpiredSession = () => setIsAdmin(false);
    window.addEventListener('auth-expired', handleExpiredSession);
    return () => window.removeEventListener('auth-expired', handleExpiredSession);
  }, [setIsAdmin]);

  const setOrders: CollectionSetter = useCallback((value) => {
    queryClient.setQueryData<CollectionQueryData>(queryKeys.orders, (current) => {
      const previous = current?.items ?? ordersQuery.data?.items ?? [];
      return { items: typeof value === 'function' ? value(previous) : value };
    });
  }, [ordersQuery.data?.items, queryClient]);

  const setAudit: CollectionSetter = useCallback((value) => {
    queryClient.setQueryData<CollectionQueryData>(queryKeys.audit, (current) => {
      const previous = current?.items ?? auditQuery.data?.items ?? [];
      return { items: typeof value === 'function' ? value(previous) : value };
    });
  }, [auditQuery.data?.items, queryClient]);

  const log = useCallback((action: string, target: string, severity = 'normal') => {
    const entry = {
      id: `log-${Date.now()}-${crypto.randomUUID()}`,
      action,
      actor: 'admin',
      role: currentRole,
      target,
      severity,
      at: new Date().toISOString(),
    };
    auditMutation.mutate(entry);
  }, [auditMutation.mutate, currentRole]);

  const setAdminSection = useCallback((section: string) => {
    if (adminIdentity && !adminIdentity.sections.includes(section)) return;
    setSavedAdminSection(section);
  }, [adminIdentity, setSavedAdminSection]);

  return (
    <AdminContext.Provider value={{
      isAdmin, setIsAdmin, darkMode, toggleDark, currentRole, adminIdentity,
      roles, setRoles, orders: ordersQuery.data?.items ?? [], setOrders,
      tickets, setTickets, rmas, setRmas, carriers, setCarriers,
      vendors, setVendors, tasks, setTasks, campaigns, setCampaigns,
      invoices, setInvoices, expenses, setExpenses, bankTx, setBankTx,
      abandoned, setAbandoned, searchTerms, setSearchTerms,
      pages, setPages, banners, setBanners, posts, setPosts, automations, setAutomations,
      loyalty, setLoyalty, integrations, setIntegrations,
      audit: auditQuery.data?.items ?? [], setAudit,
      surveys, setSurveys, assets, setAssets, loginHistory, setLoginHistory, errorLog, setErrorLog,
      affiliates, setAffiliates, payouts, setPayouts, affConf, setAffConf,
      log, adminSection, setAdminSection,
    }}>
      {children}
    </AdminContext.Provider>
  );
}
