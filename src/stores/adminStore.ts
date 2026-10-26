import { create } from 'zustand';
import type { AdminContextType } from '../context/AdminContext';
import * as api from '../services/api';

interface AdminState {
  isAdmin: boolean;
  darkMode: boolean;
  currentRole: string;
  adminIdentity: AdminContextType['adminIdentity'];
  adminSection: string;
  setIsAdmin: (value: boolean) => void;
  setDarkMode: (value: boolean) => void;
  toggleDark: () => void;
  setCurrentRole: (role: string) => void;
  setAdminIdentity: (identity: AdminContextType['adminIdentity']) => void;
  setAdminSection: (section: string) => void;
}

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

export const useAdminStore = create<AdminState>((set, get) => ({
  isAdmin: load('tasis-admin', false) && Boolean(api.getToken()),
  darkMode: load('tasis-dark', false),
  currentRole: '',
  adminIdentity: null,
  adminSection: load('tasis-admin-section', 'home'),
  setIsAdmin: (isAdmin) => {
    set({ isAdmin });
    if (isAdmin) save('tasis-admin', true);
    else localStorage.removeItem('tasis-admin');
  },
  setDarkMode: (darkMode) => {
    set({ darkMode });
    save('tasis-dark', darkMode);
  },
  toggleDark: () => get().setDarkMode(!get().darkMode),
  setCurrentRole: (currentRole) => set({ currentRole }),
  setAdminIdentity: (adminIdentity) => set({ adminIdentity }),
  setAdminSection: (adminSection) => {
    set({ adminSection });
    save('tasis-admin-section', adminSection);
  },
}));
