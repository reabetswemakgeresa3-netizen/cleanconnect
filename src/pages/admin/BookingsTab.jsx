import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Icon, ServiceBadge } from '../../components/Icons'
import PinSpinner from '../../components/PinSpinner'
import { SERVICES, PROVINCES, STATUS_CONFIG, formatCurrency } from '../../data/services'
import { EmptyState, LoadingState, Pagination } from './shared'

const JOB_STATUSES = ['broadcasting', 'accepted', 'in-progress', 'completed', 'cancelled']
const PER_PAGE = 50

export default function BookingsTab({ bookings, loading, cleanerOptions, updateBooking, assignCleaner, processRefund, refundingId, selectedBooking, setSelectedBooking, highlightUnassigned }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [jobStatusFilter, setJobStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [provinceFilter, setProvinceFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(0)

  const filtered = bookings.filter(b => {
    if (highlightUnassigned && (b.cleaner_assigned || ['completed', 'cancelled'].includes(b.status))) return false
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (jobStatusFilter !== 'all' && b.job_status !== jobStatusFilter) return false
    if (paymentFilter !== 'all' && b.payment_status !== paymentFilter) return false
    if (serviceFilter !== 'all' && b.service_id !== serviceFilter) return false
    if (provinceFilter !== 'all' && b.province !== provinceFilter) return false
    if (dateFrom && b.booking_date < dateFrom) return false
    if (dateTo && b.booking_date > dateTo) return false
    if (search) {
      const s = search.toLowerCase()
      const match = b.contact_name?.toLowerCase().includes(s) || b.contact_phone?.includes(search) ||
        b.id?.toLowerCase().includes(s) || b.city?.toLowerCase().includes(s) || b.address?.toLowerCase().includes(s)
      if (!match) return false
    }
    return true
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sortBy === 'amount-high') return (b.amount || 0) - (a.amount || 0)
    if (sortBy === 'amount-low') return (a.amount || 0) - (b.amount || 0)
    if (sortBy === 'date') return new Date(a.booking_date) - new Date(b.booking_date)
    return 0
  })

  // Derived, not synced: clamps back into range on its own whenever the
  // filtered set shrinks, without needing an effect to "reset" page state.
  const maxPage = Math.max(0, Math.ceil(filtered.length / PER_PAGE) - 1)
  const safePage = Math.min(page, maxPage)
  const pageRows = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE)

  return (
    <div>
      {!highlightUnassigned && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input-field" placeholder="Search name, phone, city, ID..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 220, maxWidth: 300 }} />
          <select className="input-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
            <option value="all">All Statuses</option>
            {['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-field" value={jobStatusFilter} onChange={e => setJobStatusFilter(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
            <option value="all">All Job Statuses</option>
            {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-field" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="refunded">Refunded</option>
            <option value="pending-review">Refund pending review</option>
          </select>
          <select className="input-field" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
            <option value="all">All Services</option>
            {SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input-field" value={provinceFilter} onChange={e => setProvinceFilter(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
            <option value="all">All Provinces</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input className="input-field" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 'auto' }} title="From date" />
          <input className="input-field" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 'auto' }} title="To date" />
          <select className="input-field" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Highest Amount</option>
            <option value="amount-low">Lowest Amount</option>
            <option value="date">By Service Date</option>
          </select>
        </div>
      )}

      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {bookings.length} bookings
      </div>

      {loading ? (
        <LoadingState label="Loading bookings..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="clipboard" message="No bookings match your filters" />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pageRows.map(booking => (
              <BookingRow
                key={booking.id}
                booking={booking}
                onSelect={() => setSelectedBooking(booking)}
                onStatusChange={status => updateBooking(booking.id, { status })}
                onAssignCleaner={name => assignCleaner(booking.id, name)}
                cleaners={cleanerOptions}
                highlight={highlightUnassigned}
              />
            ))}
          </div>
          <Pagination page={safePage} setPage={setPage} total={filtered.length} perPage={PER_PAGE} />
        </>
      )}

      {selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={status => updateBooking(selectedBooking.id, { status })}
          onAssignCleaner={name => assignCleaner(selectedBooking.id, name)}
          cleaners={cleanerOptions}
          onRefund={() => processRefund(selectedBooking.id)}
          refunding={refundingId === selectedBooking.id}
        />
      )}
    </div>
  )
}

