import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, billingApi, menuApi, tablesApi, dashboardApi } from '../services/api'
import { Search, Plus, Minus, Trash2, Printer, CreditCard, Percent, X } from 'lucide-react'
import toast from 'react-hot-toast'

function ReceiptPrint({ bill, restaurantName, onClose }) {
  const handlePrint = () => window.print()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 700 }}>Receipt Preview</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Receipt */}
        <div id="thermal-receipt" style={{
          fontFamily: "'Courier New', monospace",
          fontSize: '13px',
          color: '#000',
          background: '#fff',
          padding: '1.25rem',
          borderRadius: '8px',
          lineHeight: 1.6,
        }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>{restaurantName || 'My Restaurant'}</div>
            <div style={{ fontSize: '11px' }}>Thank you for dining with us!</div>
          </div>

          <div style={{ fontSize: '11px', marginBottom: '0.5rem' }}>
            <div>Table: <strong>{bill.table_number} {bill.table_name ? `(${bill.table_name})` : ''}</strong></div>
            <div>Order #: <strong>{bill.order_id}</strong></div>
            <div>Bill #: <strong>{bill.id}</strong></div>
            <div>Date: <strong>{new Date().toLocaleDateString('en-IN')}</strong></div>
            <div>Time: <strong>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></div>
          </div>

          <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '0.5rem 0', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '0.25rem' }}>
              <span>Item</span><span>Qty</span><span>Price</span>
            </div>
            {bill.items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ flex: 1, paddingRight: '4px', overflow: 'hidden' }}>{item.menu_item_name}</span>
                <span style={{ width: '30px', textAlign: 'center' }}>{item.quantity}</span>
                <span style={{ width: '60px', textAlign: 'right' }}>₹{item.subtotal.toFixed(0)}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span><span>₹{bill.subtotal.toFixed(2)}</span>
            </div>
            {bill.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>Discount</span><span>-₹{bill.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>GST ({bill.tax_percentage}%)</span><span>₹{bill.tax_amount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px', borderTop: '1px dashed #ccc', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
              <span>TOTAL</span><span>₹{bill.total.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '0.25rem' }}>
              <span>Payment</span><span>{bill.payment_method?.toUpperCase()}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', borderTop: '1px dashed #ccc', marginTop: '0.75rem', paddingTop: '0.5rem', fontSize: '11px' }}>
            Visit Again! 🙏
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={14} /> Print Receipt
          </button>
        </div>

        {/* Print styles */}
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #thermal-receipt, #thermal-receipt * { visibility: visible !important; }
            #thermal-receipt {
              position: fixed !important;
              left: 0 !important; top: 0 !important;
              width: 80mm !important;
              font-size: 12px !important;
              padding: 4mm !important;
              color: #000 !important;
              background: #fff !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

export default function Billing() {
  const qc = useQueryClient()
  const [tableSearch, setTableSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [discount, setDiscount] = useState({ type: 'flat', value: 0 })
  const [payMethod, setPayMethod] = useState('cash')
  const [bill, setBill] = useState(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [menuSearch, setMenuSearch] = useState('')
  const [showMenuPicker, setShowMenuPicker] = useState(false)

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesApi.getAll().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items-all'],
    queryFn: () => menuApi.getItems().then(r => r.data),
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['billing-orders'],
    queryFn: () => ordersApi.getAll({ status: 'pending,preparing,ready,served' }).then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: settings } = useQuery({
    queryKey: ['restaurant-settings'],
    queryFn: () => dashboardApi.getSettings().then(r => r.data),
  })

  const addItemMut = useMutation({
    mutationFn: ({ orderId, items }) => ordersApi.addItems(orderId, items),
    onSuccess: (data) => { setSelectedOrder(data.data); qc.invalidateQueries(['billing-orders']); toast.success('Item added') },
  })

  const updateQtyMut = useMutation({
    mutationFn: ({ orderId, itemId, qty }) => ordersApi.updateItemQty(orderId, itemId, qty),
    onSuccess: (data) => { setSelectedOrder(data.data); qc.invalidateQueries(['billing-orders']) },
  })

  const removeItemMut = useMutation({
    mutationFn: ({ orderId, itemId }) => ordersApi.removeItem(orderId, itemId),
    onSuccess: (data) => { setSelectedOrder(data.data); qc.invalidateQueries(['billing-orders']); toast.success('Item removed') },
  })

  const generateBillMut = useMutation({
    mutationFn: billingApi.generate,
    onSuccess: (data) => { setBill(data.data); setShowReceipt(true) },
    onError: () => toast.error('Failed to generate bill'),
  })

  const markPaidMut = useMutation({
    mutationFn: billingApi.markPaid,
    onSuccess: () => {
      toast.success('Order marked as paid! Table is now free.')
      setSelectedOrder(null)
      setBill(null)
      setShowReceipt(false)
      qc.invalidateQueries(['billing-orders'])
      qc.invalidateQueries(['tables'])
    },
  })

  const handleGenerateBill = () => {
    if (!selectedOrder) return
    generateBillMut.mutate({
      order_id: selectedOrder.id,
      discount_amount: discount.type === 'flat' ? parseFloat(discount.value) || 0 : 0,
      discount_percentage: discount.type === 'percent' ? parseFloat(discount.value) || 0 : 0,
      payment_method: payMethod,
    })
  }

  const filteredTables = tables.filter(t =>
    t.number.toString().includes(tableSearch) ||
    (t.name || '').toLowerCase().includes(tableSearch.toLowerCase())
  )

  const filteredMenu = menuItems.filter(m =>
    m.name.toLowerCase().includes(menuSearch.toLowerCase()) && m.is_available
  )

  const getOrderForTable = (tableId) => orders.find(o => o.table_id === tableId)

  const subtotal = selectedOrder?.subtotal || 0
  const discountAmt = discount.type === 'flat' ? (parseFloat(discount.value) || 0) : subtotal * (parseFloat(discount.value) || 0) / 100
  const taxable = subtotal - discountAmt
  const gst = settings?.gst_percentage || 5
  const taxAmt = taxable * gst / 100
  const total = taxable + taxAmt

  return (
    <div style={{ padding: '1.5rem', display: 'flex', gap: '1.25rem', height: 'calc(100vh - 48px)' }}>
      {/* Left: Table List */}
      <div style={{ width: '260px', flexShrink: 0 }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1rem' }}>Select Table</h2>
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input className="input" style={{ paddingLeft: '2rem' }} placeholder="Search table..." value={tableSearch} onChange={e => setTableSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
          {filteredTables.map(table => {
            const order = getOrderForTable(table.id)
            const isSelected = selectedOrder?.table_id === table.id
            return (
              <button key={table.id} onClick={() => setSelectedOrder(order || null)}
                style={{
                  background: isSelected ? 'rgba(249,115,22,0.15)' : order ? 'rgba(249,115,22,0.05)' : 'var(--color-surface)',
                  border: `1px solid ${isSelected ? 'var(--color-primary)' : order ? 'rgba(249,115,22,0.3)' : 'var(--color-border)'}`,
                  borderRadius: '8px', padding: '0.75rem', cursor: 'pointer', textAlign: 'left', width: '100%',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Table {table.number}</span>
                  <span style={{ fontSize: '0.7rem', color: order ? '#f97316' : '#22c55e' }}>
                    {order ? '● Occupied' : '● Free'}
                  </span>
                </div>
                {order && <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>Order #{order.id} · ₹{order.subtotal.toFixed(0)}</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Center: Order Items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>
            {selectedOrder ? `Order #${selectedOrder.id} — Table ${selectedOrder.table_number}` : 'Select a table to begin'}
          </h2>
          {selectedOrder && (
            <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => setShowMenuPicker(true)}>
              <Plus size={14} /> Add Item
            </button>
          )}
        </div>

        {!selectedOrder ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '3rem' }}>🍽️</span>
            <p>Select a table from the left to manage its order</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedOrder.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>No items in this order</div>
            ) : (
              selectedOrder.items.map(item => (
                <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: item.is_veg ? '#22c55e' : '#ef4444', fontSize: '0.8rem' }}>●</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.menu_item_name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>₹{item.unit_price} each</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.3rem', minWidth: '28px', justifyContent: 'center' }}
                      onClick={() => updateQtyMut.mutate({ orderId: selectedOrder.id, itemId: item.id, qty: item.quantity - 1 })}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontWeight: 600, minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                    <button className="btn btn-secondary" style={{ padding: '0.3rem', minWidth: '28px', justifyContent: 'center' }}
                      onClick={() => updateQtyMut.mutate({ orderId: selectedOrder.id, itemId: item.id, qty: item.quantity + 1 })}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)', minWidth: '60px', textAlign: 'right' }}>
                    ₹{item.subtotal.toFixed(0)}
                  </span>
                  <button className="btn btn-danger" style={{ padding: '0.3rem 0.5rem' }}
                    onClick={() => removeItemMut.mutate({ orderId: selectedOrder.id, itemId: item.id })}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right: Bill Summary */}
      {selectedOrder && (
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Bill Summary</h2>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--color-muted)' }}>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            {/* Discount */}
            <div>
              <label className="label">Discount</label>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <button className={`btn ${discount.type === 'flat' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem' }}
                  onClick={() => setDiscount(d => ({ ...d, type: 'flat' }))}>
                  ₹ Flat
                </button>
                <button className={`btn ${discount.type === 'percent' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem' }}
                  onClick={() => setDiscount(d => ({ ...d, type: 'percent' }))}>
                  <Percent size={12} /> %
                </button>
              </div>
              <input className="input" type="number" min="0"
                value={discount.value}
                onChange={e => setDiscount(d => ({ ...d, value: e.target.value }))}
                placeholder={discount.type === 'flat' ? '0.00' : '0'} />
            </div>

            {discountAmt > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#22c55e' }}>
                <span>Discount</span><span>-₹{discountAmt.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--color-muted)' }}>GST ({gst}%)</span>
              <span>₹{taxAmt.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.625rem' }}>
              <span>Total</span><span style={{ color: 'var(--color-primary)' }}>₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="label">Payment Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              {['cash', 'upi', 'card', 'other'].map(m => (
                <button key={m} className={`btn ${payMethod === m ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'center', fontSize: '0.8rem', textTransform: 'capitalize' }}
                  onClick={() => setPayMethod(m)}>
                  {m === 'cash' ? '💵' : m === 'upi' ? '📱' : m === 'card' ? '💳' : '🔄'} {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.75rem' }}
              onClick={handleGenerateBill} disabled={generateBillMut.isPending}>
              <Printer size={16} /> Generate Bill & Print
            </button>
            {bill && (
              <button className="btn btn-success" style={{ justifyContent: 'center', padding: '0.75rem' }}
                onClick={() => markPaidMut.mutate(bill.id)} disabled={markPaidMut.isPending}>
                <CreditCard size={16} /> Mark as Paid & Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Menu Picker Modal */}
      {showMenuPicker && (
        <div className="modal-overlay" onClick={() => setShowMenuPicker(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Add Item to Order</h2>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
              <input className="input" style={{ paddingLeft: '2rem' }} placeholder="Search menu..." value={menuSearch} onChange={e => setMenuSearch(e.target.value)} autoFocus />
            </div>
            <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredMenu.map(item => (
                <button key={item.id}
                  onClick={() => { addItemMut.mutate({ orderId: selectedOrder.id, items: [{ menu_item_id: item.id, quantity: 1 }] }); setShowMenuPicker(false) }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', width: '100%' }}>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ color: item.is_veg ? '#22c55e' : '#ef4444', marginRight: '6px', fontSize: '0.8rem' }}>●</span>
                    <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{item.name}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', paddingLeft: '18px' }}>{item.category_name}</div>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>₹{item.price}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showReceipt && bill && (
        <ReceiptPrint
          bill={bill}
          restaurantName={settings?.name}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  )
}
