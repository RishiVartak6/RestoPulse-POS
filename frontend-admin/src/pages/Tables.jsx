import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tablesApi, dashboardApi } from '../services/api'
import { Plus, Pencil, Trash2, QrCode, Download, RefreshCw, Users } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  free: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#22c55e', label: 'Free' },
  occupied: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', text: '#f97316', label: 'Occupied' },
  reserved: { bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)', text: '#a855f7', label: 'Reserved' },
}

function TableModal({ table, onClose, onSave }) {
  const [form, setForm] = useState({
    number: table?.number || '',
    name: table?.name || '',
    capacity: table?.capacity || 4,
  })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontWeight: 700, marginBottom: '1.25rem' }}>{table ? 'Edit Table' : 'Add Table'}</h2>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Table Number</label>
            <input className="input" type="number" value={form.number} onChange={e => setForm(f => ({ ...f, number: parseInt(e.target.value) || '' }))} required min="1" disabled={!!table} />
          </div>
          <div>
            <label className="label">Display Name (optional)</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Window Table, VIP 1" />
          </div>
          <div>
            <label className="label">Capacity (seats)</label>
            <input className="input" type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) }))} min="1" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Table</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QRModal({ table, settings, onClose }) {
  const qrUrl = `${(settings?.system_base_url || window.location.origin).replace(/\/+$/, '')}/menu?table=${table.qr_token}`

  const qc = useQueryClient()
  const regenMut = useMutation({
    mutationFn: () => tablesApi.regenerateQr(table.id),
    onSuccess: () => { qc.invalidateQueries(['tables']); toast.success('QR regenerated'); onClose() },
  })

  const downloadQR = () => {
    const canvas = document.querySelector('#qr-download-canvas canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `table-${table.number}-qr.png`
    a.click()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Table {table.number} QR Code</h2>
        {table.name && <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>{table.name}</p>}

        <div id="qr-download-canvas" style={{ display: 'inline-block', background: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
          <QRCodeCanvas value={qrUrl} size={200} level="H" />
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '1rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
          {qrUrl}
        </p>

        <p style={{ fontSize: '0.75rem', color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '1.25rem', textAlign: 'left', lineHeight: '1.4' }}>
          🌍 <strong>Warning-Free Public QR Code:</strong> Customers scan this to open the menu directly from mobile networks (cellular data) or the local restaurant Wi-Fi.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={downloadQR}>
            <Download size={14} /> Download PNG
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            🖨️ Print
          </button>
          <button className="btn btn-danger" onClick={() => regenMut.mutate()}>
            <RefreshCw size={14} /> Regenerate
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Tables() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [qrModal, setQrModal] = useState(null)

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesApi.getAll().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: settings } = useQuery({
    queryKey: ['restaurant-settings'],
    queryFn: () => dashboardApi.getSettings().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: tablesApi.create,
    onSuccess: () => { qc.invalidateQueries(['tables']); toast.success('Table created'); setModal(null) },
    onError: e => toast.error(e.response?.data?.detail || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => tablesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['tables']); toast.success('Table updated'); setModal(null) },
  })
  const deleteMut = useMutation({
    mutationFn: tablesApi.delete,
    onSuccess: () => { qc.invalidateQueries(['tables']); toast.success('Table deleted') },
  })

  const handleSave = (form) => {
    if (modal?.table) updateMut.mutate({ id: modal.table.id, data: form })
    else createMut.mutate(form)
  }

  const free = tables.filter(t => t.status === 'free').length
  const occupied = tables.filter(t => t.status === 'occupied').length

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Tables & QR Codes</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            {free} free · {occupied} occupied · {tables.length} total
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'add' })} id="add-table-btn">
          <Plus size={16} /> Add Table
        </button>
      </div>

      {/* Table Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.875rem' }}>
          {tables.map(table => {
            const sc = STATUS_COLORS[table.status] || STATUS_COLORS.free
            return (
              <div key={table.id} className="card" style={{ background: sc.bg, borderColor: sc.border, cursor: 'pointer', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)' }}>T{table.number}</h3>
                    {table.name && <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{table.name}</p>}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: sc.text, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: '999px', padding: '2px 8px' }}>
                    {sc.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', color: 'var(--color-muted)', fontSize: '0.8rem' }}>
                  <Users size={13} /> {table.capacity} seats
                </div>

                {table.active_order_id && (
                  <div style={{ fontSize: '0.75rem', color: '#f97316', marginBottom: '0.75rem' }}>
                    🍽️ Order #{table.active_order_id}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1, padding: '0.4rem', justifyContent: 'center', fontSize: '0.75rem' }}
                    onClick={() => setQrModal(table)}>
                    <QrCode size={13} /> QR
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem' }}
                    onClick={() => setModal({ mode: 'edit', table })}>
                    <Pencil size={13} />
                  </button>
                  <button className="btn btn-danger" style={{ padding: '0.4rem 0.6rem' }}
                    onClick={() => { if (confirm(`Delete Table ${table.number}?`)) deleteMut.mutate(table.id) }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && <TableModal table={modal.table} onClose={() => setModal(null)} onSave={handleSave} />}
      {qrModal && <QRModal table={qrModal} settings={settings} onClose={() => setQrModal(null)} />}
    </div>
  )
}
