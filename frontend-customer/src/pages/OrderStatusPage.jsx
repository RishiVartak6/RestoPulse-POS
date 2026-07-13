import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customerApi } from '../services/api'
import { useCartStore } from '../store/cart'
import { useOrderWebSocket } from '../hooks/useWebSocket'
import { CheckCircle, Clock, ChefHat, Truck, Receipt, ArrowLeft } from 'lucide-react'

const STATUS_STEPS = [
  { status: 'pending', icon: Clock, label: 'Order Placed', desc: 'Your order is waiting to be confirmed', emoji: '⏳' },
  { status: 'preparing', icon: ChefHat, label: 'Preparing', desc: 'Chef is preparing your food', emoji: '👨‍🍳' },
  { status: 'ready', icon: CheckCircle, label: 'Ready!', desc: 'Your food is ready, being served', emoji: '✅' },
  { status: 'served', icon: Truck, label: 'Served', desc: 'Enjoy your meal!', emoji: '🍽️' },
  { status: 'paid', icon: Receipt, label: 'Completed', desc: 'Thank you! Visit again', emoji: '🙏' },
]

const STATUS_ORDER = ['pending', 'preparing', 'ready', 'served', 'paid']

export default function OrderStatusPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const orderId = parseInt(searchParams.get('order'))
  const tableToken = searchParams.get('table')

  const [order, setOrder] = useState(null)
  const cart = useCartStore()

  const { isLoading } = useQuery({
    queryKey: ['track-order', orderId],
    queryFn: () => customerApi.trackOrder(orderId).then(r => { setOrder(r.data); return r.data }),
    enabled: !!orderId,
    refetchInterval: 30000,
  })

  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'order_update' && msg.data.id === orderId) {
      setOrder(msg.data)
    }
    if (msg.type === 'bill_ready') {
      navigate(`/bill?order=${orderId}&table=${tableToken}`)
    }
  }, [orderId, tableToken, navigate])

  useOrderWebSocket(orderId, handleWsMessage)

  if (isLoading || !order) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
      </div>
    )
  }

  const currentIdx = STATUS_ORDER.indexOf(order.status)
  const currentStep = STATUS_STEPS.find(s => s.status === order.status)

  return (
    <div style={{ minHeight: '100vh', padding: '0 0 2rem' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(168,85,247,0.1))', padding: '1.5rem 1rem 2rem', textAlign: 'center', position: 'relative' }}>
        <button onClick={() => navigate(`/menu?table=${tableToken}`)} style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>{currentStep?.emoji}</div>
        <h1 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.25rem' }}>{currentStep?.label}</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>{currentStep?.desc}</p>
        <div style={{ marginTop: '0.625rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>Order #{order.id} · Table {order.table_number}</div>
      </div>

      {/* Progress */}
      <div style={{ padding: '1.5rem 1rem' }}>
        <div style={{ position: 'relative' }}>
          {/* Progress line */}
          <div style={{ position: 'absolute', left: '19px', top: '20px', bottom: '20px', width: '2px', background: 'var(--color-border)', zIndex: 0 }} />
          <div style={{
            position: 'absolute', left: '19px', top: '20px',
            width: '2px', zIndex: 0,
            background: 'linear-gradient(to bottom, #f97316, #a855f7)',
            height: `${(currentIdx / (STATUS_ORDER.length - 1)) * 100}%`,
            transition: 'height 0.5s ease',
          }} />

          {STATUS_STEPS.filter(s => s.status !== 'cancelled').map((step, idx) => {
            const stepIdx = STATUS_ORDER.indexOf(step.status)
            const isDone = currentIdx > stepIdx
            const isActive = currentIdx === stepIdx
            const isPending = currentIdx < stepIdx

            return (
              <div key={step.status} className="status-step" style={{ opacity: isPending ? 0.4 : 1 }}>
                <div className={`status-dot ${isActive ? 'active' : ''}`} style={{
                  background: isDone ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  border: `2px solid ${isDone ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}>
                  {isDone ? '✓' : step.emoji}
                </div>
                <div>
                  <p style={{ fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--color-text)' : isDone ? 'var(--color-text)' : 'var(--color-muted)', fontSize: '0.95rem' }}>
                    {step.label}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Order Items */}
        <div className="card" style={{ padding: '1rem', marginTop: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>Your Order</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {order.items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>
                  <span style={{ color: item.is_veg ? '#22c55e' : '#ef4444', marginRight: '4px' }}>●</span>
                  {item.menu_item_name} × {item.quantity}
                </span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>₹{item.subtotal.toFixed(0)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)', marginTop: '0.25rem' }}>
              <span>Subtotal</span>
              <span style={{ color: 'var(--color-primary)' }}>₹{order.subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* View Bill Button */}
        {['ready', 'served', 'paid'].includes(order.status) && (
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', marginTop: '1rem', fontSize: '0.95rem' }}
            onClick={() => navigate(`/bill?order=${orderId}&table=${tableToken}`)}
          >
            <Receipt size={16} /> View Bill
          </button>
        )}

        {/* Add more items */}
        {['pending', 'preparing'].includes(order.status) && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.75rem' }}
            onClick={() => navigate(`/menu?table=${tableToken}`)}
          >
            + Add More Items
          </button>
        )}
      </div>
    </div>
  )
}
