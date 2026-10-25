import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as api from '../services/api';

const load = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
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

function useBackendCollection(apiCollection: CollectionApi, enabled: boolean): [any[], React.Dispatch<React.SetStateAction<any[]>>] {
  const [items, setItems] = useState<any[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    apiCollection.list().then((result) => {
      if (!active) return;
      itemsRef.current = result.items;
      setItems(result.items);
    }).catch((error) => {
      reportAdminError('بارگذاری اطلاعات پنل ناموفق بود', error);
    });
    return () => { active = false; };
  }, [apiCollection, enabled]);

  const setBackendItems: React.Dispatch<React.SetStateAction<any[]>> = (value) => {
    const previous = itemsRef.current;
    const updated = typeof value === 'function' ? value(previous) : value;
    const next = updated.map((item) => item.id ? item : { ...item, id: crypto.randomUUID() });
    itemsRef.current = next;
    setItems(next);

    if (enabled) {
      syncCollection(apiCollection, previous, next).catch((error) => {
        reportAdminError('ذخیره تغییرات پنل ناموفق بود', error);
        apiCollection.list().then((result) => {
          itemsRef.current = result.items;
          setItems(result.items);
        }).catch((reloadError) => {
          reportAdminError('بازیابی وضعیت ذخیره‌شده ناموفق بود', reloadError);
          if (itemsRef.current === next) {
            itemsRef.current = previous;
            setItems(previous);
          }
        });
      });
    }
  };

  return [items, setBackendItems];
}

function useBackendValue<T>(initial: T, enabled: boolean, read: () => Promise<T>, write: (value: T) => Promise<any>): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState(initial);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    read().then((result) => {
      if (active && result !== null && result !== undefined) setValue(result);
    }).catch((error) => {
      reportAdminError('بارگذاری تنظیمات پنل ناموفق بود', error);
    });
    return () => { active = false; };
  }, [enabled, read]);

  const setBackendValue: React.Dispatch<React.SetStateAction<T>> = (nextValue) => {
    const previous = valueRef.current;
    const next = typeof nextValue === 'function'
      ? (nextValue as (previous: T) => T)(previous)
      : nextValue;
    valueRef.current = next;
    setValue(next);
    if (enabled) {
      write(next).catch((error) => {
        reportAdminError('ذخیره تنظیمات پنل ناموفق بود', error);
        if (valueRef.current === next) {
          valueRef.current = previous;
          setValue(previous);
        }
      });
    }
  };

  return [value, setBackendValue];
}

interface AdminContextType {
  isAdmin: boolean; setIsAdmin: (v: boolean) => void;
  darkMode: boolean; toggleDark: () => void;
  currentRole: string;
  adminIdentity: { id: string; username: string; name: string; roleId: string; roleName: string; sections: string[] } | null;
  roles: any[]; setRoles: React.Dispatch<React.SetStateAction<any[]>>;
  orders: any[]; setOrders: React.Dispatch<React.SetStateAction<any[]>>;
  tickets: any[]; setTickets: React.Dispatch<React.SetStateAction<any[]>>;
  rmas: any[]; setRmas: React.Dispatch<React.SetStateAction<any[]>>;
  carriers: any[]; setCarriers: React.Dispatch<React.SetStateAction<any[]>>;
  vendors: any[]; setVendors: React.Dispatch<React.SetStateAction<any[]>>;
  tasks: any[]; setTasks: React.Dispatch<React.SetStateAction<any[]>>;
  campaigns: any[]; setCampaigns: React.Dispatch<React.SetStateAction<any[]>>;
  invoices: any[]; setInvoices: React.Dispatch<React.SetStateAction<any[]>>;
  expenses: any[]; setExpenses: React.Dispatch<React.SetStateAction<any[]>>;
  bankTx: any[]; setBankTx: React.Dispatch<React.SetStateAction<any[]>>;
  abandoned: any[]; setAbandoned: React.Dispatch<React.SetStateAction<any[]>>;
  searchTerms: any[]; setSearchTerms: React.Dispatch<React.SetStateAction<any[]>>;
  pages: any[]; setPages: React.Dispatch<React.SetStateAction<any[]>>;
  banners: any[]; setBanners: React.Dispatch<React.SetStateAction<any[]>>;
  posts: any[]; setPosts: React.Dispatch<React.SetStateAction<any[]>>;
  automations: any[]; setAutomations: React.Dispatch<React.SetStateAction<any[]>>;
  loyalty: any; setLoyalty: React.Dispatch<React.SetStateAction<any>>;
  integrations: any[]; setIntegrations: React.Dispatch<React.SetStateAction<any[]>>;
  audit: any[]; setAudit: React.Dispatch<React.SetStateAction<any[]>>;
  surveys: any[]; setSurveys: React.Dispatch<React.SetStateAction<any[]>>;
  assets: any[]; setAssets: React.Dispatch<React.SetStateAction<any[]>>;
  loginHistory: any[]; setLoginHistory: React.Dispatch<React.SetStateAction<any[]>>;
  errorLog: any[]; setErrorLog: React.Dispatch<React.SetStateAction<any[]>>;
  affiliates: any[]; setAffiliates: React.Dispatch<React.SetStateAction<any[]>>;
  payouts: any[]; setPayouts: React.Dispatch<React.SetStateAction<any[]>>;
  affConf: any; setAffConf: React.Dispatch<React.SetStateAction<any>>;
  log: (action: string, target: string, severity?: string) => void;
  adminSection: string; setAdminSection: (s: string) => void;
}

