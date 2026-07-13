import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import {
  LayoutDashboard, UtensilsCrossed, Tag, Table2,
  ShoppingBag, Receipt, Settings, LogOut, ChefHat, TrendingUp
} from 'lucide-react'

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: ShoppingBag, label: 'Live Orders' },
  { to: '/billing', icon: Receipt, label: 'Billing Counter' },
  { to: '/sales-records', icon: TrendingUp, label: 'Sales Records' },
  { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/tables', icon: Table2, label: 'Tables & QR' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout({ children }) {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f97316, #a855f7)',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
            }}>
              <ChefHat size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>Restaurant</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>POS Admin</div>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto' }}>
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              style={{ marginBottom: '2px' }}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={handleLogout}
            className="sidebar-link"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '220px', flex: 1, minHeight: '100vh', background: 'var(--color-bg)' }}>
        {children}
      </main>
    </div>
  )
}
