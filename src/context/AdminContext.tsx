import React, { createContext, useContext, useState, useEffect } from 'react';
import { seedOrders, seedTickets, seedRMAs, seedCarriers, seedVendors, seedTasks, seedRoles, seedCampaigns, seedInvoices, seedExpenses, seedBankTx, seedAbandoned, seedSearchTerms, seedPages, seedBanners, seedPosts, seedAutomations, seedLoyalty, seedIntegrations, seedAuditLog, seedSurveys, seedAssets, seedLoginHistory, seedErrorLog, seedAffiliates, seedPayouts, seedCommissionConfig } from '../data/adminData';

const load = <T,>(key: string, fallback: T): T => { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch { return fallback; } };
const save = (key: string, val: any) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

interface AdminContextType {
  isAdmin: boolean; setIsAdmin: (v: boolean) => void;
  darkMode: boolean; toggleDark: () => void;
  currentRole: string; setRole: (r: string) => void;
  roles: any[]; setRoles: (r: any[]) => void;
  orders: any[]; setOrders: (o: any[]) => void;
  tickets: any[]; setTickets: (t: any[]) => void;
  rmas: any[]; setRmas: (r: any[]) => void;
  carriers: any[]; setCarriers: (c: any[]) => void;
  vendors: any[]; setVendors: (v: any[]) => void;
  tasks: any[]; setTasks: (t: any[]) => void;
  campaigns: any[]; setCampaigns: (c: any[]) => void;
  invoices: any[]; setInvoices: (i: any[]) => void;
  expenses: any[]; setExpenses: (e: any[]) => void;
  bankTx: any[]; setBankTx: (b: any[]) => void;
  abandoned: any[]; setAbandoned: (a: any[]) => void;
  searchTerms: any[]; setSearchTerms: (s: any[]) => void;
  pages: any[]; setPages: (p: any[]) => void;
  banners: any[]; setBanners: (b: any[]) => void;
  posts: any[]; setPosts: (p: any[]) => void;
  automations: any[]; setAutomations: (a: any[]) => void;
  loyalty: any; setLoyalty: (l: any) => void;
  integrations: any[]; setIntegrations: (i: any[]) => void;
  audit: any[]; setAudit: (a: any[]) => void;
  surveys: any[]; setSurveys: (s: any[]) => void;
  assets: any[]; setAssets: (a: any[]) => void;
  loginHistory: any[]; setLoginHistory: (l: any[]) => void;
  errorLog: any[]; setErrorLog: (e: any[]) => void;
  affiliates: any[]; setAffiliates: (a: any[]) => void;
  payouts: any[]; setPayouts: (p: any[]) => void;
  affConf: any; setAffConf: (c: any) => void;
  log: (action: string, target: string, severity?: string) => void;
  adminSection: string; setAdminSection: (s: string) => void;
}

