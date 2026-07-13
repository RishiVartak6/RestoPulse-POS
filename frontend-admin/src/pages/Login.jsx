import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useAuthStore } from '../store'
import { ChefHat, Mail, Lock, Eye, EyeOff, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('admin@restaurant.com')
  const [password, setPassword] = useState('admin123')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      const { access_token, refresh_token } = res.data

      // Store tokens FIRST so Axios interceptor can attach them to /me
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)

      const me = await authApi.me()
      login(me.data, access_token, refresh_token)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top left, rgba(249,115,22,0.15) 0%, var(--color-bg) 50%, rgba(168,85,247,0.1) 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: '400px', padding: '1rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            background: 'linear-gradient(135deg, #f97316, #a855f7)',
            borderRadius: '16px',
            padding: '14px',
            marginBottom: '1rem',
            boxShadow: '0 8px 32px rgba(249,115,22,0.3)',
          }}>
            <ChefHat size={32} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
            Restaurant POS
          </h1>
          <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Admin Panel — Sign in to continue
          </p>
        </div>

        {/* Card */}
        <div className="card-glass" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '2.25rem' }}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@restaurant.com"
                  required
                  id="email-input"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  id="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="login-btn"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '1rem', marginTop: '0.5rem' }}
            >
              {loading ? <Loader size={18} className="spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(249,115,22,0.05)', borderRadius: '8px', border: '1px solid rgba(249,115,22,0.2)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textAlign: 'center' }}>
              Default: <span style={{ color: 'var(--color-primary)' }}>admin@restaurant.com</span> / <span style={{ color: 'var(--color-primary)' }}>admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
