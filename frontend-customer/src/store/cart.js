import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],       // { menu_item_id, name, price, quantity, is_veg, image_url }
      tableToken: null,
      tableNumber: null,
      orderId: null,

      setTable: (token, number) => set({ tableToken: token, tableNumber: number }),
      setOrderId: (id) => set({ orderId: id }),

      addItem: (item) => {
        const items = get().items
        const existing = items.find(i => i.menu_item_id === item.menu_item_id)
        if (existing) {
          set({ items: items.map(i => i.menu_item_id === item.menu_item_id ? { ...i, quantity: i.quantity + 1 } : i) })
        } else {
          set({ items: [...items, { ...item, quantity: 1 }] })
        }
      },

      removeItem: (menuItemId) => {
        const items = get().items
        const existing = items.find(i => i.menu_item_id === menuItemId)
        if (!existing) return
        if (existing.quantity === 1) {
          set({ items: items.filter(i => i.menu_item_id !== menuItemId) })
        } else {
          set({ items: items.map(i => i.menu_item_id === menuItemId ? { ...i, quantity: i.quantity - 1 } : i) })
        }
      },

      clearCart: () => set({ items: [], orderId: null }),

      get totalItems() { return get().items.reduce((s, i) => s + i.quantity, 0) },
      get totalPrice() { return get().items.reduce((s, i) => s + i.price * i.quantity, 0) },
    }),
    { name: 'restaurant-cart' }
  )
)
