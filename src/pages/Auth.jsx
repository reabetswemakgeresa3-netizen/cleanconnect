import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return <AuthLayout title="Welcome back" subtitle="Sign in to manage your bookings">
    <form onSubmit={handleSubmit}>
      {error && <ErrorBox message={error} />}
      <Field label="Email address">
        <input className="input-field" type="email" placeholder="you@example.com"
          value={email} onChange={e => setEmail(e.target.value)} required />
      </Field>
      <Field label="Password">
        <input className="input-field" type="password" placeholder="Your password"
          value={password} onChange={e => setPassword(e.target.value)} required />
      </Field>
      <button type="submit" className="btn-primary" disabled={loading}
        style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: 16, fontSize: 16 }}>
        {loading ? 'Signing in...' : 'Sign In →'}
      </button>
    </form>
    <p style={{ textAlign: 'center', marginTop: 24, color: '#7A8B9C', fontSize: 15 }}>
      Don't have an account?{' '}
      <Link to="/signup" style={{ color: '#00C896', fontWeight: 500 }}>Sign up free</Link>
    </p>
  </AuthLayout>
}

export function Signup() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Passwords do not match')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      await signUp(form.email, form.password, form.fullName, form.phone)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.message || 'Could not create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return <AuthLayout title="Account Created! 🎉" subtitle="Check your email to confirm your account">
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
      <p style={{ color: '#7A8B9C', lineHeight: 1.6, marginBottom: 24 }}>
        We sent a confirmation email to <strong style={{ color: '#E8EDF4' }}>{form.email}</strong>.<br />
        Click the link to activate your account.
      </p>
      <Link to="/login" className="btn-primary" style={{ justifyContent: 'center' }}>
        Go to Sign In
      </Link>
    </div>
  </AuthLayout>

  return <AuthLayout title="Create Account" subtitle="Start booking cleaning services today">
    <form onSubmit={handleSubmit}>
      {error && <ErrorBox message={error} />}
      <Field label="Full name">
        <input className="input-field" placeholder="Thabo Nkosi"
          value={form.fullName} onChange={set('fullName')} required />
      </Field>
      <Field label="Email address">
        <input className="input-field" type="email" placeholder="you@example.com"
          value={form.email} onChange={set('email')} required />
      </Field>
      <Field label="Phone number">
        <input className="input-field" type="tel" placeholder="072 123 4567"
          value={form.phone} onChange={set('phone')} required />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Password">
          <input className="input-field" type="password" placeholder="Min. 6 chars"
            value={form.password} onChange={set('password')} required />
        </Field>
        <Field label="Confirm password">
          <input className="input-field" type="password" placeholder="Repeat password"
            value={form.confirm} onChange={set('confirm')} required />
        </Field>
      </div>
      <button type="submit" className="btn-primary" disabled={loading}
        style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: 16, fontSize: 16 }}>
        {loading ? 'Creating Account...' : 'Create Account →'}
      </button>
      <p style={{ fontSize: 12, color: '#4A5568', textAlign: 'center', marginTop: 12 }}>
        By signing up, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
    <p style={{ textAlign: 'center', marginTop: 20, color: '#7A8B9C', fontSize: 15 }}>
      Already have an account?{' '}
      <Link to="/login" style={{ color: '#00C896', fontWeight: 500 }}>Sign in</Link>
    </p>
  </AuthLayout>
}

function AuthLayout({ title, subtitle, children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '100px 24px 40px',
      background: '#0D1117', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle at 30% 20%, rgba(0,200,150,0.06) 0%, transparent 50%),
                          radial-gradient(circle at 70% 80%, rgba(0,168,126,0.04) 0%, transparent 50%)`
      }} />
      <div style={{ width: '100%', maxWidth: 460, position: 'relative' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, justifyContent: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#00C896,#00A87E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
          }}>✦</div>
          <span style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800 }}>
            Clean<span style={{ color: '#00C896' }}>Connect</span>
          </span>
        </Link>

        <div style={{
          background: '#161B22', border: '1px solid #2E3A4E',
          borderRadius: 20, padding: '40px 36px'
        }}>
          <h1 style={{ fontSize: 26, marginBottom: 6, color: '#E8EDF4' }}>{title}</h1>
          <p style={{ color: '#7A8B9C', fontSize: 15, marginBottom: 28 }}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#7A8B9C', marginBottom: 7 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ErrorBox({ message }) {
  return (
    <div style={{
      background: 'rgba(255,92,58,0.1)', border: '1px solid rgba(255,92,58,0.25)',
      borderRadius: 10, padding: '12px 16px', marginBottom: 20,
      color: '#FF5C3A', fontSize: 14
    }}>⚠️ {message}</div>
  )
}
