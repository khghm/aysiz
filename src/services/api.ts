// ─────────────────────────────────────────────────────────────────────────────
// لایه ارتباط با بک‌اند تای سیز (Express روی پورت 4000)
// در حالت توسعه، vite درخواست‌های /api را به سرور proxy می‌کند.
// ─────────────────────────────────────────────────────────────────────────────

const AUTH_FLAG_KEY = 'tasis-auth';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const getToken = () => localStorage.getItem(AUTH_FLAG_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(AUTH_FLAG_KEY, '1') : localStorage.removeItem(AUTH_FLAG_KEY);

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
  // CSRF token from readable cookie
  const csrfMatch = document.cookie.match(/(?:^|; )tasis_csrf=([^;]+)/);
  if (csrfMatch && options.method && options.method !== 'GET') {
    headers['X-CSRF-Token'] = decodeURIComponent(csrfMatch[1]);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, { ...options, headers, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'سرور در دسترس نیست');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    if (!res.ok) throw new ApiError(res.status, 'پاسخ معتبر از سرور دریافت نشد');
    throw new ApiError(502, 'سرویس API متصل نیست یا پاسخ JSON نمی‌دهد');
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(502, 'پاسخ سرویس API معتبر نیست');
  }
  if (!res.ok) {
    if (res.status === 401) {
      setToken(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth-expired'));
    }
    const payload = data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {};
    const fields = payload.fields && typeof payload.fields === 'object' && !Array.isArray(payload.fields)
      && Object.values(payload.fields).every((field) => typeof field === 'string')
      ? payload.fields as Record<string, string>
      : undefined;
    const message = typeof payload.message === 'string'
      ? payload.message
      : typeof payload.error === 'string' ? payload.error : 'خطای نامشخص';
    throw new ApiError(res.status, message, fields);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ApiError(502, 'ساختار پاسخ سرویس API معتبر نیست');
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
    request<{ ok: boolean; customer: Customer }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, name }),
    }),
  me: () => request<{ customer: Customer }>('/auth/me'),
  updateName: (name: string) => request('/auth/me', { method: 'PUT', body: JSON.stringify({ name }) }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  adminLogin: (username: string, password: string) =>
    request<{ ok: boolean; admin: { id: string; username: string; name: string; roleId: string; roleName: string } }>('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  adminLogout: () => request<{ ok: boolean }>('/auth/admin-logout', { method: 'POST' }),
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
  deleteProductImage: (productId: string, imageId: string) => request<any>(`/uploads/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`, { method: 'DELETE' }),
  uploadProductImage: async (productId: string, file: File, alt?: string) => {
    const fd = new FormData();
    fd.append('image', file);
    if (alt) fd.append('alt', alt);
    const token = getToken();
    const csrfMatch = document.cookie.match(/(?:^|; )tasis_csrf=([^;]+)/);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (csrfMatch) headers['X-CSRF-Token'] = decodeURIComponent(csrfMatch[1]);
    const res = await fetch(`${API_BASE_URL}/api/uploads/products/${encodeURIComponent(productId)}/images`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
      headers,
    });
    if (!res.ok) throw new Error(`upload failed: ${res.status}`);
    return res.json();
  },
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
