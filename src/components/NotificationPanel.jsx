import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { Icon } from './Icons'

function timeAgo(iso) {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`
  return `${Math.round(secs / 86400)}d ago`
}

const TYPE_ICON = { completed: 'star', refund: 'wallet', status_update: 'bell' }

export default function NotificationPanel({ onClose }) {
  const { notifications, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()

  const handleClick = (n) => {
    if (!n.read) markRead(n.id)
    if (n.booking_id) navigate('/dashboard')
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 60, right: 16, width: 340, maxWidth: 'calc(100vw - 32px)',
        maxHeight: '70vh', overflowY: 'auto', background: 'var(--tile)', border: '1px solid var(--border)',
        borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.18)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Notifications</span>
          {notifications.some(n => !n.read) && (
            <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#00C896', fontSize: 12.5, cursor: 'pointer' }}>
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No notifications yet
          </div>
        ) : (
          <div>
            {notifications.map(n => (
              <div key={n.id} onClick={() => handleClick(n)} style={{
                display: 'flex', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(0,200,150,0.06)'
              }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  <Icon name={TYPE_ICON[n.type] || 'bell'} size={17} color={n.read ? 'var(--text-dim)' : '#00C896'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: n.read ? 500 : 700, color: 'var(--text)', marginBottom: 2 }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.body}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896', flexShrink: 0, marginTop: 4 }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
