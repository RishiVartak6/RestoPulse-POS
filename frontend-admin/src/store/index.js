import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    set({ user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  setUser: (user) => set({ user }),
}))

export const useCartStore = create((set, get) => ({
  // Used in billing counter
  selectedOrderId: null,
  setSelectedOrderId: (id) => set({ selectedOrderId: id }),
}))
