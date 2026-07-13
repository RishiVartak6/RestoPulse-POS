import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { menuApi } from '../services/api'
import { Plus, Pencil, Trash2, Image, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

function CategoryModal({ category, onClose, onSave }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    display_order: category?.display_order || 0,
    is_active: category?.is_active ?? true,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>
          {category ? 'Edit Category' : 'Add Category'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Category Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Starters" required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="label">Display Order</label>
            <input className="input" type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="toggle">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <span className="toggle-slider" />
            </label>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>Active</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Category</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Categories() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // null | { mode: 'add'|'edit', category? }

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => menuApi.getCategories().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: menuApi.createCategory,
    onSuccess: () => { qc.invalidateQueries(['categories-all']); toast.success('Category created'); setModal(null) },
    onError: () => toast.error('Failed to create category'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => menuApi.updateCategory(id, data),
    onSuccess: () => { qc.invalidateQueries(['categories-all']); toast.success('Category updated'); setModal(null) },
  })

  const deleteMut = useMutation({
    mutationFn: menuApi.deleteCategory,
    onSuccess: () => { qc.invalidateQueries(['categories-all']); toast.success('Category deleted') },
  })

  const uploadMut = useMutation({
    mutationFn: ({ id, file }) => menuApi.uploadCategoryImage(id, file),
    onSuccess: () => { qc.invalidateQueries(['categories-all']); toast.success('Image uploaded') },
  })

  const handleSave = (form) => {
    if (modal?.category) {
      updateMut.mutate({ id: modal.category.id, data: form })
    } else {
      createMut.mutate(form)
    }
  }

  const handleImageUpload = (id, e) => {
    const file = e.target.files[0]
    if (file) uploadMut.mutate({ id, file })
  }

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spin" style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
    </div>
  )

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Categories</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>{categories.length} categories</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'add' })} id="add-category-btn">
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {categories.map(cat => (
          <div key={cat.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Image */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '10px',
                background: cat.image_url ? `url(${cat.image_url}) center/cover` : 'linear-gradient(135deg, #f97316, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {!cat.image_url && <span style={{ fontSize: '1.25rem' }}>🍽️</span>}
              </div>
              <label style={{ position: 'absolute', bottom: -6, right: -6, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '50%', padding: '3px', cursor: 'pointer' }}>
                <Image size={11} color="var(--color-muted)" />
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageUpload(cat.id, e)} />
              </label>
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>{cat.name}</span>
                <span className={`badge ${cat.is_active ? 'badge-ready' : 'badge-cancelled'}`} style={{ fontSize: '0.65rem' }}>
                  {cat.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              {cat.description && <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>{cat.description}</p>}
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{cat.item_count} items</p>
            </div>

            {/* Order */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', padding: '2px' }}
                onClick={() => updateMut.mutate({ id: cat.id, data: { display_order: cat.display_order - 1 } })}>
                <ChevronUp size={16} />
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textAlign: 'center' }}>{cat.display_order}</span>
              <button style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', padding: '2px' }}
                onClick={() => updateMut.mutate({ id: cat.id, data: { display_order: cat.display_order + 1 } })}>
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setModal({ mode: 'edit', category: cat })}>
                <Pencil size={14} />
              </button>
              <button className="btn btn-danger" onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteMut.mutate(cat.id) }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
            <p>No categories yet. Add your first one!</p>
          </div>
        )}
      </div>

      {modal && (
        <CategoryModal
          category={modal.category}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
