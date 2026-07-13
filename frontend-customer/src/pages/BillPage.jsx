import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customerApi } from '../services/api'
import { useCartStore } from '../store/cart'
import { CheckCircle, Home } from 'lucide-react'

export default function BillPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const orderId = parseInt(searchParams.get('order'))
  const tableToken = searchParams.get('table')
  const cart = useCartStore()

  const { data: bill, isLoading } = useQuery({
    queryKey: ['bill', orderId],
    queryFn: () => customerApi.getBillByOrder(orderId).then(r => r.data),
    enabled: !!orderId,
    retry: 3,
  })

  const { data: settings } = useQuery({
    queryKey: ['customer-settings'],
    queryFn: () => customerApi.getSettings().then(r => r.data),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
        <p style={{ color: 'var(--color-muted)' }}>Loading your bill...</p>
      </div>
    )
  }

  if (!bill) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
        <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🕐</span>
        <h2 style={{ marginBottom: '0.5rem' }}>Bill not ready yet</h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>The admin will generate your bill shortly</p>
        <button className="btn btn-primary" onClick={() => navigate(`/order-status?order=${orderId}&table=${tableToken}`)}>
          Track Order
        </button>
      </div>
    )
  }

  const isPaid = !!bill.paid_at

  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem 1rem 2rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        {isPaid ? (
          <>
            <CheckCircle size={48} color="var(--color-success)" style={{ margin: '0 auto 0.75rem' }} />
            <h1 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--color-success)' }}>Payment Complete!</h1>
            <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>Thank you for dining with us</p>
          </>
        ) : (
          <>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🧾</span>
            <h1 style={{ fontWeight: 800, fontSize: '1.4rem' }}>Your Bill</h1>
            <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>Please pay at the counter</p>
          </>
        )}
      </div>

      {/* Receipt */}
      <div className="card" style={{ padding: '1.25rem', maxWidth: '400px', margin: '0 auto' }}>
        {/* Restaurant Info */}
        <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '0.875rem', borderBottom: '1px dashed var(--color-border)' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{settings?.name || 'My Restaurant'}</h2>
          {settings?.address && <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{settings.address}</p>}
          {settings?.phone && <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>📞 {settings.phone}</p>}
        </div>

        {/* Bill Details */}
        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.875rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Table: <strong style={{ color: 'var(--color-text)' }}>{bill.table_number} {bill.table_name ? `(${bill.table_name})` : ''}</strong></span>
          <span>Order #<strong style={{ color: 'var(--color-text)' }}>{bill.order_id}</strong></span>
        </div>

        {/* Items */}
        <div style={{ marginBottom: '0.875rem', paddingBottom: '0.875rem', borderBottom: '1px dashed var(--color-border)' }}>
          {bill.items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <div style={{ flex: 1 }}>
                <span style={{ color: item.is_veg ? '#22c55e' : '#ef4444', fontSize: '0.7rem', marginRight: '4px' }}>●</span>
                <span style={{ fontSize: '0.875rem' }}>{item.menu_item_name}</span>
                <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}> ×{item.quantity}</span>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>₹{item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--color-muted)' }}>Subtotal</span>
            <span>₹{bill.subtotal.toFixed(2)}</span>
          </div>
          {bill.discount_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-success)' }}>
              <span>Discount</span>
              <span>-₹{bill.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--color-muted)' }}>GST ({bill.tax_percentage}%)</span>
            <span>₹{bill.tax_amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', padding: '0.875rem 0', borderTop: '2px solid var(--color-border)' }}>
          <span>TOTAL</span>
          <span style={{ color: 'var(--color-primary)' }}>₹{bill.total.toFixed(2)}</span>
        </div>

        {/* Payment */}
        {isPaid && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-muted)', paddingTop: '0.5rem' }}>
            <span>Payment: <strong style={{ color: 'var(--color-text)', textTransform: 'uppercase' }}>{bill.payment_method}</strong></span>
            <span>{new Date(bill.paid_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: '1rem', marginTop: '0.75rem', borderTop: '1px dashed var(--color-border)', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          {settings?.receipt_footer || 'Thank you! Visit Again! 🙏'}
          {settings?.wifi_name && (
            <p style={{ marginTop: '0.3rem' }}>WiFi: <strong>{settings.wifi_name}</strong> · Pass: <strong>{settings.wifi_password}</strong></p>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: '400px', margin: '1rem auto 0', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {!isPaid && (
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-muted)', padding: '0.75rem', background: 'rgba(249,115,22,0.05)', borderRadius: '10px', border: '1px solid rgba(249,115,22,0.2)' }}>
            💳 Please pay at the counter. Show this screen.
          </p>
        )}
        {isPaid && (
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.875rem' }}
            onClick={() => { cart.clearCart(); navigate(`/menu?table=${tableToken}`) }}
          >
            <Home size={16} /> Order Again
          </button>
        )}
      </div>
    </div>
  )
}
