import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import toast from 'react-hot-toast'
import { Zap, Eye, EyeOff, ArrowRight, Loader } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email'
    if (!password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async (evt) => {
    evt.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-base)' }}>
      <BrandPanel />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.4s ease' }}>
          <h2 style={{ marginBottom: 8, fontSize: '1.75rem' }}>Sign in</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 36, fontSize: '0.95rem' }}>
            New here?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Create an account
            </Link>
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label="Email" type="email" value={email} onChange={setEmail}
              placeholder="you@example.com" error={errors.email} autoFocus />
            <Field
              label="Password" type={showPw ? 'text' : 'password'}
              value={password} onChange={setPassword}
              placeholder="Password" error={errors.password}
              suffix={
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ color: 'var(--text-muted)', display: 'flex', padding: 4 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <SubmitButton loading={loading} label="Sign in" />
          </form>
        </div>
      </div>
    </div>
  )
}

function BrandPanel() {
  return (
    <div style={{
      flex: '0 0 45%', background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '60px 48px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
          <div style={{ width: 40, height: 40, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
            <Zap size={20} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)' }}>CollabSphere</span>
        </div>
        <h1 style={{ fontSize: '2.8rem', marginBottom: 16, color: 'var(--text-primary)' }}>
          Where teams<br /><span style={{ color: 'var(--accent)' }}>ship faster.</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 360 }}>
          Project management built for developers. Kanban boards, role-based access, real-time task collaboration.
        </p>
        <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['Kanban board with drag & drop', 'Role-based project permissions', 'JWT-secured microservices'].map(feat => (
            <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Field({ label, type, value, onChange, placeholder, error, suffix, autoFocus }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoFocus={autoFocus}
          style={{
            width: '100%', height: 44, padding: suffix ? '0 40px 0 14px' : '0 14px',
            fontSize: '0.95rem', borderRadius: 10, boxSizing: 'border-box',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            background: 'var(--bg-elevated)',
          }}
        />
        {suffix && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>{suffix}</div>
        )}
      </div>
      {error && <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

export function SubmitButton({ loading, label }) {
  return (
    <button type="submit" disabled={loading} style={{
      height: 48, background: 'var(--accent)', color: '#000', border: 'none',
      borderRadius: 10, fontWeight: 700, fontFamily: 'var(--font-display)',
      fontSize: '0.95rem', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 8,
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s', marginTop: 4,
    }}>
      {loading
        ? <><Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading…</>
        : <><span>{label}</span><ArrowRight size={18} /></>}
    </button>
  )
}