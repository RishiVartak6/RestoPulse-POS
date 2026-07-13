import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { menuApi } from '../services/api'
import { Plus, Pencil, Trash2, Image, Search, Filter, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

function MenuItemModal({ item, categories, onClose, onSave }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    category_id: item?.category_id || (categories[0]?.id || ''),
    is_veg: item?.is_veg ?? true,
    is_available: item?.is_available ?? true,
    is_featured: item?.is_featured ?? false,
    display_order: item?.display_order || 0,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...form, price: parseFloat(form.price), category_id: parseInt(form.category_id) })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>
          {item ? 'Edit Menu Item' : 'Add Menu Item'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Item Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Butter Chicken" required />
            </div>
            <div>
              <label className="label">Price (₹) *</label>
              <input className="input" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="299" required min="0" />
            </div>
            <div>
              <label className="label">Category *</label>
              <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Description</label>
              <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Item description..." rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { key: 'is_veg', label: '🌿 Vegetarian' },
              { key: 'is_available', label: '✅ Available' },
              { key: 'is_featured', label: '⭐ Featured' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <label className="toggle">
                  <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                  <span className="toggle-slider" />
                </label>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>{label}</span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Item</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Menu() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterVeg, setFilterVeg] = useState('all')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => menuApi.getCategories().then(r => r.data),
  })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['menu-items-all'],
    queryFn: () => menuApi.getItems().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: menuApi.createItem,
    onSuccess: () => { qc.invalidateQueries(['menu-items-all']); toast.success('Item created'); setModal(null) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => menuApi.updateItem(id, data),
    onSuccess: () => { qc.invalidateQueries(['menu-items-all']); toast.success('Item updated'); setModal(null) },
  })
  const deleteMut = useMutation({
    mutationFn: menuApi.deleteItem,
    onSuccess: () => { qc.invalidateQueries(['menu-items-all']); toast.success('Item deleted') },
  })
  const toggleMut = useMutation({
    mutationFn: menuApi.toggleAvailability,
    onSuccess: () => qc.invalidateQueries(['menu-items-all']),
  })
  const uploadMut = useMutation({
    mutationFn: ({ id, file }) => menuApi.uploadItemImage(id, file),
    onSuccess: () => { qc.invalidateQueries(['menu-items-all']); toast.success('Image uploaded') },
  })

  const handleSave = (form) => {
    if (modal?.item) updateMut.mutate({ id: modal.item.id, data: form })
    else createMut.mutate(form)
  }

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || item.category_id === parseInt(filterCat)
    const matchVeg = filterVeg === 'all' || (filterVeg === 'veg' ? item.is_veg : !item.is_veg)
    return matchSearch && matchCat && matchVeg
  })

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Menu Items</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>{items.length} total items</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'add' })} id="add-item-btn">
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
          <input className="input" style={{ paddingLeft: '2rem' }} placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" style={{ width: 'auto' }} value={filterVeg} onChange={e => setFilterVeg(e.target.value)}>
          <option value="all">All Types</option>
          <option value="veg">🌿 Veg Only</option>
          <option value="nonveg">🍗 Non-Veg</option>
        </select>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spin" style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
          {filtered.map(item => (
            <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: item.is_available ? 1 : 0.6 }}>
              {/* Image */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '100%', height: '140px', borderRadius: '8px',
                  background: item.image_url ? `url(${item.image_url}) center/cover` : 'linear-gradient(135deg, #1a1a28, #2a2a3d)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {!item.image_url && <span style={{ fontSize: '2.5rem' }}>🍽️</span>}
                </div>
                {/* Veg badge */}
                <span className={`badge ${item.is_veg ? 'badge-veg' : 'badge-nonveg'}`} style={{ position: 'absolute', top: '8px', left: '8px' }}>
                  {item.is_veg ? '🌿 Veg' : '🍗 Non-Veg'}
                </span>
                {item.is_featured && <span className="badge badge-preparing" style={{ position: 'absolute', top: '8px', right: '8px' }}>⭐ Featured</span>}
                {/* Upload button */}
                <label style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Image size={12} color="white" /><span style={{ fontSize: '0.7rem', color: 'white' }}>Upload</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadMut.mutate({ id: item.id, file: e.target.files[0] })} />
                </label>
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</h3>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '1rem' }}>₹{item.price}</span>
                </div>
                {item.description && <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.3rem', lineHeight: 1.4 }}>{item.description}</p>}
                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'block', marginTop: '0.3rem' }}>{item.category_name}</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => toggleMut.mutate(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: item.is_available ? 'var(--color-success)' : 'var(--color-muted)' }}
                >
                  {item.is_available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {item.is_available ? 'Available' : 'Unavailable'}
                </button>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem' }} onClick={() => setModal({ mode: 'edit', item })}>
                    <Pencil size={13} />
                  </button>
                  <button className="btn btn-danger" style={{ padding: '0.35rem 0.6rem' }} onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteMut.mutate(item.id) }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
              No items found. Try adjusting your filters.
            </div>
          )}
        </div>
      )}

      {modal && (
        <MenuItemModal
          item={modal.item}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
