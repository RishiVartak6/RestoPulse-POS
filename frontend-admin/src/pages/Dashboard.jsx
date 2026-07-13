import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { dashboardApi } from '../services/api'
import { useAdminWebSocket } from '../services/websocket'
import {
  TrendingUp, ShoppingBag, CheckCircle, Table2,
  Clock, ChefHat, AlertCircle, Star, RefreshCw,
  Receipt, CreditCard, Smartphone, Banknote, ChevronRight
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import toast from 'react-hot-toast'

const statusColor = {
  pending: '#eab308',
  preparing: '#a855f7',
  ready: '#22c55e',
  served: '#3b82f6',
  paid: '#64748b',
  cancelled: '#ef4444',
}

const paymentIcon = {
  cash: Banknote,
  upi: Smartphone,
  card: CreditCard,
  other: Receipt,
}

const paymentColor = {
  cash: '#22c55e',
  upi: '#a855f7',
  card: '#3b82f6',
  other: '#64748b',
}

function PaymentBadge({ method }) {
  const Icon = paymentIcon[method] || Receipt
  const color = paymentColor[method] || '#64748b'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: `${color}22`, color, border: `1px solid ${color}44`,
      borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600,
      textTransform: 'uppercase',
    }}>
      <Icon size={10} /> {method || 'cash'}
    </span>
  )
}

