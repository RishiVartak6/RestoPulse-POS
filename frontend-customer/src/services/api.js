import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const customerApi = {
  getSettings: () => api.get('/dashboard/settings/public'),
  getCategories: () => api.get('/menu/categories'),
  getMenuItems: (params) => api.get('/menu/items', { params }),
  getTableByToken: (token) => api.get(`/tables/by-token/${token}`),
  placeOrder: (data) => api.post('/orders', data),
  trackOrder: (orderId) => api.get(`/orders/track/${orderId}`),
  getOrderByTable: (tableToken) => api.get(`/orders/by-table/${tableToken}`),
  getBillByOrder: (orderId) => api.get(`/billing/order/${orderId}`),
}