const AdminContext = createContext<AdminContextType>({} as AdminContextType);
export const useAdmin = () => useContext(AdminContext);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => load('tasis-admin', false) && Boolean(api.getToken()));
  const [darkMode, setDarkMode] = useState(() => load('tasis-dark', false));
  const [currentRole, setCurrentRole] = useState('');
  const [adminIdentity, setAdminIdentity] = useState<AdminContextType['adminIdentity']>(null);
  const [adminSection, setAdminSectionState] = useState(() => load('tasis-admin-section', 'home'));
  const [orders, setOrders] = useState<any[]>([]);
  const hasSection = (section: string) => Boolean(adminIdentity?.sections.includes(section));
  const [roles, setRoles] = useBackendCollection(api.admin.roles, isAdmin && hasSection('system'));
  const [tickets, setTickets] = useBackendCollection(api.support.tickets, isAdmin && hasSection('support'));
  const [rmas, setRmas] = useBackendCollection(api.support.rmas, isAdmin && hasSection('returns'));
  const [carriers, setCarriers] = useBackendCollection(api.logistics.carriers, isAdmin && hasSection('logistics'));
  const [vendors, setVendors] = useBackendCollection(api.logistics.vendors, isAdmin && hasSection('vendors'));
  const [tasks, setTasks] = useBackendCollection(api.tasks, isAdmin && hasSection('tasks'));
  const [campaigns, setCampaigns] = useBackendCollection(api.marketing.campaigns, isAdmin && hasSection('growth'));
  const [invoices, setInvoices] = useBackendCollection(api.finance.invoices, isAdmin && hasSection('finance'));
  const [expenses, setExpenses] = useBackendCollection(api.finance.expenses, isAdmin && hasSection('finance'));
  const [bankTx, setBankTx] = useBackendCollection(api.finance.bankTx, isAdmin && hasSection('finance'));
  const [abandoned, setAbandoned] = useBackendCollection(api.analytics.abandoned, isAdmin && hasSection('insights'));
  const [searchTerms, setSearchTerms] = useBackendCollection(api.analytics.searchTerms, isAdmin && hasSection('insights'));
  const [pages, setPages] = useBackendCollection(api.content.pages, isAdmin && hasSection('content'));
  const [banners, setBanners] = useBackendCollection(api.content.banners, isAdmin && hasSection('content'));
  const [posts, setPosts] = useBackendCollection(api.content.posts, isAdmin && hasSection('content'));
  const [automations, setAutomations] = useBackendCollection(api.marketing.automations, isAdmin && hasSection('growth'));
  const [loyalty, setLoyalty] = useBackendValue<any>(null, isAdmin && hasSection('growth'), api.admin.loyalty.get, api.admin.loyalty.update);
  const [integrations, setIntegrations] = useBackendCollection(api.admin.integrations, isAdmin && hasSection('system'));
  const [audit, setAudit] = useState<any[]>([]);
  const [surveys, setSurveys] = useBackendCollection(api.analytics.surveys, isAdmin && hasSection('insights'));
  const [assets, setAssets] = useBackendCollection(api.analytics.assets, isAdmin && hasSection('system'));
  const [loginHistory, setLoginHistory] = useBackendCollection(api.analytics.loginHistory, isAdmin && hasSection('system'));
  const [errorLog, setErrorLog] = useBackendCollection(api.analytics.errorLog, isAdmin && hasSection('system'));
  const [affiliates, setAffiliates] = useBackendCollection(api.affiliate.affiliates, isAdmin && hasSection('affiliates'));
  const [payouts, setPayouts] = useBackendCollection(api.affiliate.payouts, isAdmin && hasSection('affiliates'));
  const [affConf, setAffConf] = useBackendValue<any>(null, isAdmin && hasSection('affiliates'), api.admin.affConfig.get, api.admin.affConfig.update);

  useEffect(() => {
    if (!isAdmin || !hasSection('orders')) return;
    api.orders.list().then((result) => setOrders(result.items)).catch((error) => {
      reportAdminError('بارگذاری سفارش‌های پنل ناموفق بود', error);
    });
  }, [isAdmin, adminIdentity]);

  useEffect(() => {
    if (!isAdmin) {
      setAdminIdentity(null);
      setCurrentRole('');
      return;
    }
    let active = true;
    api.admin.me().then(({ admin }) => {
      if (!active) return;
      setAdminIdentity(admin);
      setCurrentRole(admin.roleName);
      save('tasis-role', admin.roleName);
    }).catch((error) => {
      reportAdminError('بارگذاری هویت مدیر ناموفق بود', error);
      api.setToken(null);
      setIsAdmin(false);
    });
    return () => { active = false; };
  }, [isAdmin]);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    save('tasis-dark', next);
  };

  const setAdminSection = (section: string) => {
    if (adminIdentity && !adminIdentity.sections.includes(section)) return;
    setAdminSectionState(section);
    save('tasis-admin-section', section);
  };

  const log = (action: string, target: string, severity = 'normal') => {
    const entry = { id: `log-${Date.now()}-${crypto.randomUUID()}`, action, actor: 'admin', role: currentRole, target, severity, at: new Date().toISOString() };
    setAudit((current) => [entry, ...current]);
    api.admin.audit.create(entry).catch((error) => {
      reportAdminError('ثبت رویداد مدیریتی ناموفق بود', error);
    });
  };

  useEffect(() => {
    if (isAdmin) save('tasis-admin', true);
    else localStorage.removeItem('tasis-admin');
  }, [isAdmin]);

  useEffect(() => {
    const handleExpiredSession = () => setIsAdmin(false);
    window.addEventListener('auth-expired', handleExpiredSession);
    return () => window.removeEventListener('auth-expired', handleExpiredSession);
  }, []);

  useEffect(() => {
    if (!isAdmin || !hasSection('system')) {
      setAudit([]);
      return;
    }
    api.admin.audit.list().then((result) => setAudit(result.items)).catch((error) => {
      reportAdminError('بارگذاری گزارش رویدادها ناموفق بود', error);
    });
  }, [isAdmin, adminIdentity]);

  return (
    <AdminContext.Provider value={{
      isAdmin, setIsAdmin, darkMode, toggleDark, currentRole, adminIdentity, roles, setRoles,
      orders, setOrders, tickets, setTickets, rmas, setRmas, carriers, setCarriers,
      vendors, setVendors, tasks, setTasks, campaigns, setCampaigns, invoices, setInvoices,
      expenses, setExpenses, bankTx, setBankTx, abandoned, setAbandoned, searchTerms, setSearchTerms,
      pages, setPages, banners, setBanners, posts, setPosts, automations, setAutomations,
      loyalty, setLoyalty, integrations, setIntegrations, audit, setAudit,
      surveys, setSurveys, assets, setAssets, loginHistory, setLoginHistory, errorLog, setErrorLog,
      affiliates, setAffiliates, payouts, setPayouts, affConf, setAffConf,
      log, adminSection, setAdminSection,
    }}>
      {children}
    </AdminContext.Provider>
  );
}
