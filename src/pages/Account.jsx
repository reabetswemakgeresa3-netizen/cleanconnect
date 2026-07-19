import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatSAPhone } from '../lib/phone'
import { Icon } from '../components/Icons'

const ROWS = [
  { to: '/dashboard', icon: 'clipboard', label: 'My Bookings', sub: 'Track and manage your cleans' },
  { to: '/book', icon: 'bucket', label: 'Book a Clean', sub: 'Start a new booking' },
  { to: '/cleaners', icon: 'star', label: 'Our Cleaners', sub: 'Browse vetted professionals' },
  { to: '/worker', icon: 'briefcase', label: 'Worker Portal', sub: 'Earn with CleanConnect' },
]

export default function Account() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (!user) return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: '#FFFFFF' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>Account</h1>
        <p style={{ color: '#6B6B6B', fontSize: 16, marginBottom: 28 }}>Sign in to manage bookings, track your cleaner, and more.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link to="/login" className="btn-primary" style={{ padding: 16, fontSize: 16 }}>Sign In</Link>
          <Link to="/signup" className="btn-outline" style={{ padding: 16, fontSize: 16 }}>Create Account</Link>
        </div>
      </div>
    </div>
  )

  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'CleanConnect user'
  const contact = user.email || (user.phone && formatSAPhone(`+${user.phone.replace(/^\+/, '')}`)) || ''

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: '#FFFFFF' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Profile header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 32, marginBottom: 4 }}>{name}</h1>
            {contact && <p style={{ color: '#6B6B6B', fontSize: 15 }}>{contact}</p>}
          </div>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#00C896', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#FFFFFF', flexShrink: 0 }}>
            {name[0]?.toUpperCase()}
          </div>
        </div>

        {/* Menu rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ROWS.map(row => (
            <Link key={row.to} to={row.to} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '18px 4px',
              borderBottom: '1px solid #F0F0F0', transition: 'background 0.15s'
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F6F6F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={row.icon} size={20} color="#0D1117" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#000000' }}>{row.label}</div>
                <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 2 }}>{row.sub}</div>
              </div>
              <span style={{ color: '#9E9E9E', fontSize: 18 }}>›</span>
            </Link>
          ))}
        </div>

        <button onClick={handleSignOut} style={{
          width: '100%', marginTop: 28, padding: 16, borderRadius: 12,
          background: '#F6F6F6', color: '#E11900', fontSize: 15, fontWeight: 700
        }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
