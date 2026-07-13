import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { customerApi } from '../services/api'
import { useCartStore } from '../store/cart'
import { ArrowLeft, Plus, Minus, Trash2, ChevronRight, Loader, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

function VegIndicator({ isVeg }) {
  return (
    <div style={{ width: '14px', height: '14px', border: `2px solid ${isVeg ? '#22c55e' : '#ef4444'}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: isVeg ? '#22c55e' : '#ef4444' }} />
    </div>
  )
}

export default function CartPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tableToken = searchParams.get('table')
  const [note, setNote] = useState('')

  const cart = useCartStore()
  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cart.items.reduce((s, i) => s + i.price * i.quantity, 0)

  const orderMut = useMutation({
    mutationFn: customerApi.placeOrder,
    onSuccess: (res) => {
      const orderId = res.data.id
      cart.setOrderId(orderId)
      toast.success('Order placed! 🎉')
      navigate(`/order-status?order=${orderId}&table=${tableToken}`)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to place order'),
  })

  const handlePlaceOrder = () => {
    if (!tableToken) { toast.error('No table selected'); return }
    if (cart.items.length === 0) { toast.error('Cart is empty'); return }

    orderMut.mutate({
      table_token: tableToken,
      items: cart.items.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
      notes: note || null,
    })
  }

  if (cart.items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
        <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</span>
        <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Your cart is empty</h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>Add some delicious items from the menu</p>
        <button className="btn btn-primary" onClick={() => navigate(`/menu?table=${tableToken}`)}>
          Browse Menu
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '120px' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--color-border)', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={() => navigate(`/menu?table=${tableToken}`)} style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Your Cart</h1>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-muted)' }}>{totalItems} items</span>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
          {cart.items.map(item => (
            <div key={item.menu_item_id} className="card" style={{ padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {item.image_url ? (
                <div style={{ width: '60px', height: '60px', borderRadius: '10px', background: `url(${item.image_url}) center/cover`, flexShrink: 0 }} />
              ) : (
                <div style={{ width: '60px', height: '60px', borderRadius: '10px', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.5rem' }}>🍽️</div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  <VegIndicator isVeg={item.is_veg} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>₹{item.price} each</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="qty-btn qty-btn-remove" onClick={() => cart.removeItem(item.menu_item_id)}>
                  {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                </button>
                <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                <button className="qty-btn qty-btn-add" onClick={() => cart.addItem(item)}>
                  <Plus size={13} />
                </button>
              </div>

              <span style={{ fontWeight: 700, color: 'var(--color-primary)', minWidth: '56px', textAlign: 'right', fontSize: '0.95rem' }}>
                ₹{(item.price * item.quantity).toFixed(0)}
              </span>
            </div>
          ))}
        </div>

        {/* Order Notes */}
        <div className="card" style={{ padding: '0.875rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <MessageSquare size={15} color="var(--color-muted)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-muted)' }}>Order Notes (optional)</span>
          </div>
          <textarea
            className="input"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Any special requests? e.g. Less spicy, no onion..."
            rows={2}
            style={{ resize: 'none', borderRadius: '8px', fontSize: '0.875rem' }}
          />
        </div>

        {/* Price Summary */}
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--color-muted)' }}>Subtotal ({totalItems} items)</span>
            <span>₹{totalPrice.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--color-muted)' }}>GST & Service Tax</span>
            <span style={{ color: 'var(--color-muted)' }}>Calculated at billing</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', paddingTop: '0.625rem', borderTop: '1px solid var(--color-border)' }}>
            <span>Estimated Total</span>
            <span style={{ color: 'var(--color-primary)' }}>₹{totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Place Order Bar */}
      <div className="cart-bar">
        <button
          className="btn btn-primary"
          id="place-order-btn"
          style={{ width: '100%', justifyContent: 'space-between', padding: '0.875rem 1.25rem', fontSize: '0.95rem' }}
          onClick={handlePlaceOrder}
          disabled={orderMut.isPending}
        >
          <span>{orderMut.isPending ? 'Placing Order...' : 'Place Order'}</span>
          {orderMut.isPending ? <Loader size={18} className="spin" /> : <span style={{ fontWeight: 800 }}>₹{totalPrice.toFixed(0)} <ChevronRight size={16} style={{ display: 'inline' }} /></span>}
        </button>
      </div>
    </div>
  )
}
