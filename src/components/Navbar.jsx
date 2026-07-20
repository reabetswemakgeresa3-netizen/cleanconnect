import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import { Icon } from './Icons'

// One header for every page: hamburger menu · centered logo · notification bell.
export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setMenuOpen(false)
    navigate('/')
  }

  const MENU = [
    { to: '/services', label: 'Services', icon: 'bucket' },
    { to: '/cleaners', label: 'Our Cleaners', icon: 'star' },
    { to: user ? '/book' : '/signup', label: 'Book a Clean', icon: 'calendar' },
    { to: '/dashboard', label: 'My Bookings', icon: 'clipboard' },
    { to: '/worker', label: 'Worker Portal', icon: 'briefcase' },
    { to: '/account', label: 'Account', icon: 'user' },
    { to: '/settings', label: 'Settings', icon: 'settings' }
  ]

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        // Bar bleeds into the notch/status-bar area; content sits below it
        padding: 'var(--sat) calc(16px + var(--sar)) 0 calc(16px + var(--sal))',
        height: 'calc(64px + var(--sat))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <button onClick={() => setMenuOpen(true)} aria-label="Menu" style={iconBtn}>
          <Icon name="menu" size={22} color="var(--text)" strokeWidth={2.2} />
        </button>

        {/* Centered wordmark */}
        <Link to="/" style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          top: 'var(--sat)', height: 64,
          display: 'flex', alignItems: 'center', gap: 7
        }}>
          <Logo variant="mark" size={27} />
          <span style={{ fontSize: 18.5, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', whiteSpace: 'nowrap' }}>
            Clean<span style={{ color: '#00C896' }}>Connect</span>
          </span>
        </Link>

        <Link to={user ? '/dashboard' : '/login'} aria-label="Notifications" style={{ ...iconBtn, position: 'relative' }}>
          <Icon name="bell" size={20} color="var(--text)" />
          <span style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: '50%', background: '#00C896', border: '1.5px solid var(--surface)' }} />
        </Link>
      </nav>

      {/* Slide-in menu drawer */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1300 }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: 300, background: 'var(--surface)',
            padding: 'calc(24px + var(--sat)) 22px calc(24px + var(--sab)) calc(22px + var(--sal))',
            boxShadow: '8px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Logo variant="tile" size={42} />
              <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
                Clean<span style={{ color: '#00C896' }}>Connect</span>
              </span>
            </div>

            {user && (
              <div style={{ padding: '10px 10px 14px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  {user.user_metadata?.full_name || 'Welcome back'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email || user.phone || ''}
                </div>
              </div>
            )}

            {MENU.map(item => (
              <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 10px',
                borderRadius: 12, fontSize: 15.5, fontWeight: 600,
                color: location.pathname === item.to ? '#00A87E' : 'var(--text)',
                background: location.pathname === item.to ? 'rgba(0,200,150,0.08)' : 'transparent'
              }}>
                <Icon name={item.icon} size={20} color={location.pathname === item.to ? '#00A87E' : 'var(--text-muted)'} />
                {item.label}
              </Link>
            ))}

            <div style={{ flex: 1 }} />

            {user ? (
              <button onClick={handleSignOut} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 10px', background: 'transparent',
                borderRadius: 12, fontSize: 15.5, fontWeight: 600, color: '#E11900', textAlign: 'left'
              }}>
                <Icon name="logout" size={20} color="#E11900" /> Sign Out
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="btn-primary" style={{ justifyContent: 'center' }}>Get Started</Link>
                <Link to="/login" onClick={() => setMenuOpen(false)} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text)', padding: 10 }}>Sign In</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const iconBtn = {
  width: 42, height: 42, borderRadius: '50%', background: 'var(--surface)',
  border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
}
