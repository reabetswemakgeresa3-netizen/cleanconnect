import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'
import { Icon, ServiceBadge } from '../components/Icons'
import { SERVICES, STATUS_CONFIG, formatCurrency } from '../data/services'

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || 'cleanconnect2025'

const CLEANERS = ['Zanele Dlamini', 'Sipho Nkosi', 'Fatima Mokoena', 'Thabo Sithole', 'Nomsa Khumalo', 'Kagiso Molefe']

const DEMO_BOOKINGS = [
  { id: 'CC-A1B2C3D4', user_id: 'u1', service_name: 'Residential Cleaning', service_id: 'residential', sqm: 85, address: '42 Sandton Drive', city: 'Johannesburg', province: 'Gauteng', booking_date: '2025-02-20', time_slot: '09:00 – 11:00', contact_name: 'Thabo Nkosi', contact_phone: '072 111 2233', amount: 1377, status: 'pending', payment_status: 'paid', created_at: '2025-02-18T10:00:00Z', cleaner_assigned: null, special_instructions: 'Please bring eco-friendly products.' },
  { id: 'CC-E5F6G7H8', user_id: 'u2', service_name: 'Office & Commercial', service_id: 'office', sqm: 220, address: '1 Rosebank Mall Rd', city: 'Johannesburg', province: 'Gauteng', booking_date: '2025-02-21', time_slot: '07:00 – 09:00', contact_name: 'Nomsa Dube', contact_phone: '083 444 5566', amount: 2970, status: 'confirmed', payment_status: 'paid', created_at: '2025-02-17T08:00:00Z', cleaner_assigned: 'Zanele Dlamini', special_instructions: '' },
  { id: 'CC-I9J0K1L2', user_id: 'u3', service_name: 'Garden & Outdoor', service_id: 'gardening', sqm: 300, address: '15 Estate Drive', city: 'Pretoria', province: 'Gauteng', booking_date: '2025-02-22', time_slot: '11:00 – 13:00', contact_name: 'Sipho Khumalo', contact_phone: '060 777 8899', amount: 2040, status: 'in-progress', payment_status: 'paid', created_at: '2025-02-16T14:00:00Z', cleaner_assigned: 'Thabo Sithole', special_instructions: 'Gate code: 1234' },
  { id: 'CC-M3N4O5P6', user_id: 'u4', service_name: 'Industrial Cleaning', service_id: 'industrial', sqm: 500, address: '8 Industrial Park', city: 'Ekurhuleni', province: 'Gauteng', booking_date: '2025-02-19', time_slot: '07:00 – 09:00', contact_name: 'Kagiso Molefe', contact_phone: '071 333 4455', amount: 5100, status: 'completed', payment_status: 'paid', created_at: '2025-02-14T09:00:00Z', cleaner_assigned: 'Sipho Nkosi', special_instructions: '' },
  { id: 'CC-Q7R8S9T0', user_id: 'u5', service_name: 'Medical & Healthcare', service_id: 'medical', sqm: 60, address: '5 Clinic Road', city: 'Cape Town', province: 'Western Cape', booking_date: '2025-02-23', time_slot: '13:00 – 15:00', contact_name: 'Dr. Fatima Adams', contact_phone: '082 999 0011', amount: 1512, status: 'pending', payment_status: 'paid', created_at: '2025-02-18T11:00:00Z', cleaner_assigned: null, special_instructions: 'Sterile environment required.' },
  { id: 'CC-R1S2T3U4', user_id: 'u6', service_name: 'Carpet & Upholstery', service_id: 'carpet', sqm: 45, address: '27 Bryanston Close', city: 'Johannesburg', province: 'Gauteng', booking_date: '2025-02-24', time_slot: '15:00 – 17:00', contact_name: 'Lerato Sithole', contact_phone: '079 222 3344', amount: 891, status: 'confirmed', payment_status: 'paid', created_at: '2025-02-19T07:30:00Z', cleaner_assigned: 'Nomsa Khumalo', special_instructions: '' },
  { id: 'CC-V5W6X7Y8', user_id: 'u7', service_name: 'Post-Construction', service_id: 'postConstruction', sqm: 180, address: '3 New Development Rd', city: 'Durban', province: 'KwaZulu-Natal', booking_date: '2025-02-25', time_slot: '09:00 – 11:00', contact_name: 'Mandla Zulu', contact_phone: '083 555 6677', amount: 3240, status: 'pending', payment_status: 'paid', created_at: '2025-02-20T13:00:00Z', cleaner_assigned: null, special_instructions: 'Heavy dust from renovation.' },
  { id: 'CC-Z9A0B1C2', user_id: 'u8', service_name: 'Residential Cleaning', service_id: 'residential', sqm: 120, address: '8 Fourways Gardens', city: 'Johannesburg', province: 'Gauteng', booking_date: '2025-02-26', time_slot: '11:00 – 13:00', contact_name: 'Amahle Dlamini', contact_phone: '071 888 9900', amount: 1944, status: 'cancelled', payment_status: 'refunded', created_at: '2025-02-20T16:00:00Z', cleaner_assigned: null, special_instructions: '' },
]

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('customers')
  const [statusFilter, setStatusFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [sortBy, setSortBy] = useState('newest')
  const [cleanersList, setCleanersList] = useState([])

  const handlePinSubmit = (e) => {
    e.preventDefault()
    if (pin === ADMIN_PIN) { setAuthenticated(true); fetchBookings() }
    else setPinError('Incorrect PIN. Try again.')
  }

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings').select('*').order('created_at', { ascending: false })
      if (error || !data || data.length === 0) setBookings(DEMO_BOOKINGS)
      else setBookings(data)
      const { data: cleanerRows } = await supabase.from('cleaners').select('id, name, available')
      if (cleanerRows?.length) setCleanersList(cleanerRows)
    } catch { setBookings(DEMO_BOOKINGS) }
    finally { setLoading(false) }
  }

  // Registered workers from the DB; falls back to the demo name list
  const cleanerOptions = cleanersList.length ? cleanersList : CLEANERS.map(name => ({ id: null, name }))

  const assignCleaner = (bookingId, name) => {
    const c = cleanerOptions.find(o => o.name === name)
    updateBooking(bookingId, { cleaner_assigned: name || null, cleaner_id: c?.id ?? null })
  }

  const updateBooking = async (id, updates) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    if (selectedBooking?.id === id) setSelectedBooking(prev => ({ ...prev, ...updates }))
    try {
      await supabase.from('bookings').update(updates).eq('id', id)
      if (updates.status) {
        const booking = bookings.find(b => b.id === id)
        await supabase.functions.invoke('send-whatsapp', {
          body: { type: 'status_update', booking: { ...booking, ...updates }, customerPhone: booking?.contact_phone, customerName: booking?.contact_name }
        }).catch(() => {})
      }
    } catch { }
  }

  // Derived data
  const filtered = bookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    const matchService = serviceFilter === 'all' || b.service_id === serviceFilter
    const matchSearch = !search || 
      b.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.contact_phone?.includes(search) ||
      b.id?.toLowerCase().includes(search.toLowerCase()) ||
      b.city?.toLowerCase().includes(search.toLowerCase()) ||
      b.address?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchService && matchSearch
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sortBy === 'amount-high') return (b.amount || 0) - (a.amount || 0)
    if (sortBy === 'amount-low') return (a.amount || 0) - (b.amount || 0)
    if (sortBy === 'date') return new Date(a.booking_date) - new Date(b.booking_date)
    return 0
  })

  const stats = {
    total: bookings.length,
    revenue: bookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + (b.amount || 0), 0),
    pending: bookings.filter(b => b.status === 'pending').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    unassigned: bookings.filter(b => !b.cleaner_assigned && !['completed','cancelled'].includes(b.status)).length,
    thisWeek: bookings.filter(b => {
      const d = new Date(b.created_at)
      const now = new Date()
      return (now - d) < 7 * 24 * 60 * 60 * 1000
    }).length
  }

  // Unique customers
  const customers = Object.values(bookings.reduce((acc, b) => {
    const key = b.contact_phone || b.contact_name
    if (!acc[key]) {
      acc[key] = { name: b.contact_name, phone: b.contact_phone, bookings: [], totalSpent: 0 }
    }
    acc[key].bookings.push(b)
    acc[key].totalSpent += b.amount || 0
    return acc
  }, {})).sort((a, b) => b.totalSpent - a.totalSpent)

  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 40px', background: '#FFFFFF' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Logo variant="tile" size={64} /></div>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Admin Dashboard</h1>
            <p style={{ color: '#6B6B6B' }}>CleanConnect Operations Centre</p>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #EEEEEE', borderRadius: 20, padding: 36, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 30px rgba(0,0,0,0.05)' }}>
            <form onSubmit={handlePinSubmit}>
              {pinError && <div style={{ background: 'rgba(225,25,0,0.1)', border: '1px solid rgba(225,25,0,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#E11900', fontSize: 14 }}>{pinError}</div>}
              <label style={{ display: 'block', fontSize: 13, color: '#6B6B6B', marginBottom: 8 }}>Admin PIN</label>
              <input className="input-field" type="password" placeholder="Enter PIN" value={pin} onChange={e => setPin(e.target.value)} style={{ marginBottom: 16 }} autoFocus />
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>Access Dashboard →</button>
            </form>
            <p style={{ fontSize: 12, color: '#9E9E9E', textAlign: 'center', marginTop: 16 }}>Default PIN: <code style={{ color: '#00C896' }}>cleanconnect2025</code></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 68, minHeight: '100vh', background: '#FFFFFF' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 30, marginBottom: 4 }}>Admin Dashboard</h1>
            <p style={{ color: '#6B6B6B', fontSize: 14 }}>CleanConnect Operations Centre · {bookings.length} total bookings</p>
          </div>
          <button onClick={fetchBookings} style={{ background: '#F6F6F6', border: '1px solid #E8E8E8', color: '#6B6B6B', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            Refresh Data
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 14, marginBottom: 32 }}>
          {[
            { label: 'Total Bookings', value: stats.total, icon: 'clipboard', color: '#000000' },
            { label: 'Total Revenue', value: formatCurrency(stats.revenue), icon: 'wallet', color: '#00C896' },
            { label: 'This Week', value: stats.thisWeek, icon: 'calendar', color: '#276EF1' },
            { label: 'Pending', value: stats.pending, icon: '⏳', color: '#C46A00' },
            { label: 'Completed', value: stats.completed, icon: 'checkCircle', color: '#00C896' },
            { label: 'Unassigned', value: stats.unassigned, icon: 'info', color: stats.unassigned > 0 ? '#E11900' : '#6B6B6B' },
          ].map(s => (
            <div key={s.label} style={{ background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Inter', color: s.color, marginBottom: 3 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#9E9E9E' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {[
            { id: 'customers', label: 'Customers', count: customers.length },
            { id: 'bookings', label: 'All Bookings', count: bookings.length },
            { id: 'unassigned', label: 'Unassigned', count: stats.unassigned },
            { id: 'stats', label: 'Revenue Stats' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '10px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: activeTab === t.id ? '#00C896' : 'transparent',
              color: activeTab === t.id ? '#FFFFFF' : '#6B6B6B',
              fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400, transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              {t.label}
              {t.count !== undefined && (
                <span style={{ background: activeTab === t.id ? 'rgba(0,0,0,0.15)' : '#E8E8E8', borderRadius: 100, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── CUSTOMERS TAB ── */}
        {activeTab === 'customers' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <input className="input-field" placeholder="Search by name, phone, city..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400 }} />
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {customers.filter(c =>
                !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
              ).map((customer, i) => (
                <CustomerRow
                  key={i}
                  customer={customer}
                  onViewBooking={b => { setSelectedBooking(b); setActiveTab('bookings') }}
                />
              ))}
              {customers.length === 0 && <EmptyState icon="users" message="No customers yet" />}
            </div>
          </div>
        )}

        {/* ── ALL BOOKINGS TAB ── */}
        {activeTab === 'bookings' && (
          <div>
            {/* Filters row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <input className="input-field" placeholder="Search name, phone, city, ID..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 220, maxWidth: 340 }} />
              <select className="input-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select className="input-field" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
                <option value="all">All Services</option>
                {SERVICES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
              <select className="input-field" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount-high">Highest Amount</option>
                <option value="amount-low">Lowest Amount</option>
                <option value="date">By Service Date</option>
              </select>
            </div>

            <div style={{ marginBottom: 12, fontSize: 13, color: '#6B6B6B' }}>
              Showing <strong style={{ color: '#000000' }}>{filtered.length}</strong> of {bookings.length} bookings
            </div>

            {loading ? (
              <LoadingState />
            ) : filtered.length === 0 ? (
              <EmptyState icon="clipboard" message="No bookings match your filters" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map(booking => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    onSelect={() => setSelectedBooking(booking)}
                    onStatusChange={status => updateBooking(booking.id, { status })}
                    onAssignCleaner={name => assignCleaner(booking.id, name)}
                    cleaners={cleanerOptions}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── UNASSIGNED TAB ── */}
        {activeTab === 'unassigned' && (
          <div>
            {stats.unassigned === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 16 }}>
                <div style={{ marginBottom: 16 }}><Icon name="checkCircle" size={44} color="#00C896" /></div>
                <h3 style={{ fontSize: 20, marginBottom: 8 }}>All bookings assigned!</h3>
                <p style={{ color: '#6B6B6B' }}>Every active booking has a cleaner assigned.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bookings.filter(b => !b.cleaner_assigned && !['completed','cancelled'].includes(b.status)).map(booking => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    onSelect={() => setSelectedBooking(booking)}
                    onStatusChange={status => updateBooking(booking.id, { status })}
                    onAssignCleaner={name => assignCleaner(booking.id, name)}
                    cleaners={cleanerOptions}
                    highlight
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STATS TAB ── */}
        {activeTab === 'stats' && <RevenueStats bookings={bookings} />}
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={status => updateBooking(selectedBooking.id, { status })}
          onAssignCleaner={name => assignCleaner(selectedBooking.id, name)}
          cleaners={cleanerOptions}
        />
      )}
    </div>
  )
}

// ── CUSTOMER ROW ──────────────────────────────────────────
function CustomerRow({ customer, onViewBooking }) {
  const [expanded, setExpanded] = useState(false)
  const lastBooking = customer.bookings[0]
  const statusCount = customer.bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Customer header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', flexWrap: 'wrap' }}
      >
        {/* Avatar */}
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#00C896,#00A87E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#FFFFFF', flexShrink: 0, fontFamily: 'Inter' }}>
          {customer.name?.[0]?.toUpperCase() || '?'}
        </div>

        {/* Name + phone */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontWeight: 600, color: '#000000', fontSize: 16, marginBottom: 3 }}>{customer.name}</div>
          <div style={{ fontSize: 13, color: '#6B6B6B', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>{customer.phone}</span>
            <span>{lastBooking?.city}, {lastBooking?.province}</span>
          </div>
        </div>

        {/* Booking counts */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(statusCount).map(([status, count]) => {
            const conf = STATUS_CONFIG[status] || STATUS_CONFIG.pending
            return (
              <span key={status} className={`badge ${conf.color}`} style={{ fontSize: 12 }}>
                {count} {status}
              </span>
            )
          })}
        </div>

        {/* Total spent */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ color: '#00C896', fontWeight: 800, fontFamily: 'Inter', fontSize: 18 }}>{formatCurrency(customer.totalSpent)}</div>
          <div style={{ fontSize: 12, color: '#9E9E9E' }}>{customer.bookings.length} booking{customer.bookings.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Expand arrow */}
        <div style={{ color: '#9E9E9E', fontSize: 18, transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'none' }}>›</div>
      </div>

      {/* Expanded bookings list */}
      {expanded && (
        <div style={{ borderTop: '1px solid #EEEEEE' }}>
          <div style={{ padding: '12px 24px 6px', fontSize: 11, color: '#9E9E9E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Booking History
          </div>
          {customer.bookings.map(booking => {
            const conf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
            return (
              <div
                key={booking.id}
                onClick={() => onViewBooking(booking)}
                style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14, borderTop: '1px solid #F2F2F2', cursor: 'pointer', transition: 'background 0.15s', flexWrap: 'wrap' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F2F2F2'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <ServiceBadge id={booking.service_id} size={36} iconSize={18} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#000000', marginBottom: 2 }}>{booking.service_name}</div>
                  <div style={{ fontSize: 12, color: '#6B6B6B' }}>
                    {booking.booking_date} · {booking.time_slot} · {booking.sqm}m² · {booking.city}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`badge ${conf.color}`} style={{ fontSize: 11 }}>{conf.icon} {conf.label}</span>
                  <span style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter', fontSize: 15 }}>{formatCurrency(booking.amount)}</span>
                  <span style={{ fontSize: 11, color: '#9E9E9E', fontFamily: 'Inter' }}>{booking.id}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── BOOKING ROW ───────────────────────────────────────────
function BookingRow({ booking, onSelect, onStatusChange, onAssignCleaner, cleaners, highlight }) {
  const conf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending

  return (
    <div style={{
      background: '#F6F6F6',
      border: `1px solid ${highlight ? '#E11900' : '#E8E8E8'}`,
      borderRadius: 14, padding: '16px 20px',
      display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
      transition: 'all 0.2s'
    }}>
      {/* Service icon */}
      <ServiceBadge id={booking.service_id} size={44} iconSize={22} />

      {/* Customer + service info */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: '#000000', fontSize: 15 }}>{booking.contact_name}</span>
          <span style={{ fontSize: 12, color: '#6B6B6B' }}>·</span>
          <span style={{ fontSize: 13, color: '#6B6B6B' }}>{booking.contact_phone}</span>
        </div>
        <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 3 }}>
          {booking.service_name} · <strong style={{ color: '#000000' }}>{booking.sqm}m²</strong>
        </div>
        <div style={{ fontSize: 12, color: '#9E9E9E' }}>
          {booking.address}, {booking.city} · {booking.booking_date} · {booking.time_slot}
        </div>
        {booking.special_instructions && (
          <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 4, fontStyle: 'italic' }}>
            "{booking.special_instructions}"
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Assign cleaner */}
        <select value={booking.cleaner_assigned || ''} onChange={e => onAssignCleaner(e.target.value)} onClick={e => e.stopPropagation()}
          style={{ background: booking.cleaner_assigned ? '#EEEEEE' : 'rgba(225,25,0,0.08)', border: `1px solid ${booking.cleaner_assigned ? '#E8E8E8' : '#E11900'}`, borderRadius: 8, padding: '7px 10px', color: booking.cleaner_assigned ? '#000000' : '#E11900', fontSize: 12, cursor: 'pointer' }}>
          <option value="">Assign cleaner...</option>
          {cleaners.map(c => <option key={c.name} value={c.name}>{c.name}{c.available === false ? ' (unavailable)' : ''}</option>)}
        </select>

        {/* Status */}
        <select value={booking.status} onChange={e => onStatusChange(e.target.value)} onClick={e => e.stopPropagation()}
          style={{ background: '#EEEEEE', border: '1px solid #E8E8E8', borderRadius: 8, padding: '7px 10px', color: '#000000', fontSize: 12, cursor: 'pointer' }}>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Amount + view */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#00C896', fontWeight: 800, fontFamily: 'Inter', fontSize: 17 }}>{formatCurrency(booking.amount)}</div>
          <div style={{ fontSize: 11, color: booking.payment_status === 'paid' ? '#00C896' : '#C46A00' }}>
            {booking.payment_status === 'paid' ? '✓ Paid' : booking.payment_status === 'refunded' ? 'Refunded' : '⏳ Unpaid'}
          </div>
        </div>
        <button onClick={onSelect} style={{ background: '#EEEEEE', border: '1px solid #E8E8E8', color: '#6B6B6B', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
          View →
        </button>
      </div>
    </div>
  )
}

// ── BOOKING DETAIL MODAL ──────────────────────────────────
function BookingModal({ booking, onClose, onStatusChange, onAssignCleaner, cleaners }) {
  const conf = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending

  const progressSteps = [
    { label: 'Booking Received', done: true },
    { label: 'Payment Confirmed', done: booking.payment_status === 'paid' },
    { label: 'Cleaner Assigned', done: !!booking.cleaner_assigned },
    { label: 'Service In Progress', done: ['in-progress','completed'].includes(booking.status) },
    { label: 'Service Completed', done: booking.status === 'completed' }
  ]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(24px + var(--sat)) calc(24px + var(--sar)) calc(24px + var(--sab)) calc(24px + var(--sal))', backdropFilter: 'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', padding: 32 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <ServiceBadge id={booking.service_id} size={40} iconSize={20} />
              <h2 style={{ fontSize: 22 }}>{booking.service_name}</h2>
            </div>
            <span className={`badge ${conf.color}`}>{conf.icon} {conf.label}</span>
          </div>
          <button onClick={onClose} style={{ background: '#EEEEEE', border: '1px solid #E8E8E8', color: '#6B6B6B', width: 36, height: 36, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Booking ID */}
        <div style={{ background: '#EEEEEE', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9E9E9E', fontSize: 13 }}>Booking Reference</span>
          <span style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter' }}>{booking.id}</span>
        </div>

        {/* Customer info */}
        <div style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#00C896', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Customer Details</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#00C896,#00A87E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                {booking.contact_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#000000', fontSize: 15 }}>{booking.contact_name}</div>
                <div style={{ fontSize: 13, color: '#6B6B6B' }}>{booking.contact_phone}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20, background: '#F2F2F2', borderRadius: 12, overflow: 'hidden' }}>
          {[
            { label: 'Service Area', value: `${booking.sqm} m²` },
            { label: 'Address', value: booking.address },
            { label: 'City & Province', value: `${booking.city}, ${booking.province}` },
            { label: 'Service Date', value: new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
            { label: '⏰ Time Window', value: booking.time_slot },
            { label: 'Amount', value: formatCurrency(booking.amount) },
            { label: 'Payment', value: booking.payment_status === 'paid' ? '✓ Paid' : booking.payment_status === 'refunded' ? 'Refunded' : '⏳ Unpaid' },
            ...(booking.special_instructions ? [{ label: 'Notes', value: booking.special_instructions }] : []),
            { label: 'Booked On', value: new Date(booking.created_at).toLocaleString('en-ZA') },
          ].map((row, i) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < 8 ? '1px solid #EEEEEE' : 'none', gap: 16 }}>
              <span style={{ color: '#6B6B6B', fontSize: 13, flexShrink: 0 }}>{row.label}</span>
              <span style={{ color: '#000000', fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Assign cleaner */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#6B6B6B', marginBottom: 8, fontWeight: 500 }}>Assign Cleaner</label>
          <select className="input-field" value={booking.cleaner_assigned || ''} onChange={e => onAssignCleaner(e.target.value)} style={{ cursor: 'pointer' }}>
            <option value="">Select a cleaner...</option>
            {cleaners.map(c => <option key={c.name} value={c.name}>{c.name}{c.available === false ? ' (unavailable)' : ''}</option>)}
          </select>
          {booking.cleaner_assigned && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#00C896' }}>✓ Assigned to {booking.cleaner_assigned}</div>
          )}
        </div>

        {/* Update status */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#6B6B6B', marginBottom: 10, fontWeight: 500 }}>Update Status</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {['pending','confirmed','in-progress','completed','cancelled'].map(s => {
              const c = STATUS_CONFIG[s] || STATUS_CONFIG.pending
              return (
                <button key={s} onClick={() => onStatusChange(s)} style={{
                  padding: '10px 8px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
                  border: `2px solid ${booking.status === s ? '#00C896' : '#E8E8E8'}`,
                  background: booking.status === s ? 'rgba(0,200,150,0.1)' : '#EEEEEE',
                  color: booking.status === s ? '#00C896' : '#6B6B6B',
                  fontWeight: booking.status === s ? 600 : 400
                }}>{c.icon} {s.charAt(0).toUpperCase() + s.slice(1)}</button>
              )
            })}
          </div>
        </div>

        {/* Progress timeline */}
        <div style={{ background: '#EEEEEE', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Service Progress</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {progressSteps.map((step, i) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: step.done ? '#00C896' : '#E4E4E4', border: `2px solid ${step.done ? '#00C896' : '#E8E8E8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: step.done ? '#FFFFFF' : '#9E9E9E', fontWeight: 700 }}>
                  {step.done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 13, color: step.done ? '#000000' : '#9E9E9E', fontWeight: step.done ? 500 : 400 }}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── REVENUE STATS ─────────────────────────────────────────
function RevenueStats({ bookings }) {
  const byService = SERVICES.map(s => ({
    ...s,
    count: bookings.filter(b => b.service_id === s.id).length,
    revenue: bookings.filter(b => b.service_id === s.id && b.payment_status === 'paid').reduce((sum, b) => sum + (b.amount || 0), 0)
  })).filter(s => s.count > 0).sort((a, b) => b.revenue - a.revenue)

  const byProvince = Object.entries(bookings.reduce((acc, b) => {
    acc[b.province] = acc[b.province] || { count: 0, revenue: 0 }
    acc[b.province].count++
    if (b.payment_status === 'paid') acc[b.province].revenue += b.amount || 0
    return acc
  }, {})).sort((a, b) => b[1].revenue - a[1].revenue)

  const maxRevenue = Math.max(...byService.map(s => s.revenue), 1)
  const maxProv = Math.max(...byProvince.map(([, v]) => v.revenue), 1)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px,1fr))', gap: 20 }}>
      {/* Revenue by service */}
      <div style={{ background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: 15, marginBottom: 20, color: '#6B6B6B', fontFamily: 'DM Sans' }}>Revenue by Service</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {byService.map(s => (
            <div key={s.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#6B6B6B' }}>{s.icon} {s.name}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 13, color: '#000000', fontWeight: 600 }}>{formatCurrency(s.revenue)}</span>
                  <span style={{ fontSize: 11, color: '#9E9E9E', marginLeft: 8 }}>{s.count} bookings</span>
                </div>
              </div>
              <div style={{ height: 6, background: '#EEEEEE', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${(s.revenue / maxRevenue) * 100}%`, background: 'linear-gradient(90deg,#00C896,#00E5B0)', borderRadius: 3, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue by province */}
      <div style={{ background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: 15, marginBottom: 20, color: '#6B6B6B', fontFamily: 'DM Sans' }}>Revenue by Province</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {byProvince.map(([province, data]) => (
            <div key={province}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#6B6B6B' }}>{province}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 13, color: '#000000', fontWeight: 600 }}>{formatCurrency(data.revenue)}</span>
                  <span style={{ fontSize: 11, color: '#9E9E9E', marginLeft: 8 }}>{data.count} bookings</span>
                </div>
              </div>
              <div style={{ height: 6, background: '#EEEEEE', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${(data.revenue / maxProv) * 100}%`, background: 'linear-gradient(90deg,#276EF1,#5B93F5)', borderRadius: 3, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 16, padding: 24, gridColumn: 'span 2' }}>
        <h3 style={{ fontSize: 15, marginBottom: 20, color: '#6B6B6B', fontFamily: 'DM Sans' }}>Recent Bookings</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 10, overflow: 'hidden' }}>
          {bookings.slice(0, 8).map((b, i) => {
            const conf = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending
            return (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: i % 2 === 0 ? '#F2F2F2' : 'transparent', flexWrap: 'wrap' }}>
                <ServiceBadge id={b.service_id} size={32} iconSize={16} />
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#000000' }}>{b.contact_name}</div>
                  <div style={{ fontSize: 12, color: '#9E9E9E' }}>{b.service_name} · {b.city}</div>
                </div>
                <span className={`badge ${conf.color}`} style={{ fontSize: 11 }}>{conf.label}</span>
                <span style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter', fontSize: 14 }}>{formatCurrency(b.amount)}</span>
                <span style={{ fontSize: 11, color: '#9E9E9E' }}>{new Date(b.created_at).toLocaleDateString('en-ZA')}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px', background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 16 }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <p style={{ color: '#6B6B6B', fontSize: 16 }}>{message}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#6B6B6B' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Loading bookings...
    </div>
  )
}
