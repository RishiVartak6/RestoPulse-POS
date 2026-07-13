import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardApi } from '../services/api'
import { Save, Store, Phone, Mail, MapPin, Receipt, Wifi, Percent, Loader, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '', tagline: '', address: '', phone: '', email: '',
    currency_symbol: '₹', gst_percentage: 5, gst_number: '',
    receipt_footer: 'Thank you! Visit Again!',
    wifi_name: '', wifi_password: '',
    system_base_url: '',
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['restaurant-settings'],
    queryFn: () => dashboardApi.getSettings().then(r => r.data),
  })

  useEffect(() => {
    if (settings) setForm(f => ({ ...f, ...settings }))
  }, [settings])

  const updateMut = useMutation({
    mutationFn: dashboardApi.updateSettings,
    onSuccess: () => { qc.invalidateQueries(['restaurant-settings']); toast.success('Settings saved!') },
    onError: () => toast.error('Failed to save settings'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMut.mutate(form)
  }

  const Field = ({ icon: Icon, label, name, type = 'text', placeholder }) => (
    <div>
      <label className="label">{label}</label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />}
        <input
          className="input"
          style={{ paddingLeft: Icon ? '2rem' : '0.875rem' }}
          type={type}
          value={form[name] || ''}
          onChange={e => setForm(f => ({ ...f, [name]: type === 'number' ? parseFloat(e.target.value) : e.target.value }))}
          placeholder={placeholder}
        />
      </div>
    </div>
  )

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spin" style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} /></div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Restaurant Settings</h1>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Configure your restaurant details, billing rules, and receipt</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Basic Info */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Store size={16} color="var(--color-primary)" />
            <h3 style={{ fontWeight: 600 }}>Restaurant Info</h3>
          </div>
          <div style={{ display: 'grid', gap: '0.875rem' }}>
            <Field icon={Store} label="Restaurant Name *" name="name" placeholder="My Restaurant" />
            <Field label="Tagline" name="tagline" placeholder="Serving happiness since 2024" />
            <Field icon={MapPin} label="Address" name="address" placeholder="123 Main St, City - 400001" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Field icon={Phone} label="Phone" name="phone" placeholder="+91 99999 99999" />
              <Field icon={Mail} label="Email" name="email" type="email" placeholder="info@restaurant.com" />
            </div>
          </div>
        </div>

        {/* Billing */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Percent size={16} color="var(--color-primary)" />
            <h3 style={{ fontWeight: 600 }}>Tax & Billing</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Currency Symbol" name="currency_symbol" placeholder="₹" />
            <Field label="GST / Tax %" name="gst_percentage" type="number" placeholder="5" />
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="GST Number (GSTIN)" name="gst_number" placeholder="27AABCU9603R1ZX" />
            </div>
          </div>
        </div>

        {/* Receipt */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Receipt size={16} color="var(--color-primary)" />
            <h3 style={{ fontWeight: 600 }}>Receipt Footer</h3>
          </div>
          <div>
            <label className="label">Footer Message</label>
            <textarea className="input" value={form.receipt_footer} onChange={e => setForm(f => ({ ...f, receipt_footer: e.target.value }))}
              placeholder="Thank you! Visit Again!" rows={2} style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* WiFi */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Wifi size={16} color="var(--color-primary)" />
            <h3 style={{ fontWeight: 600 }}>WiFi Details (shown on receipt)</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field icon={Wifi} label="Network Name (SSID)" name="wifi_name" placeholder="RestaurantWifi" />
            <Field label="Password" name="wifi_password" placeholder="wifi123" />
          </div>
        </div>

        {/* Network & QR Code settings */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Globe size={16} color="var(--color-primary)" />
            <h3 style={{ fontWeight: 600 }}>Network & QR Code Settings</h3>
          </div>
          <div style={{ display: 'grid', gap: '0.875rem' }}>
            <Field icon={Globe} label="System Base URL (Public Domain or Local IP)" name="system_base_url" placeholder="e.g. https://myrestaurant.pinggy.link or http://192.168.1.100:8000" />
            <p style={{ color: 'var(--color-muted)', fontSize: '0.75rem', marginTop: '-0.4rem' }}>
              Used to generate table QR codes. If using an internet tunnel (e.g. Pinggy/ngrok) or static local IP, set it here so QR codes work from customers' phones. Leave blank to default to the active admin page host.
            </p>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', padding: '0.75rem 2rem' }} disabled={updateMut.isPending}>
          {updateMut.isPending ? <Loader size={16} className="spin" /> : <Save size={16} />}
          {updateMut.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
