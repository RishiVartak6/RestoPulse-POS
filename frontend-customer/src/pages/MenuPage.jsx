import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customerApi } from '../services/api'
import { useCartStore } from '../store/cart'
import { Search, Filter, Leaf, ShoppingCart, ChevronRight, Plus, Minus } from 'lucide-react'

function VegIndicator({ isVeg }) {
  return (
    <div style={{
      width: '16px', height: '16px',
      border: `2px solid ${isVeg ? '#22c55e' : '#ef4444'}`,
      borderRadius: '3px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isVeg ? '#22c55e' : '#ef4444' }} />
    </div>
  )
}

function QtyControl({ item, onAdd, onRemove, qty }) {
  if (qty === 0) {
    return (
      <button className="qty-btn qty-btn-add bounce-in" onClick={(e) => { e.stopPropagation(); onAdd(item) }} style={{ width: '36px', height: '36px' }}>
        <Plus size={16} />
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} className="bounce-in">
      <button className="qty-btn qty-btn-remove" onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}>
        <Minus size={14} />
      </button>
      <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' }}>{qty}</span>
      <button className="qty-btn qty-btn-add" onClick={(e) => { e.stopPropagation(); onAdd(item) }}>
        <Plus size={14} />
      </button>
    </div>
  )
}

export default function MenuPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tableToken = searchParams.get('table')

  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState(null)
  const [vegOnly, setVegOnly] = useState(false)

  const cart = useCartStore()
  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cart.items.reduce((s, i) => s + i.price * i.quantity, 0)

  const { data: table } = useQuery({
    queryKey: ['table', tableToken],
    queryFn: () => customerApi.getTableByToken(tableToken).then(r => r.data),
    enabled: !!tableToken,
    retry: false,
    onError: () => navigate('/invalid-qr'),
  })

  const { data: settings } = useQuery({
    queryKey: ['customer-settings'],
    queryFn: () => customerApi.getSettings().then(r => r.data),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: () => customerApi.getCategories().then(r => r.data),
  })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['customer-menu', activeCat],
    queryFn: () => customerApi.getMenuItems(activeCat ? { category_id: activeCat } : {}).then(r => r.data),
  })

  useEffect(() => {
    if (tableToken) {
      cart.setTable(tableToken, table?.number)
      if (table?.active_order_id) {
        cart.setOrderId(table.active_order_id)
      }
    }
  }, [tableToken, table])

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(search.toLowerCase())
    const matchVeg = !vegOnly || item.is_veg
    return matchSearch && matchVeg
  })

  const getQty = (itemId) => {
    const ci = cart.items.find(i => i.menu_item_id === itemId)
    return ci?.quantity || 0
  }

  const handleAdd = (item) => {
    cart.addItem({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      is_veg: item.is_veg,
      image_url: item.image_url,
    })
  }

  const handleRemove = (itemId) => cart.removeItem(itemId)

  return (
    <div style={{ minHeight: '100vh', paddingBottom: totalItems > 0 ? '100px' : '0' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ padding: '0.875rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: '1.25rem', background: 'linear-gradient(135deg, #f97316, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {settings?.name || 'Restaurant'}
              </h1>
              {table && <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Table {table.number}</p>}
            </div>
            <button onClick={() => navigate(`/cart?table=${tableToken}`)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}>
              <ShoppingCart size={24} color="var(--color-text)" />
              {totalItems > 0 && (
                <span className="bounce-in" style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: 'var(--color-primary)', color: 'white',
                  borderRadius: '50%', width: '18px', height: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                }}>
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: '2.25rem', borderRadius: '12px' }}
              placeholder="Search dishes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="menu-search"
            />
          </div>

          {/* Categories */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              className={`category-pill ${activeCat === null ? 'active' : ''}`}
              onClick={() => setActiveCat(null)}
            >All</button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-pill ${activeCat === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCat(cat.id)}
              >{cat.name}</button>
            ))}
            <button
              className={`category-pill ${vegOnly ? 'active' : ''}`}
              onClick={() => setVegOnly(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Leaf size={12} /> Veg
            </button>
          </div>
        </div>
      </div>

      {/* Active Order Banner */}
      {table?.active_order_id && (
        <div style={{
          margin: '0.875rem 1rem 0',
          background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(168,85,247,0.15))',
          border: '1px solid rgba(249,115,22,0.3)',
          borderRadius: '12px',
          padding: '0.875rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
        }} className="bounce-in">
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔔</span> Active Order #{table.active_order_id} in progress!
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Your food is being processed. Feel free to add more items.
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', flexShrink: 0 }}
            onClick={() => navigate(`/order-status?order=${table.active_order_id}&table=${tableToken}`)}
          >
            Track Status
          </button>
        </div>
      )}

      {/* Menu Items */}
      <div style={{ padding: '0.875rem 1rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spin" style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map(item => {
              const qty = getQty(item.id)
              return (
                <div key={item.id} className="menu-item-card slide-up">
                  <div style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem' }}>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <VegIndicator isVeg={item.is_veg} />
                        {item.is_featured && <span style={{ fontSize: '0.65rem', background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '999px', padding: '1px 6px' }}>⭐ Popular</span>}
                      </div>
                      <h3 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.3rem' }}>{item.name}</h3>
                      {item.description && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', lineHeight: 1.4, marginBottom: '0.5rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>₹{item.price}</span>
                        <QtyControl item={item} onAdd={handleAdd} onRemove={handleRemove} qty={qty} />
                      </div>
                    </div>

                    {/* Image */}
                    {item.image_url && (
                      <div style={{
                        width: '90px', height: '90px', flexShrink: 0,
                        borderRadius: '10px',
                        background: `url(${item.image_url}) center/cover`,
                        border: '1px solid var(--color-border)',
                      }} />
                    )}
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--color-muted)' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🔍</span>
                <p>No items found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart Bar */}
      {totalItems > 0 && (
        <div className="cart-bar slide-up">
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'space-between', padding: '0.875rem 1.25rem', fontSize: '0.95rem' }}
            onClick={() => navigate(`/cart?table=${tableToken}`)}
            id="view-cart-btn"
          >
            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '999px', padding: '2px 10px', fontSize: '0.8rem' }}>
              {totalItems} items
            </span>
            <span>View Cart</span>
            <span style={{ fontWeight: 800 }}>₹{totalPrice.toFixed(0)} <ChevronRight size={16} style={{ display: 'inline' }} /></span>
          </button>
        </div>
      )}
    </div>
  )
}
