import { Icon } from '../../components/Icons'
import PinSpinner from '../../components/PinSpinner'

export function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ marginBottom: 8 }}><Icon name={icon} size={20} color={color} /></div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Inter', color, marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</div>
    </div>
  )
}

export function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px', background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16 }}>
      <div style={{ marginBottom: 14 }}><Icon name={icon} size={40} color="var(--text-dim)" /></div>
      <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>{message}</p>
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
      <PinSpinner size={40} style={{ marginBottom: 14 }} />
      {label}
    </div>
  )
}

export function Pagination({ page, setPage, total, perPage = 50 }) {
  const pageCount = Math.max(1, Math.ceil(total / perPage))
  if (pageCount <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={pagerBtn(page === 0)}>← Prev</button>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page + 1} of {pageCount}</span>
      <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} style={pagerBtn(page >= pageCount - 1)}>Next →</button>
    </div>
  )
}

function pagerBtn(disabled) {
  return {
    background: 'var(--tile)', border: '1px solid var(--border)', color: disabled ? 'var(--text-dim)' : 'var(--text)',
    padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1
  }
}

export function timeAgo(iso) {
  if (!iso) return ''
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 5) return 'just now'
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`
  return `${Math.round(secs / 86400)}d ago`
}

export function toCSV(rows, columns) {
  const header = columns.map(c => c.label).join(',')
  const lines = rows.map(row => columns.map(c => {
    const v = c.value(row)
    const s = v == null ? '' : String(v).replace(/"/g, '""')
    return /[",\n]/.test(s) ? `"${s}"` : s
  }).join(','))
  return [header, ...lines].join('\n')
}

export function downloadCSV(filename, rows, columns) {
  const csv = toCSV(rows, columns)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const TAB_ICON = {
  overview: 'home',
  bookings: 'clipboard',
  customers: 'users',
  workers: 'briefcase',
  broadcast: 'radio',
  messages: 'mail',
  financials: 'wallet',
  health: 'device'
}
