import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  // The home screen renders its own Uber-style top bar
  if (location.pathname === '/') return null

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: '#FFFFFF',
      borderBottom: '1px solid #EEEEEE',
      // White bar bleeds into the notch/status-bar area; content sits below it
      padding: 'var(--sat) calc(24px + var(--sar)) 0 calc(24px + var(--sal))',
      height: 'calc(64px + var(--sat))',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Logo variant="mark" size={32} />
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#0D1117' }}>
          Clean<span style={{ color: '#00C896' }}>Connect</span>
        </span>
      </Link>

      {/* Nav links — desktop only; bottom nav covers mobile */}
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <NavLink to="/services" active={isActive('/services')}>Services</NavLink>
        <NavLink to="/cleaners" active={isActive('/cleaners')}>Our Cleaners</NavLink>
        {user && <NavLink to="/book" active={isActive('/book')}>Book Now</NavLink>}
        {user && <NavLink to="/dashboard" active={isActive('/dashboard')}>My Bookings</NavLink>}
        <NavLink to="/worker" active={location.pathname.startsWith('/worker')}>Workers</NavLink>
      </div>

      {/* Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/account" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 6px', borderRadius: 100, background: '#F6F6F6' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#00C896', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
                {user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '👤'}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#000000', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.user_metadata?.full_name || user.email || 'Account'}
              </span>
            </Link>
            <button onClick={handleSignOut} className="hide-mobile"
              style={{ background: 'transparent', border: '1px solid #E8E8E8', color: '#6B6B6B', padding: '8px 16px', borderRadius: 100, fontSize: 14, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.target.style.borderColor = '#000000'; e.target.style.color = '#000000' }}
              onMouseLeave={e => { e.target.style.borderColor = '#E8E8E8'; e.target.style.color = '#6B6B6B' }}>
              Sign Out
            </button>
          </div>
        ) : (
          <>
            <Link to="/login" style={{ color: '#000000', fontSize: 15, fontWeight: 600, padding: '8px 12px', borderRadius: 100, whiteSpace: 'nowrap' }}>Sign In</Link>
            <Link to="/signup" className="btn-primary" style={{ padding: '10px 18px', fontSize: 14, borderRadius: 100, whiteSpace: 'nowrap' }}>Get Started</Link>
          </>
        )}
      </div>
    </nav>
  )
}

function NavLink({ to, children, active }) {
  return (
    <Link to={to} style={{
      color: active ? '#000000' : '#6B6B6B', fontSize: 14, padding: '8px 14px',
      borderRadius: 100, fontWeight: active ? 700 : 500, transition: 'all 0.2s',
      background: active ? '#F6F6F6' : 'transparent'
    }}>{children}</Link>
  )
}
