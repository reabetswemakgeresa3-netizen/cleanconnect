import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { SERVICES, STATUS_CONFIG, formatCurrency } from '../data/services'
import LiveTrackingMap from '../components/LiveTrackingMap'
import { Icon, ServiceBadge } from '../components/Icons'
import PinSpinner from '../components/PinSpinner'
import UserAvatar from '../components/UserAvatar'
import StarPicker from '../components/StarPicker'
import ReviewModal from '../components/ReviewModal'
import { getCancellationPolicy } from '../lib/cancellation'

const PAYMENT_LABELS = {
  paid: '✓ Paid', unpaid: 'Pending', refunded: 'Refunded', 'pending-review': 'Refund under review'
}

// job_status carries the finer-grained progress during the cleaner's Active
// Job flow (the coarse "status" column stays 'confirmed' for the whole
// en-route/in-progress window, only syncing back up at completion) — this
// derives what to actually show the customer.
function liveJobLabel(booking) {
  if (booking.job_status === 'en-route') return { label: 'Cleaner on the way', color: '#276EF1' }
  if (booking.job_status === 'in-progress') return { label: 'Cleaning in progress', color: '#00C896' }
  if (booking.status === 'completed') return { label: 'Completed — please rate your experience', color: '#00C896' }
  return null
}

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
  const [reviewedIds, setReviewedIds] = useState(new Set())

  useEffect(() => {
    fetchBookings()
  }, [user])

  // Drives the "Rate your cleaner" banner on completed booking cards —
  // fetched once as a set of IDs rather than per-card, to avoid N queries.
  useEffect(() => {
    if (!user) return
    supabase.from('reviews').select('booking_id').eq('user_id', user.id)
      .then(({ data }) => setReviewedIds(new Set((data || []).map(r => r.booking_id))))
  }, [user, bookings])

  // Live sync while a cleaner progresses through the Active Job flow —
  // en-route/arrived/completed should update here without a manual refresh.
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`dashboard-bookings-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` },
        payload => {
          setBookings(prev => prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b))
          setSelectedBooking(prev => prev && prev.id === payload.new.id ? { ...prev, ...payload.new } : prev)
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
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

  const handleCancelled = (updatedBooking) => {
    setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b))
    setSelectedBooking(updatedBooking)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <UserAvatar size={52} editable />
            <div>
              <h1 style={{ fontSize: 32, marginBottom: 6 }}>
                Hey, {userName.split(' ')[0]}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>Manage and track all your cleaning bookings</p>
            </div>
          </div>
          <Link to="/book" className="btn-primary">+ New Booking</Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 16, marginBottom: 36 }}>
          {[
            { label: 'Total Bookings', value: stats.total, icon: 'clipboard', color: 'var(--text-muted)' },
            { label: 'Completed', value: stats.completed, icon: 'checkCircle', color: '#00C896' },
            { label: 'Upcoming', value: stats.upcoming, icon: 'calendar', color: '#276EF1' },
            { label: 'Total Spent', value: formatCurrency(stats.spent), icon: 'card', color: '#00C896' }
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--tile)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '20px'
            }}>
              <div style={{ marginBottom: 8 }}><Icon name={stat.icon} size={22} color={stat.color} /></div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Inter', color: stat.color, marginBottom: 4 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{stat.label}</div>
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
                padding: '10px 18px', borderRadius: 100, minHeight: 44,
                border: `1.5px solid ${filter === f.id ? '#00C896' : 'var(--border)'}`,
                background: filter === f.id ? 'rgba(0,200,150,0.1)' : 'transparent',
                color: filter === f.id ? '#00C896' : 'var(--text-muted)',
                fontSize: 14, cursor: 'pointer', transition: 'all 0.2s'
              }}>{f.label}</button>
          ))}
        </div>

        {/* Bookings list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <PinSpinner size={36} style={{ marginBottom: 12 }} />
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
                needsReview={booking.status === 'completed' && !reviewedIds.has(booking.id)}
                onClick={() => setSelectedBooking(booking)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedBooking && (
        <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onCancelled={handleCancelled} />
      )}
    </div>
  )
}

function BookingCard({ booking, needsReview, onClick }) {
  const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
  const live = liveJobLabel(booking)

  return (
    <div onClick={onClick} style={{
      background: 'var(--tile)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '20px 24px', cursor: 'pointer',
      transition: 'all 0.2s', display: 'flex', gap: 20, alignItems: 'center',
      flexWrap: 'wrap'
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#00C896'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.08)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Service icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: 'var(--tile-2)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, flexShrink: 0
      }}><ServiceBadge id={booking.service_id} size={44} iconSize={22} /></div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h3 style={{ fontSize: 16, color: 'var(--text)' }}>{booking.service_name}</h3>
          <span className={`badge ${statusConf.color}`} style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12 }}>
            {statusConf.label}
          </span>
          {live && live.label !== 'Completed — please rate your experience' && (
            <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600, background: `${live.color}1a`, color: live.color }}>
              {live.label}
            </span>
          )}
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
          {PAYMENT_LABELS[booking.payment_status] || 'Unpaid'}
        </div>
      </div>

      <div style={{ color: 'var(--text-dim)', fontSize: 18, flexShrink: 0 }}>›</div>

      {needsReview && (
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.25)',
          borderRadius: 10, padding: '9px 14px', color: '#C46A00', fontSize: 13, fontWeight: 600
        }}>
          <Icon name="star" size={14} color="#C46A00" /> Rate your cleaner
        </div>
      )}
    </div>
  )
}

function BookingModal({ booking, onClose, onCancelled }) {
  const statusConf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
  const live = liveJobLabel(booking)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  // Once the cleaner is en route or actively cleaning, it's too late to cancel.
  const canCancel = (booking.status === 'pending' || booking.status === 'confirmed')
    && !['en-route', 'in-progress'].includes(booking.job_status)
  const policy = canCancel ? getCancellationPolicy(booking.booking_date, booking.time_slot) : null

  const [review, setReview] = useState(undefined) // undefined = loading, null = none yet
  const [showReviewModal, setShowReviewModal] = useState(false)

  useEffect(() => {
    if (booking.status !== 'completed') { setReview(null); return }
    let cancelled = false
    supabase.from('reviews').select('*').eq('booking_id', booking.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setReview(data || null) })
    return () => { cancelled = true }
  }, [booking.id, booking.status])

  const confirmCancel = async () => {
    setCancelling(true)
    setCancelError('')
    // A real Yoco refund only applies to a card payment that's actually been
    // paid and qualifies for a full refund — cash bookings and the
    // inside-window "pending review" case keep today's local-write behavior.
    const eligibleForAutoRefund = policy.fullRefund && booking.payment_method !== 'cash' && booking.payment_status === 'paid'
    const updates = { status: 'cancelled', payment_status: eligibleForAutoRefund ? booking.payment_status : policy.newPaymentStatus }
    try {
      if (eligibleForAutoRefund) {
        // process-refund only touches payment_status (it doesn't know about
        // "cancelled" as a booking concept) — status still needs setting here.
        const { data, error } = await supabase.functions.invoke('process-refund', { body: { bookingId: booking.id } })
        if (error) throw new Error(data?.error || error.message || 'Could not process the refund.')
        if (data?.error) throw new Error(data.error)
        updates.payment_status = 'refunded'
        const { error: statusError } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
        if (statusError) throw statusError
      } else {
        const { error } = await supabase.from('bookings').update(updates).eq('id', booking.id)
        if (error) throw error
      }
      // Reuse the same WhatsApp notification path Admin uses for status changes
      supabase.functions.invoke('send-whatsapp', {
        body: {
          type: 'status_update',
          booking: { ...booking, ...updates },
          customerPhone: booking.contact_phone,
          customerName: booking.contact_name
        }
      }).catch(() => {})
      onCancelled({ ...booking, ...updates })
      setConfirmingCancel(false)
    } catch (err) {
      setCancelError(err.message || 'Could not cancel this booking. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const steps = [
    { label: 'Booking Received', done: true },
    { label: 'Payment Confirmed', done: booking.payment_status === 'paid' },
    { label: 'Cleaner Assigned', done: !!booking.cleaner_id },
    { label: 'Cleaner On The Way', done: ['en-route', 'in-progress'].includes(booking.job_status) || booking.status === 'completed' },
    { label: 'Service In Progress', done: booking.job_status === 'in-progress' || booking.status === 'completed' },
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
        background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 20,
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className={`badge ${statusConf.color}`}>{statusConf.label}</span>
              {live && (
                <span style={{ padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, background: `${live.color}1a`, color: live.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {live.label}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--tile-2)', border: '1px solid var(--border)', color: 'var(--text-muted)',
            width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 16
          }}>✕</button>
        </div>

        {/* Booking ID */}
        <div style={{ background: 'var(--tile-2)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Booking Reference</span>
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
            { label: 'Payment', value: PAYMENT_LABELS[booking.payment_status] || 'Pending' }
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tile-2)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{item.label}</span>
              <span style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Cancel booking */}
        {canCancel && (
          <div style={{ marginBottom: 24 }}>
            {!confirmingCancel ? (
              <button onClick={() => setConfirmingCancel(true)} style={{
                width: '100%', padding: 14, borderRadius: 12, background: 'rgba(225,25,0,0.08)',
                border: '1px solid rgba(225,25,0,0.25)', color: '#E11900', fontWeight: 700, fontSize: 14.5
              }}>
                Cancel Booking
              </button>
            ) : (
              <div style={{ background: 'rgba(225,25,0,0.06)', border: '1px solid rgba(225,25,0,0.25)', borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <Icon name="alertTriangle" size={20} color="#E11900" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>{policy.message}</p>
                </div>
                {cancelError && <p style={{ color: '#E11900', fontSize: 13, marginBottom: 10 }}>{cancelError}</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setConfirmingCancel(false)} disabled={cancelling} className="btn-outline" style={{ flex: 1, justifyContent: 'center', padding: 12 }}>
                    Keep Booking
                  </button>
                  <button onClick={confirmCancel} disabled={cancelling} style={{
                    flex: 1, padding: 12, borderRadius: 12, background: '#E11900', color: '#FFFFFF',
                    fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}>
                    {cancelling ? <PinSpinner size={18} variant="mono" /> : 'Yes, Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live cleaner tracking */}
        {['en-route', 'in-progress'].includes(booking.job_status) && booking.cleaner_id && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <Icon name="radio" size={16} color="#00C896" style={{ verticalAlign: '-2px', marginRight: 6 }} />Track Your Cleaner
            </div>
            <LiveTrackingMap cleanerId={booking.cleaner_id} cleanerName={booking.cleaner_assigned} />
          </div>
        )}

        {/* Rate your cleaner */}
        {booking.status === 'completed' && booking.cleaner_id && review !== undefined && (
          <div style={{ marginBottom: 24 }}>
            {review ? (
              <div style={{ background: 'var(--tile-2)', borderRadius: 14, padding: '16px 20px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Rating</div>
                <StarPicker value={review.rating} readOnly size={20} />
                {review.comment && <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.6 }}>"{review.comment}"</p>}
              </div>
            ) : (
              <button onClick={() => setShowReviewModal(true)} className="btn-outline" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
                Rate Your Cleaner
              </button>
            )}
          </div>
        )}

        {/* Progress timeline */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Service Progress
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: s.done ? '#00C896' : 'var(--tile-2)',
                  border: `2px solid ${s.done ? '#00C896' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: s.done ? '#FFFFFF' : 'var(--text-dim)', fontWeight: 700
                }}>
                  {s.done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 14, color: s.done ? 'var(--text)' : 'var(--text-dim)', fontWeight: s.done ? 500 : 400 }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showReviewModal && (
        <ReviewModal
          booking={booking}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={newReview => { setReview(newReview); setShowReviewModal(false) }}
        />
      )}
    </div>
  )
}

function InfoChip({ icon, text }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-muted)' }}>
      <Icon name={icon} size={13} color="var(--text-dim)" /> {text}
    </span>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ marginBottom: 20 }}><Icon name="bucket" size={52} color="var(--text-dim)" /></div>
      <h3 style={{ fontSize: 22, marginBottom: 10 }}>No bookings yet</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Book your first clean and it'll appear here</p>
      <Link to="/book" className="btn-primary">Book a Clean →</Link>
    </div>
  )
}
