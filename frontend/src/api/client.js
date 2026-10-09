const BASE = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'workshop-desk.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const toQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) qs.set(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

async function request(path, { method = 'GET', body, params } = {}) {
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(`${BASE}/api${path}${toQuery(params)}`, {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('auth:expired'));
    const message = data?.error?.details?.length
      ? data.error.details.map((d) => `${d.field}: ${d.message}`).join('. ')
      : (data?.error?.message ?? 'Something went wrong');
    throw new ApiError(res.status, message, data?.error?.details);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),

  listWorkshops: (params) => request('/workshops', { params }),
  getWorkshop: (id) => request(`/workshops/${id}`),
  createWorkshop: (body) => request('/workshops', { method: 'POST', body }),
  updateWorkshop: (id, body) => request(`/workshops/${id}`, { method: 'PATCH', body }),

  listRegistrations: (id, params) => request(`/workshops/${id}/registrations`, { params }),
  register: (id, body) => request(`/workshops/${id}/registrations`, { method: 'POST', body }),
  cancelRegistration: (id, regId, reason) =>
    request(`/workshops/${id}/registrations/${regId}/cancel`, { method: 'POST', body: { reason } }),

  listUsers: () => request('/users'),
  createUser: (body) => request('/users', { method: 'POST', body }),
  updateUser: (id, body) => request(`/users/${id}`, { method: 'PATCH', body }),

  listAudit: (params) => request('/audit', { params }),
};
