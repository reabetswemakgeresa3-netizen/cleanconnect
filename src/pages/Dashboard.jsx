import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { SERVICES, STATUS_CONFIG, formatCurrency } from '../data/services'
import LiveTrackingMap from '../components/LiveTrackingMap'
import { Icon, ServiceBadge } from '../components/Icons'

const DEMO_BOOKINGS = [
  {
    id: 'CC-DEMO001',
    service_name: 'Residential Cleaning',
    service_id: 'residential',
    sqm: 85,
    address: '42 Sandton Drive, Sandton',
    city: 'Johannesburg',
    province: 'Gauteng',
    booking_date: '2025-02-10',
    time_slot: '09:00 – 11:00',
    amount: 1377,
    status: 'completed',
    payment_status: 'paid',
    created_at: '2025-02-08T10:23:00Z'
  },
  {
    id: 'CC-DEMO002',
    service_name: 'Office & Commercial',
    service_id: 'office',
    sqm: 220,
    address: '1 Rosebank Mall Road, Rosebank',
    city: 'Johannesburg',
    province: 'Gauteng',
    booking_date: '2025-02-18',
    time_slot: '07:00 – 09:00',
    amount: 2970,
    status: 'confirmed',
    payment_status: 'paid',
    created_at: '2025-02-14T08:45:00Z'
  },
  {
    id: 'CC-DEMO003',
    service_name: 'Garden & Outdoor',
    service_id: 'gardening',
    sqm: 150,
    address: '15 Estate Drive, Fourways',
    city: 'Johannesburg',
    province: 'Gauteng',
    booking_date: '2025-02-25',
    time_slot: '11:00 – 13:00',
    amount: 1080,
    status: 'pending',
    payment_status: 'paid',
    created_at: '2025-02-18T14:12:00Z'
  }
]

