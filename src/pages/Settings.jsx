import { useTheme } from '../context/ThemeContext'
import { Icon } from '../components/Icons'

const OPTIONS = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'System', icon: 'device' }
]

export default function Settings() {
  const { theme, setTheme } = useTheme()

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 80px' }}>
        <h1 style={{ fontSize: 32, marginBottom: 6 }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 32 }}>Manage how CleanConnect looks and feels</p>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Appearance
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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

        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 16, lineHeight: 1.6 }}>
          "System" follows your device's appearance setting automatically, including switching when it changes.
        </p>
      </div>
    </div>
  )
}
