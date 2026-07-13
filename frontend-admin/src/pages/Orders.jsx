import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, tablesApi, menuApi } from '../services/api'
import { useAdminWebSocket } from '../services/websocket'
import { Clock, ChefHat, CheckCircle, Truck, RefreshCw, Plus, Minus, Search, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'

const COLUMNS = [
  { status: 'pending', label: 'Pending', icon: Clock, color: '#eab308', next: 'preparing' },
  { status: 'preparing', label: 'Preparing', icon: ChefHat, color: '#a855f7', next: 'ready' },
  { status: 'ready', label: 'Ready', icon: CheckCircle, color: '#22c55e', next: 'served' },
  { status: 'served', label: 'Served', icon: Truck, color: '#3b82f6', next: null },
]

function OrderCard({ order, onStatusChange }) {
  const elapsed = order.created_at
    ? Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
    : 0

  const col = COLUMNS.find(c => c.status === order.status)

  return (
    <div className="kds-card" style={{ cursor: col?.next ? 'pointer' : 'default' }} onClick={() => {
      if (col?.next) onStatusChange(order.id, col.next)
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Table {order.table_number}</span>
          <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>#{order.id}</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: elapsed > 15 ? '#ef4444' : 'var(--color-muted)' }}>
          {elapsed}m ago
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.625rem' }}>
        {order.items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--color-text)' }}>
              <span style={{ color: item.is_veg ? '#22c55e' : '#ef4444', marginRight: '4px' }}>●</span>
              {item.menu_item_name}
            </span>
            <span style={{ color: 'var(--color-muted)', fontWeight: 600 }}>×{item.quantity}</span>
          </div>
        ))}
      </div>

      {order.notes && (
        <p style={{ fontSize: '0.72rem', color: '#eab308', background: 'rgba(234,179,8,0.1)', padding: '4px 8px', borderRadius: '4px', marginBottom: '0.5rem' }}>
          📝 {order.notes}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          ₹{order.subtotal.toFixed(0)}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
          {order.items.length} items{col?.next ? ' · Click to advance →' : ' · Pending Payment'}
        </span>
      </div>
    </div>
  )
}

function AddOrderModal({ onClose, onSuccess }) {
  const [selectedTableId, setSelectedTableId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState({})
  const [itemNotes, setItemNotes] = useState({})

  const { data: tables = [] } = useQuery({
    queryKey: ['active-tables'],
    queryFn: () => tablesApi.getAll().then(r => r.data),
  })

  const { data: menuItems = [] } = useQuery({
    queryKey: ['all-menu-items'],
    queryFn: () => menuApi.getItems().then(r => r.data),
  })

  const createOrderMut = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      toast.success('Order placed successfully')
      onSuccess()
      onClose()
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to place order')
    }
  })

  const filteredItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.category_name && item.category_name.toLowerCase().includes(search.toLowerCase()))
  )

  const handleUpdateQty = (itemId, delta) => {
    setCart(prev => {
      const current = prev[itemId] || 0
      const next = current + delta
      const updated = { ...prev }
      if (next <= 0) {
        delete updated[itemId]
      } else {
        updated[itemId] = next
      }
      return updated
    })
  }

  const handlePlaceOrder = (e) => {
    e.preventDefault()
    if (!selectedTableId) {
      toast.error('Please select a table')
      return
    }
    const items = Object.entries(cart).map(([itemId, qty]) => ({
      menu_item_id: parseInt(itemId),
      quantity: qty,
      notes: itemNotes[itemId] || null
    }))

    if (items.length === 0) {
      toast.error('Please add at least one item to the order')
      return
    }

    createOrderMut.mutate({
      table_id: parseInt(selectedTableId),
      customer_name: customerName || null,
      notes: notes || null,
      items
    })
  }

  const selectedItemsDetails = Object.entries(cart).map(([itemId, qty]) => {
    const item = menuItems.find(i => i.id === parseInt(itemId))
    return { item, qty }
  }).filter(x => x.item)

  const cartTotal = selectedItemsDetails.reduce((sum, x) => sum + (x.item.price * x.qty), 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
        <h2 style={{ fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingBag color="var(--color-primary)" /> Place Order for Table
        </h2>
        
        <form onSubmit={handlePlaceOrder} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          {/* Left Pane */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: '1px solid var(--color-border)', paddingRight: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="label">Select Table *</label>
                <select 
                  className="input" 
                  value={selectedTableId} 
                  onChange={e => setSelectedTableId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Table --</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      Table {t.number} ({t.status === 'occupied' ? 'Occupied - Add Items' : 'Free'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Customer Name</label>
                <input 
                  className="input" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div>
              <label className="label">General Notes</label>
              <input 
                className="input" 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="e.g. less spicy, serve starters first"
              />
            </div>

            <div>
              <label className="label">Menu Search</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input 
                  className="input" 
                  style={{ paddingLeft: '2.25rem' }} 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Search dishes..."
                />
              </div>
            </div>

            {/* Menu Items */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredItems.map(item => {
                const qty = cart[item.id] || 0
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: item.is_veg ? '#22c55e' : '#ef4444' }}>●</span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>₹{item.price}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {qty > 0 ? (
                        <>
                          <button type="button" className="btn btn-secondary" style={{ padding: '2px 8px' }} onClick={() => handleUpdateQty(item.id, -1)}>-</button>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>{qty}</span>
                          <button type="button" className="btn btn-secondary" style={{ padding: '2px 8px' }} onClick={() => handleUpdateQty(item.id, 1)}>+</button>
                        </>
                      ) : (
                        <button type="button" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleUpdateQty(item.id, 1)}>Add</button>
                      )}
                    </div>
                  </div>
                )
              })}
              {filteredItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-muted)', fontSize: '0.8rem' }}>No items found</div>
              )}
            </div>
          </div>

          {/* Right Pane */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Order Cart</h3>
              <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedItemsDetails.map(({ item, qty }) => (
                  <div key={item.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      <span style={{ color: 'var(--color-muted)' }}>{qty} × ₹{item.price} = ₹{qty * item.price}</span>
                    </div>
                    <input 
                      style={{ marginTop: '0.25rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem', width: '100%', color: 'var(--color-text)' }}
                      placeholder="Add note for this item..."
                      value={itemNotes[item.id] || ''}
                      onChange={e => setItemNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                    />
                  </div>
                ))}
                {selectedItemsDetails.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)', fontSize: '0.8rem' }}>Cart is empty</div>
                )}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Total:</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-primary)' }}>₹{cartTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createOrderMut.isPending || selectedItemsDetails.length === 0}>
                  {createOrderMut.isPending ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Orders() {
  const qc = useQueryClient()
  const [addOrderOpen, setAddOrderOpen] = useState(false)

  const { data: orders = [], refetch } = useQuery({
    queryKey: ['live-orders'],
    queryFn: () => ordersApi.getAll({ status: 'pending,preparing,ready,served' }).then(r => r.data),
    refetchInterval: 30000,
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => ordersApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['live-orders']),
    onError: () => toast.error('Failed to update status'),
  })

  const handleWsMessage = useCallback((msg) => {
    if (['new_order', 'order_update'].includes(msg.type)) {
      refetch()
      if (msg.type === 'new_order') {
        toast.success(`🍽️ New order — Table ${msg.data.table_number}`, { duration: 6000 })
      }
    }
  }, [refetch])

  useAdminWebSocket(handleWsMessage)

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.status] = orders.filter(o => o.status === col.status)
    return acc
  }, {})

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Live Orders</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Kitchen Display System · Click a card to advance its status
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div className="pulse-dot" />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Live</span>
          </div>
          <button className="btn btn-secondary" onClick={() => refetch()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setAddOrderOpen(true)}>
            <Plus size={14} /> Add Order
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {COLUMNS.map(col => {
          const ColIcon = col.icon
          const colOrders = grouped[col.status] || []
          return (
            <div key={col.status} className="kds-column" style={{ minWidth: '260px' }}>
              {/* Column Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.875rem 0.875rem 0.625rem',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ColIcon size={16} color={col.color} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: col.color }}>{col.label}</span>
                </div>
                <span style={{
                  background: `${col.color}22`, color: col.color,
                  borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700,
                  border: `1px solid ${col.color}44`,
                }}>
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ minHeight: '300px' }}>
                {colOrders.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.8rem' }}>
                    No {col.label.toLowerCase()} orders
                  </div>
                ) : (
                  colOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={(id, status) => statusMut.mutate({ id, status })}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
      {addOrderOpen && (
        <AddOrderModal 
          onClose={() => setAddOrderOpen(false)} 
          onSuccess={refetch} 
        />
      )}
    </div>
  )
}
