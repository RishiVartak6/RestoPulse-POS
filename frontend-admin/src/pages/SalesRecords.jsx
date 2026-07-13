import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardApi, billingApi } from '../services/api'
import {
  Receipt, Banknote, Smartphone, CreditCard, Trash2,
  RefreshCw, TrendingUp, Calendar, Filter, AlertCircle, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const paymentColor = { cash: '#22c55e', upi: '#a855f7', card: '#3b82f6', other: '#64748b' }

function PaymentBadge({ method }) {
  const color = paymentColor[method] || '#64748b'
  const icons = { cash: '💵', upi: '📱', card: '💳', other: '🔄' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: `${color}20`, color, border: `1px solid ${color}44`,
      borderRadius: '999px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700,
      textTransform: 'uppercase',
    }}>
      {icons[method] || '🔄'} {method || 'cash'}
    </span>
  )
}

function ConfirmDeleteModal({ bill, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🗑️</div>
        <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Delete Bill #{bill.bill_id}?</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          This will permanently delete the bill record for Table {bill.table_number} (₹{bill.total.toFixed(2)}).
          This action <strong style={{ color: 'var(--color-danger)' }}>cannot be undone</strong>.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} style={{ flex: 1, justifyContent: 'center' }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SalesRecords() {
  const qc = useQueryClient()
  const [filterMode, setFilterMode] = useState('all_time') // 'all_time' | 'today' | 'range'
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Build query params based on filter mode
  const getParams = () => {
    if (filterMode === 'all_time') return { all_time: true }
    if (filterMode === 'today') return { date_filter: new Date().toISOString().split('T')[0] }
    return { from_date: fromDate || undefined, to_date: toDate || undefined }
  }

  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ['sales-records', filterMode, fromDate, toDate],
    queryFn: () => dashboardApi.getBillingHistory(getParams()).then(r => r.data),
    refetchInterval: 60000,
  })

  const deleteMut = useMutation({
    mutationFn: (billId) => billingApi.delete(billId),
    onSuccess: (_, billId) => {
      toast.success(`Bill #${billId} deleted permanently`)
      setDeleteTarget(null)
      qc.invalidateQueries(['sales-records'])
      qc.invalidateQueries(['dashboard-stats'])
    },
    onError: () => toast.error('Failed to delete bill'),
  })

  const bills = history?.bills || []
  const totalRevenue = history?.total_revenue || 0
  const totalBills = history?.total_bills || 0

  // Summary by payment method
  const paymentSummary = bills.reduce((acc, b) => {
    const m = b.payment_method || 'cash'
    acc[m] = (acc[m] || 0) + b.total
    return acc
  }, {})

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Sales Records</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            All paid bills · Permanent record · {history?.range && <span style={{ color: '#f97316' }}>{history.range}</span>}
          </p>
        </div>
        <button onClick={() => refetch()} className="btn btn-secondary">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={15} color="var(--color-muted)" />
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { key: 'all_time', label: '📋 All Time' },
              { key: 'today', label: '📅 Today' },
              { key: 'range', label: '📆 Date Range' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterMode(key)}
                className={`btn ${filterMode === key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}
              >
                {label}
              </button>
            ))}
          </div>

          {filterMode === 'range' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
              <input
                type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="input" style={{ width: '155px', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                id="from-date"
              />
              <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>to</span>
              <input
                type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="input" style={{ width: '155px', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                id="to-date"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f97316', marginTop: '0.25rem' }}>
                ₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{totalBills} transactions</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: '10px', padding: '10px' }}>
              <TrendingUp size={22} color="white" />
            </div>
          </div>
        </div>

        {Object.entries(paymentSummary).map(([method, amount]) => (
          <div key={method} className="stat-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{method}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: paymentColor[method] || '#64748b', marginTop: '0.25rem' }}>
                  ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                  {bills.filter(b => b.payment_method === method).length} bills
                </p>
              </div>
              <div style={{ fontSize: '1.75rem' }}>
                {method === 'cash' ? '💵' : method === 'upi' ? '📱' : method === 'card' ? '💳' : '🔄'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Receipt size={16} color="#f97316" />
          <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Paid Bill Records</h3>
          <span style={{
            background: 'rgba(249,115,22,0.15)', color: '#f97316',
            borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700,
            border: '1px solid rgba(249,115,22,0.3)', marginLeft: '4px',
          }}>{totalBills}</span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spin" style={{ width: '36px', height: '36px', border: '3px solid var(--color-border)', borderTopColor: '#f97316', borderRadius: '50%' }} />
          </div>
        ) : bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-muted)' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>No paid bills found</p>
            <p style={{ fontSize: '0.8rem' }}>Paid bills will appear here permanently after orders are closed</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  {['Bill #', 'Order #', 'Table', 'Items', 'Subtotal', 'Discount', 'GST', 'Total', 'Payment', 'Paid At', 'Action'].map(h => (
                    <th key={h} style={{
                      padding: '0.75rem 1rem', textAlign: 'left',
                      color: 'var(--color-muted)', fontWeight: 500, fontSize: '0.72rem',
                      textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      borderBottom: '1px solid var(--color-border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bills.map((bill, idx) => (
                  <tr key={bill.bill_id} style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    transition: 'background 0.12s',
                  }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontWeight: 700, color: '#f97316' }}>#{bill.bill_id}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-muted)' }}>
                      #{bill.order_id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
                        border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px',
                        padding: '3px 10px', fontWeight: 600, fontSize: '0.8rem',
                      }}>
                      Table {bill.table_number}{bill.table_name && bill.table_name !== `Table ${bill.table_number}` ? ` · ${bill.table_name}` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-muted)', textAlign: 'center' }}>
                      {bill.items_count}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>₹{bill.subtotal.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: bill.discount_amount > 0 ? '#22c55e' : 'var(--color-muted)' }}>
                      {bill.discount_amount > 0 ? `-₹${bill.discount_amount.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-muted)' }}>
                      +₹{bill.tax_amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontWeight: 800, color: '#22c55e', fontSize: '1rem' }}>
                        ₹{bill.total.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <PaymentBadge method={bill.payment_method} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {bill.paid_at ? (
                        <>
                          <div>{new Date(bill.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          <div style={{ color: '#94a3b8' }}>{new Date(bill.paid_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => setDeleteTarget(bill)}
                        title="Delete this record permanently"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(249,115,22,0.06)', borderTop: '2px solid rgba(249,115,22,0.3)' }}>
                  <td colSpan={3} style={{ padding: '0.875rem 1rem', fontWeight: 700, fontSize: '0.875rem' }}>
                    <CheckCircle size={14} color="#22c55e" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                    {totalBills} transactions total
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--color-muted)', textAlign: 'center' }}>
                    {bills.reduce((s, b) => s + b.items_count, 0)} items
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>
                    ₹{bills.reduce((s, b) => s + b.subtotal, 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: '#22c55e', fontWeight: 600 }}>
                    {bills.some(b => b.discount_amount > 0) ? `-₹${bills.reduce((s, b) => s + b.discount_amount, 0).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--color-muted)' }}>
                    +₹{bills.reduce((s, b) => s + b.tax_amount, 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#f97316' }}>
                      ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          bill={deleteTarget}
          onConfirm={() => deleteMut.mutate(deleteTarget.bill_id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
