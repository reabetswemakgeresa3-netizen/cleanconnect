import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { normalizeSAPhone } from '../lib/phone'

export function Login() {
  const [method, setMethod] = useState('email')
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
    <GoogleButton />
    <Divider />
    <MethodToggle method={method} onChange={m => { setMethod(m); setError('') }} />
    {method === 'phone' ? (
      <PhoneOtpForm onSuccess={() => navigate('/dashboard')} />
    ) : (
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
    )}
    <p style={{ textAlign: 'center', marginTop: 24, color: '#6B6B6B', fontSize: 15 }}>
      Don't have an account?{' '}
      <Link to="/signup" style={{ color: '#00C896', fontWeight: 500 }}>Sign up free</Link>
    </p>
  </AuthLayout>
}

function GoogleButton() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle() // redirects away on success
    } catch (err) {
      setError(err.message || 'Could not connect to Google. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <ErrorBox message={error} />}
      <button type="button" onClick={handleClick} disabled={loading} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: 14, borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 500,
        background: '#FFFFFF', border: '1px solid #E8E8E8', color: '#1F2937', transition: 'opacity 0.2s',
        opacity: loading ? 0.7 : 1
      }}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        {loading ? 'Redirecting to Google...' : 'Continue with Google'}
      </button>
    </div>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: '#E8E8E8' }} />
      <span style={{ fontSize: 12, color: '#9E9E9E' }}>or</span>
      <div style={{ flex: 1, height: 1, background: '#E8E8E8' }} />
    </div>
  )
}

function MethodToggle({ method, onChange }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 24,
      background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: 12, padding: 4
    }}>
      {[{ id: 'email', label: '✉️ Email' }, { id: 'phone', label: '📱 Phone OTP' }].map(m => (
        <button key={m.id} type="button" onClick={() => onChange(m.id)} style={{
          padding: '10px 8px', borderRadius: 9, border: 'none', cursor: 'pointer',
          background: method === m.id ? '#00C896' : 'transparent',
          color: method === m.id ? '#FFFFFF' : '#6B6B6B',
          fontSize: 14, fontWeight: method === m.id ? 600 : 400, transition: 'all 0.2s'
        }}>{m.label}</button>
      ))}
    </div>
  )
}

export function PhoneOtpForm({ onSuccess, fullName }) {
  const [step, setStep] = useState('phone') // 'phone' | 'code'
  const [phone, setPhone] = useState('')
  const [e164, setE164] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth()

  const handleSend = async (e) => {
    e.preventDefault()
    setError('')
    const normalized = normalizeSAPhone(phone)
    if (!normalized) return setError('Enter a valid South African number, e.g. 072 123 4567')
    setLoading(true)
    try {
      await sendPhoneOtp(normalized, fullName)
      setE164(normalized)
      setStep('code')
    } catch (err) {
      setError(err.message || 'Could not send the code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyPhoneOtp(e164, code.trim())
      onSuccess()
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'code') return (
    <form onSubmit={handleVerify}>
      {error && <ErrorBox message={error} />}
      <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 16 }}>
        We sent a 6-digit code to <strong style={{ color: '#000000' }}>{e164}</strong>
      </p>
      <Field label="Verification code">
        <input className="input-field" type="text" inputMode="numeric" autoComplete="one-time-code"
          placeholder="123456" maxLength={6} value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus
          style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: 20 }} />
      </Field>
      <button type="submit" className="btn-primary" disabled={loading || code.length < 6}
        style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: 16, fontSize: 16 }}>
        {loading ? 'Verifying...' : 'Verify & Sign In →'}
      </button>
      <button type="button" onClick={() => { setStep('phone'); setCode(''); setError('') }}
        style={{ width: '100%', marginTop: 12, background: 'transparent', border: 'none', color: '#6B6B6B', fontSize: 14, cursor: 'pointer' }}>
        ← Use a different number
      </button>
    </form>
  )

  return (
    <form onSubmit={handleSend}>
      {error && <ErrorBox message={error} />}
      <Field label="Phone number">
        <input className="input-field" type="tel" placeholder="072 123 4567"
          value={phone} onChange={e => setPhone(e.target.value)} required autoFocus />
      </Field>
      <button type="submit" className="btn-primary" disabled={loading}
        style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: 16, fontSize: 16 }}>
        {loading ? 'Sending code...' : 'Send Code via SMS →'}
      </button>
      <p style={{ fontSize: 12, color: '#9E9E9E', textAlign: 'center', marginTop: 12 }}>
        Standard SMS rates may apply. No password needed.
      </p>
    </form>
  )
}

export function Signup() {
  const [method, setMethod] = useState('email')
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
      <p style={{ color: '#6B6B6B', lineHeight: 1.6, marginBottom: 24 }}>
        We sent a confirmation email to <strong style={{ color: '#000000' }}>{form.email}</strong>.<br />
        Click the link to activate your account.
      </p>
      <Link to="/login" className="btn-primary" style={{ justifyContent: 'center' }}>
        Go to Sign In
      </Link>
    </div>
  </AuthLayout>

  return <AuthLayout title="Create Account" subtitle="Start booking cleaning services today">
    <GoogleButton />
    <Divider />
    <MethodToggle method={method} onChange={m => { setMethod(m); setError('') }} />
    {method === 'phone' ? (
      <>
        <Field label="Full name">
          <input className="input-field" placeholder="Thabo Nkosi"
            value={form.fullName} onChange={set('fullName')} />
        </Field>
        <PhoneOtpForm fullName={form.fullName} onSuccess={() => navigate('/dashboard')} />
      </>
    ) : (
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
      </form>
    )}
    <p style={{ fontSize: 12, color: '#9E9E9E', textAlign: 'center', marginTop: 12 }}>
      By signing up, you agree to our Terms of Service and Privacy Policy.
    </p>
    <p style={{ textAlign: 'center', marginTop: 20, color: '#6B6B6B', fontSize: 15 }}>
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
      background: '#FFFFFF', position: 'relative', overflow: 'hidden'
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
          <span style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 800 }}>
            Clean<span style={{ color: '#00C896' }}>Connect</span>
          </span>
        </Link>

        <div style={{
          background: '#FFFFFF', border: '1px solid #EEEEEE',
          borderRadius: 20, padding: '40px 36px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 30px rgba(0,0,0,0.05)'
        }}>
          <h1 style={{ fontSize: 26, marginBottom: 6, color: '#000000' }}>{title}</h1>
          <p style={{ color: '#6B6B6B', fontSize: 15, marginBottom: 28 }}>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#6B6B6B', marginBottom: 7 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ErrorBox({ message }) {
  return (
    <div style={{
      background: 'rgba(225,25,0,0.1)', border: '1px solid rgba(225,25,0,0.25)',
      borderRadius: 10, padding: '12px 16px', marginBottom: 20,
      color: '#E11900', fontSize: 14
    }}>⚠️ {message}</div>
  )
}
