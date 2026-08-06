import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Icon } from '../../components/Icons'
import { formatCurrency } from '../../data/services'
import { StatCard, EmptyState, timeAgo } from './shared'

const EVENT_ICON = {
  new_booking: 'clipboard',
  payment_received: 'wallet',
  job_accepted: 'checkCircle',
  booking_completed: 'star',
  new_signup: 'user',
  new_cleaner: 'briefcase'
}
const EVENT_COLOR = {
  new_booking: '#276EF1',
  payment_received: '#00C896',
  job_accepted: '#00C896',
  booking_completed: '#00C896',
  new_signup: '#C46A00',
  new_cleaner: '#C46A00'
}

export default function Overview({ bookings, cleaners }) {
  const [customerCount, setCustomerCount] = useState(null)
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .then(({ count }) => setCustomerCount(count ?? 0))

    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { setEvents(data || []); setLoadingEvents(false) })

    const channel = supabase
      .channel('admin-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, payload => {
        setEvents(prev => [payload.new, ...prev].slice(0, 20))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const paidBookings = bookings.filter(b => b.payment_status === 'paid')
  const revenue = paidBookings.reduce((s, b) => s + (b.amount || 0), 0)
  const verifiedCount = cleaners.filter(c => c.verified).length

  const stats = [
    { label: 'Total Bookings', value: bookings.length, icon: 'clipboard', color: 'var(--text)' },
    { label: 'Total Revenue', value: formatCurrency(revenue), icon: 'wallet', color: '#00C896' },
    { label: 'Bookings Today', value: bookings.filter(b => b.booking_date === today).length, icon: 'calendar', color: '#276EF1' },
    { label: 'Broadcasting Now', value: bookings.filter(b => b.job_status === 'broadcasting').length, icon: 'radio', color: '#C46A00' },
    { label: 'Total Customers', value: customerCount ?? '…', icon: 'users', color: 'var(--text)' },
    { label: 'Total Cleaners', value: cleaners.length, icon: 'briefcase', color: 'var(--text)' },
    { label: 'Verified Cleaners', value: `${verifiedCount} / ${cleaners.length}`, icon: 'shield', color: '#00C896' },
    { label: 'Avg Booking Value', value: formatCurrency(paidBookings.length ? revenue / paidBookings.length : 0), icon: 'card', color: 'var(--text)' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 14, marginBottom: 32 }}>
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <h3 style={{ fontSize: 16, marginBottom: 16, color: 'var(--text)' }}>Live Activity</h3>
      {loadingEvents ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : events.length === 0 ? (
        <EmptyState icon="radio" message="No activity yet — events will appear here as they happen." />
      ) : (
        <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {events.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--tile-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={EVENT_ICON[e.type] || 'info'} size={16} color={EVENT_COLOR[e.type] || 'var(--text-muted)'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{e.title}</div>
                {e.detail && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</div>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>{timeAgo(e.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
