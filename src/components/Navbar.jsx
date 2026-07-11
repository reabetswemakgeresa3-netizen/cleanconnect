import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(46,58,78,0.6)',
      padding: '0 24px', height: 68,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#00C896,#00A87E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✦</div>
        <span style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800 }}>Clean<span style={{ color: '#00C896' }}>Connect</span></span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#00C896,#00A87E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#0D1117' }}>
                {user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: 14, color: '#E8EDF4', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.user_metadata?.full_name || user.email}
              </span>
            </div>
            <button onClick={handleSignOut}
              style={{ background: 'transparent', border: '1px solid #2E3A4E', color: '#7A8B9C', padding: '8px 16px', borderRadius: 8, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.target.style.borderColor = '#FF5C3A'; e.target.style.color = '#FF5C3A' }}
              onMouseLeave={e => { e.target.style.borderColor = '#2E3A4E'; e.target.style.color = '#7A8B9C' }}>
              Sign Out
            </button>
          </div>
        ) : (
          <>
            <Link to="/login" style={{ color: '#7A8B9C', fontSize: 15, padding: '8px 16px', borderRadius: 8 }}
              onMouseEnter={e => e.target.style.color = '#E8EDF4'}
              onMouseLeave={e => e.target.style.color = '#7A8B9C'}>Sign In</Link>
            <Link to="/signup" className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>Get Started</Link>
          </>
        )}
      </div>
    </nav>
  )
}

function NavLink({ to, children, active }) {
  return (
    <Link to={to} style={{
      color: active ? '#00C896' : '#7A8B9C', fontSize: 14, padding: '7px 12px',
      borderRadius: 8, fontWeight: active ? 500 : 400, transition: 'color 0.2s',
      background: active ? 'rgba(0,200,150,0.1)' : 'transparent',
      border: active ? '1px solid rgba(0,200,150,0.2)' : '1px solid transparent'
    }}>{children}</Link>
  )
}