export default function Dashboard() {
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().split('T')[0])

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['billing-history', historyDate],
    queryFn: () => dashboardApi.getBillingHistory(historyDate).then(r => r.data),
    refetchInterval: 30000,
  })

  const refetch = () => { refetchStats(); refetchHistory() }

  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'new_order') {
      toast.success(`🍽️ New order from Table ${msg.data.table_number}!`, { duration: 5000 })
      refetch()
    } else if (['order_update', 'order_paid'].includes(msg.type)) {
      refetch()
    }
  }, [])

  useAdminWebSocket(handleWsMessage)

  const StatCard = ({ icon: Icon, label, value, sub, color, gradient }) => (
    <div className="stat-card">
      <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', borderRadius: '50%', background: gradient, opacity: 0.1, transform: 'translate(30px, -30px)' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: color || 'var(--color-text)', marginTop: '0.25rem' }}>{value ?? '—'}</p>
          {sub && <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{sub}</p>}
        </div>
        <div style={{ background: gradient, borderRadius: '10px', padding: '10px', opacity: 0.9 }}>
          <Icon size={22} color="white" />
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="pulse-dot" />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Live</span>
          <button onClick={refetch} className="btn btn-secondary" style={{ marginLeft: '0.5rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard
          icon={TrendingUp} label="Today's Revenue"
          value={stats ? `₹${stats.today_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
          sub={`${stats?.today_orders ?? 0} orders completed`}
          color="#f97316" gradient="linear-gradient(135deg, #f97316, #ea580c)"
        />
        <StatCard
          icon={Clock} label="Pending Orders"
          value={stats?.pending_orders ?? '—'}
          sub="Waiting to be prepared"
          color="#eab308" gradient="linear-gradient(135deg, #eab308, #d97706)"
        />
        <StatCard
          icon={ChefHat} label="Preparing"
          value={stats?.preparing_orders ?? '—'}
          sub="In kitchen right now"
          color="#a855f7" gradient="linear-gradient(135deg, #a855f7, #7c3aed)"
        />
        <StatCard
          icon={CheckCircle} label="Completed Today"
          value={stats?.completed_orders ?? '—'}
          sub="Served & paid orders"
          color="#22c55e" gradient="linear-gradient(135deg, #22c55e, #16a34a)"
        />
        <StatCard
          icon={Table2} label="Tables Occupied"
          value={stats ? `${stats.occupied_tables}/${stats.total_tables}` : '—'}
          sub={`${stats?.free_tables ?? 0} tables free`}
          color="#3b82f6" gradient="linear-gradient(135deg, #3b82f6, #1d4ed8)"
        />
      </div>

      {/* Middle: Charts + Recent Orders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Top Items Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Star size={16} color="#f97316" />
            <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Top Selling Today</h3>
          </div>
          {stats?.top_items?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.top_items} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{ background: '#1a1a28', border: '1px solid #2a2a3d', borderRadius: '8px', color: '#f1f5f9' }}
                  formatter={(v, n) => [v, n === 'qty' ? 'Qty Sold' : 'Revenue']}
                />
                <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
                  {stats.top_items.map((_, i) => (
                    <Cell key={i} fill={['#f97316','#a855f7','#22c55e','#3b82f6','#eab308'][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
              <ShoppingBag size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.875rem' }}>No sales data yet today</p>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ShoppingBag size={16} color="#f97316" />
            <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Recent Orders</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(stats?.recent_orders ?? []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
                <AlertCircle size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>No orders today</p>
              </div>
            ) : (
              stats.recent_orders.map(order => (
                <div key={order.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.625rem 0.75rem',
                  background: 'var(--color-surface-2)',
                  borderRadius: '8px',
                  border: `1px solid ${order.status === 'paid' ? 'rgba(34,197,94,0.2)' : 'var(--color-border)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: `${statusColor[order.status]}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 700, color: statusColor[order.status]
                    }}>
                      T{order.table_number}
                    </div>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>Order #{order.id}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                        {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                    <span className={`badge badge-${order.status}`}>{order.status}</span>
                    {order.status === 'paid' && order.bill_total != null ? (
                      <>
                        <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 700 }}>₹{order.bill_total.toFixed(0)}</span>
                        {order.payment_method && <PaymentBadge method={order.payment_method} />}
                      </>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text)', fontWeight: 600 }}>₹{order.subtotal.toFixed(0)}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sales History / Paid Bills */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Receipt size={16} color="#f97316" />
            <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Sales History</h3>
            {history && (
              <span style={{
                background: 'rgba(249,115,22,0.15)', color: '#f97316',
                border: '1px solid rgba(249,115,22,0.3)', borderRadius: '999px',
                padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700,
              }}>
                {history.total_bills} bills · ₹{history.total_revenue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="date"
              value={historyDate}
              onChange={e => setHistoryDate(e.target.value)}
              className="input"
              style={{ width: '160px', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              id="history-date-filter"
            />
          </div>
        </div>

        {!history || history.bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-muted)' }}>
            <Receipt size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
            <p style={{ fontWeight: 500 }}>No paid bills for {historyDate}</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Bills will appear here once orders are marked as paid</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Bill #', 'Order #', 'Table', 'Items', 'Subtotal', 'Discount', 'GST', 'Total', 'Payment', 'Paid At'].map(h => (
                    <th key={h} style={{
                      padding: '0.625rem 0.75rem', textAlign: 'left',
                      color: 'var(--color-muted)', fontWeight: 500, fontSize: '0.75rem',
                      textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.bills.map((bill, idx) => (
                  <tr key={bill.bill_id} style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    transition: 'background 0.1s',
                  }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#f97316' }}>#{bill.bill_id}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-muted)' }}>#{bill.order_id}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
                        border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px',
                        padding: '2px 8px', fontWeight: 600, fontSize: '0.8rem',
                      }}>
                        Table {bill.table_number}{bill.table_name ? ` (${bill.table_name})` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-muted)' }}>{bill.items_count} items</td>
                    <td style={{ padding: '0.75rem' }}>₹{bill.subtotal.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem', color: bill.discount_amount > 0 ? '#22c55e' : 'var(--color-muted)' }}>
                      {bill.discount_amount > 0 ? `-₹${bill.discount_amount.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-muted)' }}>₹{bill.tax_amount.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#22c55e', fontSize: '0.95rem' }}>
                      ₹{bill.total.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <PaymentBadge method={bill.payment_method} />
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {bill.paid_at
                        ? new Date(bill.paid_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--color-border)', background: 'rgba(249,115,22,0.05)' }}>
                  <td colSpan={7} style={{ padding: '0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Daily Total — {history.total_bills} transactions
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 800, fontSize: '1.05rem', color: '#f97316' }}>
                    ₹{history.total_revenue?.toFixed(2)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
