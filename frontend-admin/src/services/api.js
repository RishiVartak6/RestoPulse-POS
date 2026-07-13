import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post('/api/auth/refresh', null, {
            params: { refresh_token: refresh },
          })
          localStorage.setItem('access_token', res.data.access_token)
          localStorage.setItem('refresh_token', res.data.refresh_token)
          original.headers.Authorization = `Bearer ${res.data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/admin/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

// ─── Menu ──────────────────────────────────────────────────────────────────
export const menuApi = {
  getCategories: () => api.get('/menu/categories/all'),
  createCategory: (data) => api.post('/menu/categories', data),
  updateCategory: (id, data) => api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/menu/categories/${id}`),
  uploadCategoryImage: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/menu/categories/${id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  getItems: (params) => api.get('/menu/items/all', { params }),
  createItem: (data) => api.post('/menu/items', data),
  updateItem: (id, data) => api.put(`/menu/items/${id}`, data),
  deleteItem: (id) => api.delete(`/menu/items/${id}`),
  uploadItemImage: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/menu/items/${id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  toggleAvailability: (id) => api.patch(`/menu/items/${id}/toggle-availability`),
}

// ─── Tables ────────────────────────────────────────────────────────────────
export const tablesApi = {
  getAll: () => api.get('/tables'),
  create: (data) => api.post('/tables', data),
  update: (id, data) => api.put(`/tables/${id}`, data),
  delete: (id) => api.delete(`/tables/${id}`),
  regenerateQr: (id) => api.post(`/tables/${id}/regenerate-qr`),
  getQrImageUrl: (id) => `/api/tables/${id}/qr-image`,
}

// ─── Orders ────────────────────────────────────────────────────────────────
export const ordersApi = {
  getAll: (params) => api.get('/orders', { params }),
  create: (data) => api.post('/orders', data),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  addItems: (id, items) => api.post(`/orders/${id}/items`, { items }),
  updateItemQty: (orderId, itemId, quantity) => api.put(`/orders/${orderId}/items/${itemId}`, { quantity }),
  removeItem: (orderId, itemId) => api.delete(`/orders/${orderId}/items/${itemId}`),
}

// ─── Billing ───────────────────────────────────────────────────────────────
export const billingApi = {
  generate: (data) => api.post('/billing/generate', data),
  markPaid: (billId) => api.post(`/billing/${billId}/pay`),
  getByOrder: (orderId) => api.get(`/billing/order/${orderId}`),
  delete: (billId) => api.delete(`/billing/${billId}`),
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getSettings: () => api.get('/dashboard/settings'),
  updateSettings: (data) => api.put('/dashboard/settings', data),
  getBillingHistory: (params = {}) => api.get('/dashboard/billing-history', { params }),
}