export function BookingRow({ booking, onSelect, onStatusChange, onAssignCleaner, cleaners, highlight }) {
  return (
    <div style={{
      background: 'var(--tile)',
      border: `1px solid ${highlight ? '#E11900' : 'var(--border)'}`,
      borderRadius: 14, padding: '16px 20px',
      display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
      transition: 'all 0.2s'
    }}>
      <ServiceBadge id={booking.service_id} size={44} iconSize={22} />

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>{booking.contact_name}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{booking.contact_phone}</span>
          {booking.job_status === 'broadcasting' && (
            <span style={{ background: 'rgba(196,106,0,0.12)', color: '#C46A00', borderRadius: 100, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>Broadcasting</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 3 }}>
          {booking.service_name} · <strong style={{ color: 'var(--text)' }}>{booking.sqm}m²</strong>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {booking.address}, {booking.city} · {booking.booking_date} · {booking.time_slot}
        </div>
        {booking.special_instructions && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
            "{booking.special_instructions}"
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={booking.cleaner_assigned || ''} onChange={e => onAssignCleaner(e.target.value)} onClick={e => e.stopPropagation()}
          style={{ background: booking.cleaner_assigned ? 'var(--tile-2)' : 'rgba(225,25,0,0.08)', border: `1px solid ${booking.cleaner_assigned ? 'var(--border)' : '#E11900'}`, borderRadius: 8, padding: '11px 10px', minHeight: 44, color: booking.cleaner_assigned ? 'var(--text)' : '#E11900', fontSize: 12, cursor: 'pointer' }}>
          <option value="">Assign cleaner...</option>
          {cleaners.map(c => <option key={c.name} value={c.name}>{c.name}{c.available === false ? ' (unavailable)' : ''}</option>)}
        </select>

        <select value={booking.status} onChange={e => onStatusChange(e.target.value)} onClick={e => e.stopPropagation()}
          style={{ background: 'var(--tile-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 10px', minHeight: 44, color: 'var(--text)', fontSize: 12, cursor: 'pointer' }}>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#00C896', fontWeight: 800, fontFamily: 'Inter', fontSize: 17 }}>{formatCurrency(booking.amount)}</div>
          <div style={{ fontSize: 11, color: booking.payment_status === 'paid' ? '#00C896' : '#C46A00' }}>
            {booking.payment_status === 'paid' ? '✓ Paid' : booking.payment_status === 'refunded' ? 'Refunded' : booking.payment_status === 'pending-review' ? 'Refund pending review' : 'Unpaid'}
            {' · '}{booking.payment_method === 'cash' ? 'Cash' : 'Yoco'}
          </div>
        </div>
        <button onClick={onSelect} style={{ background: 'var(--tile-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
          View →
        </button>
      </div>
    </div>
  )
}

export function BookingModal({ booking, onClose, onStatusChange, onAssignCleaner, cleaners, onRefund, refunding }) {
  const conf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
  const canRefund = booking.payment_method !== 'cash' && ['paid', 'pending-review'].includes(booking.payment_status)
  const [timeline, setTimeline] = useState([])
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  useEffect(() => {
    supabase.from('activity_log').select('*').eq('booking_id', booking.id).order('created_at', { ascending: true })
      .then(({ data }) => setTimeline(data || []))
  }, [booking.id])

  const resendNotification = async () => {
    setResending(true)
    setResendMsg('')
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { type: 'status_update', booking, customerPhone: booking.contact_phone, customerName: booking.contact_name }
      })
      if (error) throw new Error(data?.error || error.message || 'Could not resend.')
      setResendMsg('Notification resent.')
    } catch (err) {
      setResendMsg(err.message || 'Could not resend notification.')
    } finally {
      setResending(false)
      setTimeout(() => setResendMsg(''), 4000)
    }
  }

  const progressSteps = [
    { label: 'Booking Received', done: true },
    { label: 'Payment Confirmed', done: booking.payment_status === 'paid' },
    { label: 'Cleaner Assigned', done: !!booking.cleaner_assigned },
    { label: 'Service In Progress', done: ['in-progress', 'completed'].includes(booking.status) },
    { label: 'Service Completed', done: booking.status === 'completed' }
  ]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(24px + var(--sat)) calc(24px + var(--sar)) calc(24px + var(--sab)) calc(24px + var(--sal))', backdropFilter: 'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', padding: 32 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <ServiceBadge id={booking.service_id} size={40} iconSize={20} />
              <h2 style={{ fontSize: 22 }}>{booking.service_name}</h2>
            </div>
            <span className={`badge ${conf.color}`}>{conf.label}</span>
          </div>
          <button onClick={onClose} style={{ background: 'var(--tile-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', width: 36, height: 36, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ background: 'var(--tile-2)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Booking Reference</span>
          <span style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter' }}>{booking.id}</span>
        </div>

        <div style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#00C896', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Customer Details</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#00C896,#00A87E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
              {booking.contact_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{booking.contact_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{booking.contact_phone}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20, background: 'var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {[
            { label: 'Service Area', value: `${booking.sqm} m²` },
            { label: 'Address', value: booking.address },
            { label: 'City & Province', value: `${booking.city}, ${booking.province}` },
            { label: 'Service Date', value: new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
            { label: 'Time Window', value: booking.time_slot },
            { label: 'Amount', value: formatCurrency(booking.amount) },
            { label: 'Payment', value: booking.payment_status === 'paid' ? '✓ Paid' : booking.payment_status === 'refunded' ? 'Refunded' : booking.payment_status === 'pending-review' ? 'Refund pending review' : 'Unpaid' },
            { label: 'Payment Method', value: booking.payment_method === 'cash' ? 'Cash on Completion' : 'Yoco' },
            { label: 'Payment Reference', value: booking.payment_reference || '—' },
            { label: 'Job Status', value: booking.job_status || '—' },
            ...(booking.special_instructions ? [{ label: 'Notes', value: booking.special_instructions }] : []),
            { label: 'Booked On', value: new Date(booking.created_at).toLocaleString('en-ZA') },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--tile-2)' : 'none', gap: 16 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13, flexShrink: 0 }}>{row.label}</span>
              <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>Assign Cleaner</label>
          <select className="input-field" value={booking.cleaner_assigned || ''} onChange={e => onAssignCleaner(e.target.value)} style={{ cursor: 'pointer' }}>
            <option value="">Select a cleaner...</option>
            {cleaners.map(c => <option key={c.name} value={c.name}>{c.name}{c.available === false ? ' (unavailable)' : ''}</option>)}
          </select>
          {booking.cleaner_assigned && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#00C896' }}>✓ Assigned to {booking.cleaner_assigned}</div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 500 }}>Update Status</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'].map(s => (
              <button key={s} onClick={() => onStatusChange(s)} style={{
                padding: '10px 8px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                border: `2px solid ${booking.status === s ? '#00C896' : 'var(--border)'}`,
                background: booking.status === s ? 'rgba(0,200,150,0.1)' : 'var(--tile-2)',
                color: booking.status === s ? '#00C896' : 'var(--text-muted)',
                fontWeight: booking.status === s ? 600 : 400
              }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {canRefund && (
            <button onClick={onRefund} disabled={refunding} style={{
              flex: 1, minWidth: 180, padding: 14, borderRadius: 12, background: 'rgba(225,25,0,0.08)',
              border: '1px solid rgba(225,25,0,0.25)', color: '#E11900', fontWeight: 700, fontSize: 14,
              cursor: refunding ? 'default' : 'pointer', opacity: refunding ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              {refunding ? <PinSpinner size={18} variant="mono" /> : 'Process Refund via Yoco'}
            </button>
          )}
          <button onClick={resendNotification} disabled={resending} style={{
            flex: 1, minWidth: 180, padding: 14, borderRadius: 12, background: 'var(--tile-2)',
            border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 14,
            cursor: resending ? 'default' : 'pointer', opacity: resending ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            {resending ? <PinSpinner size={18} variant="mono" /> : 'Resend WhatsApp Notification'}
          </button>
        </div>
        {resendMsg && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: -14, marginBottom: 20 }}>{resendMsg}</p>}

        <div style={{ background: 'var(--tile-2)', borderRadius: 12, padding: '16px 20px', marginBottom: timeline.length ? 20 : 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Service Progress</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {progressSteps.map((step, i) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: step.done ? '#00C896' : 'var(--tile-2)', border: `2px solid ${step.done ? '#00C896' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: step.done ? '#FFFFFF' : 'var(--text-dim)', fontWeight: 700 }}>
                  {step.done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 13, color: step.done ? 'var(--text)' : 'var(--text-dim)', fontWeight: step.done ? 500 : 400 }}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {timeline.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Event History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {timeline.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{e.title}</span>
                  <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{new Date(e.created_at).toLocaleString('en-ZA')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
