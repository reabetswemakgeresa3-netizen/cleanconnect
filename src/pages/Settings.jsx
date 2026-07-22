import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Icon } from '../components/Icons'
import UserAvatar from '../components/UserAvatar'
import Footer from '../components/Footer'

const OPTIONS = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'System', icon: 'device' }
]

const LEGAL = [
  { to: '/terms', label: 'Terms & Conditions', icon: 'fileText' },
  { to: '/privacy', label: 'Privacy Policy', icon: 'shield' },
  { to: '/contact', label: 'Contact Us', icon: 'mail' }
]

export default function Settings() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 80px' }}>
        <h1 style={{ fontSize: 32, marginBottom: 6 }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 28 }}>Manage how CleanConnect looks and feels</p>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--tile)', borderRadius: 16, padding: '16px 18px', marginBottom: 32 }}>
            <UserAvatar size={56} editable />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.user_metadata?.full_name || 'CleanConnect user'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email || user.phone || ''}
              </div>
            </div>
          </div>
        )}

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Appearance
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {OPTIONS.map(opt => {
            const active = theme === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  padding: '22px 12px', borderRadius: 16,
                  background: active ? 'rgba(0,200,150,0.1)' : 'var(--tile)',
                  border: `1.5px solid ${active ? '#00C896' : 'var(--border)'}`,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: active ? 'rgba(0,200,150,0.16)' : 'var(--tile-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon name={opt.icon} size={21} color={active ? '#00C896' : 'var(--text-muted)'} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: active ? '#00C896' : 'var(--text)' }}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 36, lineHeight: 1.6 }}>
          "System" follows your device's appearance setting automatically, including switching when it changes.
        </p>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Legal
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 36 }}>
          {LEGAL.map(item => (
            <Link key={item.to} to={item.to} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px',
              borderBottom: '1px solid var(--border)'
            }}>
              <Icon name={item.icon} size={19} color="var(--text-muted)" />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
              <Icon name="chevronRight" size={16} color="var(--text-dim)" />
            </Link>
          ))}
        </div>

        <Footer />
      </div>
    </div>
  )
}
