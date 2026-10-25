// ─────────────────────────────────────────────────────────────────────────────
// لایه ارتباط با بک‌اند تای سیز (Express روی پورت 4000)
// در حالت توسعه، vite درخواست‌های /api را به سرور proxy می‌کند.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'tasis-token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'سرور در دسترس نیست');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      setToken(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth-expired'));
    }
    throw new ApiError(res.status, data.message || data.error || 'خطای نامشخص', data.fields);
  }
  return data as T;
}

// ─── احراز هویت مشتری (OTP) ────────────────────────────────────────────────
export const auth = {
  requestOtp: (phone: string) =>
    request<{ ok: boolean; testMode: boolean; devOtp?: string; message: string }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  verifyOtp: (phone: string, code: string, name?: string) =>
    request<{ ok: boolean; token: string; customer: Customer }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, name }),
    }),
  me: () => request<{ customer: Customer }>('/auth/me'),
  updateName: (name: string) => request('/auth/me', { method: 'PUT', body: JSON.stringify({ name }) }),
  adminLogin: (username: string, password: string) =>
    request<{ ok: boolean; token: string; admin: { id: string; username: string; name: string; roleId: string; roleName: string } }>('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
};

// ─── سفارش‌ها و پرداخت ─────────────────────────────────────────────────────
export const orders = {
  create: (payload: CreateOrderPayload) =>
    request<{ ok: boolean; order: any }>('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  mine: () => request<{ items: any[] }>('/orders/mine'),
  track: (code: string, mobile: string) => request<any>(`/orders/track?code=${encodeURIComponent(code)}&mobile=${encodeURIComponent(mobile)}`),
  list: (params = '') => request<{ items: any[] }>(`/orders${params ? `?${params}` : ''}`),
  updateStatus: (id: string, status: string) =>
    request<any>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  posCheckout: (payload: {
    saleId: string;
    customer: string;
    paymentMethod: 'cash' | 'card';
    paymentReference?: string;
    items: { productId: string; qty: number }[];
  }) => request<{ ok: boolean; order: any; invoice: any }>('/orders/pos', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  paymentStart: (orderId: string) =>
    request<{ ok: boolean; authority: string; redirectUrl: string; mock: boolean }>('/payment/start', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),
  paymentStatus: (params: { authority?: string; order?: string }) =>
    request<{ transaction: any; order: any }>(`/payment/status?${new URLSearchParams(params as any)}`),
};

// ─── محصولات، تنظیمات، کد تخفیف، نظرات ─────────────────────────────────────
export const catalog = {
  products: (params = '') => request<{ total: number; items: any[] }>(`/products${params ? `?${params}` : ''}`),
  product: (id: string) => request<any>(`/products/${id}`),
  createProduct: (payload: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id: string, payload: any) => request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProduct: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),
  discounts: () => request<{ items: any[] }>('/discounts'),
  createDiscount: (payload: any) => request<any>('/discounts', { method: 'POST', body: JSON.stringify(payload) }),
  updateDiscount: (id: string, payload: any) => request<any>(`/discounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteDiscount: (id: string) => request<any>(`/discounts/${id}`, { method: 'DELETE' }),
  meta: () => request<{ categories: any[]; brands: string[] }>('/meta'),
  settings: () => request<any>('/settings'),
  updateSettings: (payload: any) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  validateDiscount: (code: string, subtotal: number) =>
    request<{ ok: boolean; code: any; amount: number }>('/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    }),
  reviews: (productId: string, status = 'approved') =>
    request<{ items: any[] }>(`/reviews?productId=${productId}&status=${status}`),
  articles: () => request<{ items: any[] }>('/articles'),
  submitReview: (payload: any) => request<any>('/reviews', { method: 'POST', body: JSON.stringify(payload) }),
  updateReview: (id: string, payload: any) => request<any>(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
};

const collection = (path: string) => ({
  list: () => request<{ items: any[] }>(path),
  create: (payload: any) => request<any>(path, { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: any) => request<any>(`${path}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id: string) => request<any>(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
});

export const support = {
  tickets: collection('/tickets'),
  rmas: {
    ...collection('/rmas'),
    mine: () => request<{ items: any[] }>('/rmas/mine'),
    requestReturn: (payload: { orderId: string; productId: string; quantity: number; reason: string }) =>
      request<any>('/rmas/mine', { method: 'POST', body: JSON.stringify(payload) }),
  },
};

export const logistics = {
  carriers: collection('/carriers'),
  shipments: {
    list: () => request<{ items: any[] }>('/carriers/shipments'),
    save: (orderId: string, payload: { carrierId: string; trackingCode: string; status: string; note: string }) =>
      request<{ order: any; shipment: any }>(`/carriers/shipments/${encodeURIComponent(orderId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  },
  vendors: collection('/vendors'),
  settlements: () => request<{ items: any[] }>('/vendors/settlements'),
  settleVendor: (id: string, reference: string) =>
    request<{ vendor: any; settlement: any }>(`/vendors/${encodeURIComponent(id)}/settlements`, {
      method: 'POST',
      body: JSON.stringify({ reference }),
    }),
};

export const customers = {
  list: () => request<{ items: any[] }>('/customers'),
  notes: (mobile: string) => request<{ items: { id: string; note: string; createdAt: string }[] }>(`/customers/${encodeURIComponent(mobile)}/notes`),
  addNote: (mobile: string, note: string) => request<{ id: string; note: string; createdAt: string }>(`/customers/${encodeURIComponent(mobile)}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  }),
};

export const marketing = {
  campaigns: collection('/campaigns'),
  automations: collection('/automations'),
};

export const finance = {
  invoices: collection('/invoices'),
  expenses: collection('/expenses'),
  bankTx: collection('/bank-tx'),
};

export const content = {
  pages: collection('/content/pages'),
  banners: collection('/content/banners'),
  posts: collection('/content/posts'),
};

export const admin = {
  me: () => request<{ admin: { id: string; username: string; name: string; roleId: string; roleName: string; sections: string[] } }>('/admin/me'),
  users: collection('/admin/users'),
  backup: {
    export: () => request<any>('/admin/backup'),
    restore: (backup: any) => request<{ ok: boolean }>('/admin/backup/restore', {
      method: 'POST',
      body: JSON.stringify(backup),
    }),
  },
  roles: collection('/admin/roles'),
  audit: {
    list: () => request<{ items: any[] }>('/admin/audit'),
    create: (payload: any) => request<any>('/admin/audit', { method: 'POST', body: JSON.stringify(payload) }),
  },
  integrations: {
    list: () => request<{ items: any[] }>('/admin/integrations'),
    update: (id: string, payload: any) => request<any>(`/admin/integrations/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  },
  loyalty: {
    get: () => request<any>('/admin/loyalty'),
    update: (payload: any) => request<any>('/admin/loyalty', { method: 'PUT', body: JSON.stringify(payload) }),
  },
  affConfig: {
    get: () => request<any>('/admin/aff-config'),
    update: (payload: any) => request<any>('/admin/aff-config', { method: 'PUT', body: JSON.stringify(payload) }),
  },
};

export const affiliate = {
  affiliates: collection('/affiliates/affiliates'),
  payouts: collection('/affiliates/payouts'),
  reviewQueue: () => request<{ items: any[] }>('/affiliates/commissions/review'),
  reviewCommission: (id: string, decision: 'approved' | 'rejected') =>
    request<{ ok: boolean; id: string; decision: string }>(`/affiliates/commissions/${encodeURIComponent(id)}/review`, {
      method: 'PUT',
      body: JSON.stringify({ decision }),
    }),
  track: (refCode: string, visitorId: string) =>
    request<{ ok: boolean; refCode: string; expiresAt: string }>('/affiliates/track', {
      method: 'POST',
      body: JSON.stringify({ refCode, visitorId }),
    }),
};

export const tasks = collection('/tasks');

export const analytics = {
  abandoned: collection('/abandoned'),
  searchTerms: collection('/search-terms'),
  surveys: collection('/surveys'),
  assets: collection('/assets'),
  loginHistory: {
    list: () => request<{ items: any[] }>('/login-history'),
    create: (payload: any) => request<any>('/login-history', { method: 'POST', body: JSON.stringify(payload) }),
    delete: (id: string) => request<any>(`/login-history/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  errorLog: collection('/error-log'),
};

// ─── تایپ‌ها ───────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  phone: string;
  name: string;
  loyaltyPoints?: number;
  loyaltyPointValue?: number;
  loyaltyRedemptionCapPercent?: number;
}
export interface CreateOrderPayload {
  name: string;
  mobile: string;
  city: string;
  address: string;
  postalCode?: string;
  items: { productId: string; qty: number; size: string; color: string }[];
  couponCode?: string;
  redeemPoints?: number;
  affiliateVisitorId?: string;
}