const AdminContext = createContext<AdminContextType>({} as AdminContextType);
export const useAdmin = () => useContext(AdminContext);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => load('tasis-admin', false));
  const [darkMode, setDarkMode] = useState(() => load('tasis-dark', false));
  const [currentRole, setCurrentRole] = useState('مدیر کل');
  const [adminSection, setAdminSection] = useState('home');
  const [roles, setRolesState] = useState(() => load('tasis-roles', seedRoles));
  const [orders, setOrdersState] = useState(() => load('tasis-admin-orders', seedOrders));
  const [tickets, setTicketsState] = useState(() => load('tasis-tickets', seedTickets));
  const [rmas, setRmasState] = useState(() => load('tasis-rmas', seedRMAs));
  const [carriers, setCarriersState] = useState(() => load('tasis-carriers', seedCarriers));
  const [vendors, setVendorsState] = useState(() => load('tasis-vendors', seedVendors));
  const [tasks, setTasksState] = useState(() => load('tasis-tasks', seedTasks));
  const [campaigns, setCampaignsState] = useState(() => load('tasis-campaigns', seedCampaigns));
  const [invoices, setInvoicesState] = useState(() => load('tasis-invoices', seedInvoices));
  const [expenses, setExpensesState] = useState(() => load('tasis-expenses', seedExpenses));
  const [bankTx, setBankTxState] = useState(() => load('tasis-banktx', seedBankTx));
  const [abandoned, setAbandonedState] = useState(() => load('tasis-abandoned', seedAbandoned));
  const [searchTerms, setSearchTermsState] = useState(() => load('tasis-searchterms', seedSearchTerms));
  const [pages, setPagesState] = useState(() => load('tasis-pages', seedPages));
  const [banners, setBannersState] = useState(() => load('tasis-banners', seedBanners));
  const [posts, setPostsState] = useState(() => load('tasis-posts', seedPosts));
  const [automations, setAutomationsState] = useState(() => load('tasis-automations', seedAutomations));
  const [loyalty, setLoyaltyState] = useState(() => load('tasis-loyalty', seedLoyalty));
  const [integrations, setIntegrationsState] = useState(() => load('tasis-integrations', seedIntegrations));
  const [audit, setAuditState] = useState(() => load('tasis-audit', seedAuditLog));
  const [surveys, setSurveysState] = useState(() => load('tasis-surveys', seedSurveys));
  const [assets, setAssetsState] = useState(() => load('tasis-assets', seedAssets));
  const [loginHistory, setLoginHistoryState] = useState(() => load('tasis-logins', seedLoginHistory));
  const [errorLog, setErrorLogState] = useState(() => load('tasis-errors', seedErrorLog));
  const [affiliates, setAffiliatesState] = useState(() => load('tasis-affiliates', seedAffiliates));
  const [payouts, setPayoutsState] = useState(() => load('tasis-payouts', seedPayouts));
  const [affConf, setAffConfState] = useState(() => load('tasis-affconf', seedCommissionConfig));

  const setRoles = (v: any[]) => { setRolesState(v); save('tasis-roles', v); };
  const setOrders = (v: any[]) => { setOrdersState(v); save('tasis-admin-orders', v); };
  const setTickets = (v: any[]) => { setTicketsState(v); save('tasis-tickets', v); };
  const setRmas = (v: any[]) => { setRmasState(v); save('tasis-rmas', v); };
  const setCarriers = (v: any[]) => { setCarriersState(v); save('tasis-carriers', v); };
  const setVendors = (v: any[]) => { setVendorsState(v); save('tasis-vendors', v); };
  const setTasks = (v: any[]) => { setTasksState(v); save('tasis-tasks', v); };
  const setCampaigns = (v: any[]) => { setCampaignsState(v); save('tasis-campaigns', v); };
  const setInvoices = (v: any[]) => { setInvoicesState(v); save('tasis-invoices', v); };
  const setExpenses = (v: any[]) => { setExpensesState(v); save('tasis-expenses', v); };
  const setBankTx = (v: any[]) => { setBankTxState(v); save('tasis-banktx', v); };
  const setAbandoned = (v: any[]) => { setAbandonedState(v); save('tasis-abandoned', v); };
  const setSearchTerms = (v: any[]) => { setSearchTermsState(v); save('tasis-searchterms', v); };
  const setPages = (v: any[]) => { setPagesState(v); save('tasis-pages', v); };
  const setBanners = (v: any[]) => { setBannersState(v); save('tasis-banners', v); };
  const setPosts = (v: any[]) => { setPostsState(v); save('tasis-posts', v); };
  const setAutomations = (v: any[]) => { setAutomationsState(v); save('tasis-automations', v); };
  const setLoyalty = (v: any) => { setLoyaltyState(v); save('tasis-loyalty', v); };
  const setIntegrations = (v: any[]) => { setIntegrationsState(v); save('tasis-integrations', v); };
  const setAudit = (v: any[]) => { setAuditState(v); save('tasis-audit', v); };
  const setSurveys = (v: any[]) => { setSurveysState(v); save('tasis-surveys', v); };
  const setAssets = (v: any[]) => { setAssetsState(v); save('tasis-assets', v); };
  const setLoginHistory = (v: any[]) => { setLoginHistoryState(v); save('tasis-logins', v); };
  const setErrorLog = (v: any[]) => { setErrorLogState(v); save('tasis-errors', v); };
  const setAffiliates = (v: any[]) => { setAffiliatesState(v); save('tasis-affiliates', v); };
  const setPayouts = (v: any[]) => { setPayoutsState(v); save('tasis-payouts', v); };
  const setAffConf = (v: any) => { setAffConfState(v); save('tasis-affconf', v); };

  const toggleDark = () => { const n = !darkMode; setDarkMode(n); save('tasis-dark', n); };
  const setRole = (r: string) => setCurrentRole(r);

  const log = (action: string, target: string, severity = 'normal') => {
    const entry = { id: `log-${Date.now()}`, action, actor: 'admin', role: currentRole, target, severity, at: new Date().toISOString() };
    const newAudit = [entry, ...audit];
    setAudit(newAudit);
  };

  useEffect(() => {
    if (isAdmin) save('tasis-admin', true);
    else localStorage.removeItem('tasis-admin');
  }, [isAdmin]);

  // Auto-generate invoices for new orders
  useEffect(() => {
    const shopOrders = load<any[]>('tasis-orders', []);
    const existingInvoiceOrderIds = invoices.map((inv: any) => inv.orderId);
    
    shopOrders.forEach((order: any) => {
      if (!existingInvoiceOrderIds.includes(order.id)) {
        const invoiceNumber = `INV-${String(invoices.length + 1).padStart(3, '0')}`;
        const newInvoice = {
          id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          number: invoiceNumber,
          orderId: order.id,
          customer: order.customer,
          amount: order.total,
          status: order.status === 'pending' ? 'pending' : 'paid',
          date: order.createdAt
        };
        setInvoices([...invoices, newInvoice]);
      }
    });
  }, []);

  return (
    <AdminContext.Provider value={{
      isAdmin, setIsAdmin, darkMode, toggleDark, currentRole, setRole, roles, setRoles,
      orders, setOrders, tickets, setTickets, rmas, setRmas, carriers, setCarriers,
      vendors, setVendors, tasks, setTasks, campaigns, setCampaigns, invoices, setInvoices,
      expenses, setExpenses, bankTx, setBankTx, abandoned, setAbandoned, searchTerms, setSearchTerms,
      pages, setPages, banners, setBanners, posts, setPosts, automations, setAutomations,
      loyalty, setLoyalty, integrations, setIntegrations, audit, setAudit, surveys, setSurveys,
      assets, setAssets, loginHistory, setLoginHistory, errorLog, setErrorLog,
      affiliates, setAffiliates, payouts, setPayouts, affConf, setAffConf,
      log, adminSection, setAdminSection
    }}>
      {children}
    </AdminContext.Provider>
  );
}