export default function Dashboard() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchBookings()
  }, [user])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error || !data || data.length === 0) {
        setBookings(DEMO_BOOKINGS)
      } else {
        setBookings(data)
      }
    } catch {
      setBookings(DEMO_BOOKINGS)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  const stats = {
    total: bookings.length,
    completed: bookings.filter(b => b.status === 'completed').length,
    upcoming: bookings.filter(b => ['pending','confirmed'].includes(b.status)).length,
    spent: bookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + (b.amount || 0), 0)
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  return (
    <div style={{ paddingTop: 68, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 20 }}>
          <div>
            <h1 style={{ fontSize: 32, marginBottom: 6 }}>
              Hey, {userName.split(' ')[0]}
            </h1>
            <p style={{ color: '#6B6B6B', fontSize: 16 }}>Manage and track all your cleaning bookings</p>
          </div>
          <Link to="/book" className="btn-primary">+ New Booking</Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 16, marginBottom: 36 }}>
          {[
            { label: 'Total Bookings', value: stats.total, icon: 'clipboard', color: '#6B6B6B' },
            { label: 'Completed', value: stats.completed, icon: 'checkCircle', color: '#00C896' },
            { label: 'Upcoming', value: stats.upcoming, icon: 'calendar', color: '#276EF1' },
            { label: 'Total Spent', value: formatCurrency(stats.spent), icon: 'card', color: '#00C896' }
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#F6F6F6', border: '1px solid #E8E8E8',
              borderRadius: 14, padding: '20px'
            }}>
              <div style={{ marginBottom: 8 }}><Icon name={stat.icon} size={22} color={stat.color} /></div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Inter', color: stat.color, marginBottom: 4 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: '#9E9E9E' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'in-progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                padding: '8px 18px', borderRadius: 100,
                border: `1.5px solid ${filter === f.id ? '#00C896' : '#E8E8E8'}`,
                background: filter === f.id ? 'rgba(0,200,150,0.1)' : 'transparent',
                color: filter === f.id ? '#00C896' : '#6B6B6B',
                fontSize: 14, cursor: 'pointer', transition: 'all 0.2s'
              }}>{f.label}</button>
          ))}
        </div>

        {/* Bookings list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6B6B6B' }}>
            <div style={{ marginBottom: 12 }}><Icon name="refresh" size={28} color="#C9C9C9" /></div>
            Loading your bookings...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onClick={() => setSelectedBooking(booking)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedBooking && (
        <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  )
}

function BookingCard({ booking, onClick }) {
  const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending

  return (
    <div onClick={onClick} style={{
      background: '#F6F6F6', border: '1px solid #E8E8E8',
      borderRadius: 16, padding: '20px 24px', cursor: 'pointer',
      transition: 'all 0.2s', display: 'flex', gap: 20, alignItems: 'center',
      flexWrap: 'wrap'
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#00C896'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.08)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E8E8'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Service icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: '#EEEEEE', border: '1px solid #E8E8E8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, flexShrink: 0
      }}><ServiceBadge id={booking.service_id} size={44} iconSize={22} /></div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h3 style={{ fontSize: 16, color: '#000000' }}>{booking.service_name}</h3>
          <span className={`badge ${statusConf.color}`} style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12 }}>
            {statusConf.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <InfoChip icon="pin" text={`${booking.city}, ${booking.province}`} />
          <InfoChip icon="ruler" text={`${booking.sqm} m²`} />
          <InfoChip icon="calendar" text={booking.booking_date} />
          <InfoChip icon="clock" text={booking.time_slot} />
        </div>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Inter', color: '#00C896' }}>
          {formatCurrency(booking.amount)}
        </div>
        <div style={{ fontSize: 12, color: booking.payment_status === 'paid' ? '#00C896' : '#C46A00', marginTop: 3 }}>
          {booking.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
        </div>
      </div>

      <div style={{ color: '#9E9E9E', fontSize: 18, flexShrink: 0 }}>›</div>
    </div>
  )
}

function BookingModal({ booking, onClose }) {
  const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending

  const steps = [
    { label: 'Booking Received', done: true },
    { label: 'Payment Confirmed', done: booking.payment_status === 'paid' },
    { label: 'Cleaner Assigned', done: ['in-progress','confirmed','completed'].includes(booking.status) },
    { label: 'Service In Progress', done: ['in-progress','completed'].includes(booking.status) },
    { label: 'Service Completed', done: booking.status === 'completed' }
  ]

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(24px + var(--sat)) calc(24px + var(--sar)) calc(24px + var(--sab)) calc(24px + var(--sal))',
      backdropFilter: 'blur(4px)'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 20,
        width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto',
        padding: 32
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <ServiceBadge id={booking.service_id} size={40} iconSize={20} />
              <h2 style={{ fontSize: 22 }}>{booking.service_name}</h2>
            </div>
            <span className={`badge ${statusConf.color}`}>{statusConf.label}</span>
          </div>
          <button onClick={onClose} style={{
            background: '#EEEEEE', border: '1px solid #E8E8E8', color: '#6B6B6B',
            width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 16
          }}>✕</button>
        </div>

        {/* Booking ID */}
        <div style={{ background: '#EEEEEE', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9E9E9E', fontSize: 13 }}>Booking Reference</span>
          <span style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter', fontSize: 14 }}>{booking.id}</span>
        </div>

        {/* Details grid */}
        <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Service Area', value: `${booking.sqm} m²` },
            { label: 'Address', value: booking.address },
            { label: 'City', value: `${booking.city}, ${booking.province}` },
            { label: 'Date', value: new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
            { label: 'Time Window', value: booking.time_slot },
            { label: 'Amount', value: formatCurrency(booking.amount) },
            { label: 'Payment', value: booking.payment_status === 'paid' ? '✓ Paid' : 'Pending' }
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #EEEEEE' }}>
              <span style={{ color: '#6B6B6B', fontSize: 14 }}>{item.label}</span>
              <span style={{ color: '#000000', fontSize: 14, fontWeight: 500 }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Live cleaner tracking */}
        {booking.status === 'in-progress' && booking.cleaner_id && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <Icon name="radio" size={16} color="#00C896" style={{ verticalAlign: '-2px', marginRight: 6 }} />Track Your Cleaner
            </div>
            <LiveTrackingMap cleanerId={booking.cleaner_id} cleanerName={booking.cleaner_assigned} />
          </div>
        )}

        {/* Progress timeline */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Service Progress
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: s.done ? '#00C896' : '#EEEEEE',
                  border: `2px solid ${s.done ? '#00C896' : '#E8E8E8'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: s.done ? '#FFFFFF' : '#9E9E9E', fontWeight: 700
                }}>
                  {s.done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 14, color: s.done ? '#000000' : '#9E9E9E', fontWeight: s.done ? 500 : 400 }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoChip({ icon, text }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#6B6B6B' }}>
      <Icon name={icon} size={13} color="#9E9E9E" /> {text}
    </span>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ marginBottom: 20 }}><Icon name="bucket" size={52} color="#D5D5D5" /></div>
      <h3 style={{ fontSize: 22, marginBottom: 10 }}>No bookings yet</h3>
      <p style={{ color: '#6B6B6B', marginBottom: 28 }}>Book your first clean and it'll appear here</p>
      <Link to="/book" className="btn-primary">Book a Clean →</Link>
    </div>
  )
}
