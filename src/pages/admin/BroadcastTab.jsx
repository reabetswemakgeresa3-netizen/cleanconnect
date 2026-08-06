import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ServiceBadge } from '../../components/Icons'
import { formatCurrency } from '../../data/services'
import { EmptyState } from './shared'

const STUCK_MINUTES = 15

function waitLabel(createdAt) {
  const mins = Math.round((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export default function BroadcastTab({ bookings, cleanerOptions, onForceAssign }) {
  const [notifCounts, setNotifCounts] = useState({})
  const [, forceTick] = useState(0)

  const broadcasting = bookings
    .filter(b => b.job_status === 'broadcasting')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  useEffect(() => {
    const ids = broadcasting.map(b => b.id)
    if (!ids.length) { setNotifCounts({}); return }
    supabase.from('worker_notifications').select('booking_id').in('booking_id', ids)
      .then(({ data }) => {
        const counts = {}
        for (const row of data || []) counts[row.booking_id] = (counts[row.booking_id] || 0) + 1
        setNotifCounts(counts)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings])

  useEffect(() => {
    const tick = setInterval(() => forceTick(n => n + 1), 30000)
    return () => clearInterval(tick)
  }, [])

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
        {broadcasting.length} job{broadcasting.length === 1 ? '' : 's'} currently waiting for a cleaner to accept.
      </p>

      {broadcasting.length === 0 ? (
        <EmptyState icon="radio" message="Nothing broadcasting right now — every job has been claimed." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {broadcasting.map(b => {
            const stuck = (Date.now() - new Date(b.created_at).getTime()) > STUCK_MINUTES * 60000
            return (
              <div key={b.id} style={{
                background: 'var(--tile)', border: `1px solid ${stuck ? '#E11900' : 'var(--border)'}`,
                borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap'
              }}>
                <ServiceBadge id={b.service_id} size={44} iconSize={22} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>{b.service_name}</span>
                    {stuck && (
                      <span style={{ background: 'rgba(225,25,0,0.12)', color: '#E11900', borderRadius: 100, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
                        Needs attention
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{b.city}, {b.province} · {formatCurrency(b.amount)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                    Waiting {waitLabel(b.created_at)} · {notifCounts[b.id] ?? 0} cleaner{notifCounts[b.id] === 1 ? '' : 's'} notified
                  </div>
                </div>
                <select onChange={e => {
                  const c = cleanerOptions.find(o => o.id === e.target.value)
                  if (c) onForceAssign(b.id, c.id, c.name)
                  e.target.value = ''
                }} defaultValue="" style={{
                  background: 'var(--tile-2)', border: `1px solid ${stuck ? '#E11900' : 'var(--border)'}`,
                  borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, cursor: 'pointer'
                }}>
                  <option value="" disabled>Force assign cleaner...</option>
                  {cleanerOptions.filter(c => c.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
