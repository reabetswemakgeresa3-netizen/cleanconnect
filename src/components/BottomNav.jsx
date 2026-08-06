import { Link, useLocation } from 'react-router-dom'

// Uber-style mobile bottom navigation (visible under 768px via .bottom-nav CSS)
const TABS = [
  {
    to: '/', label: 'Home',
    icon: <path d="M3 10.5L12 3l9 7.5V21h-6v-6h-6v6H3z" />
  },
  {
    to: '/services', label: 'Services',
    icon: <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  },
  {
    to: '/dashboard', label: 'Bookings',
    icon: <>
      <rect x="4" y="4.5" width="16" height="16.5" rx="2.5" />
      <path d="M8 2.5v4M16 2.5v4M8 11.5h8M8 15.5h5" />
    </>
  },
  {
    to: '/account', label: 'Account',
    icon: <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </>
  }
]

export default function BottomNav() {
  const location = useLocation()
  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  // Legal reading-mode pages (Terms/Privacy) hide all app chrome, including this
  if (location.pathname === '/terms' || location.pathname === '/privacy') return null

  return (
    <nav className="bottom-nav">
      {TABS.map(t => (
        <Link key={t.to} to={t.to} className={isActive(t.to) ? 'active' : ''}>
          <span className="bottom-nav-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {t.icon}
            </svg>
          </span>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
