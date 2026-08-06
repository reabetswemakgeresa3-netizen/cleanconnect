import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Icon } from '../components/Icons'
import { TAB_ICON } from './admin/shared'
import Overview from './admin/Overview'
import BookingsTab from './admin/BookingsTab'
import CustomersTab from './admin/CustomersTab'
import WorkersTab from './admin/WorkersTab'
import BroadcastTab from './admin/BroadcastTab'
import MessagesTab from './admin/MessagesTab'
import FinancialsTab from './admin/FinancialsTab'
import SystemHealthTab from './admin/SystemHealthTab'

const CLEANERS = ['Zanele Dlamini', 'Sipho Nkosi', 'Fatima Mokoena', 'Thabo Sithole', 'Nomsa Khumalo', 'Kagiso Molefe']

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'customers', label: 'Customers' },
  { id: 'workers', label: 'Workers' },
  { id: 'broadcast', label: 'Job Broadcast' },
  { id: 'messages', label: 'Messages' },
  { id: 'financials', label: 'Financials' },
  { id: 'health', label: 'System Health' },
]

export default function Admin() {
  const [bookings, setBookings] = useState([])
  const [cleanersList, setCleanersList] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [actionError, setActionError] = useState('')
  const [refundingId, setRefundingId] = useState(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    setFetchError('')
    try {
      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setBookings(data || [])
      const { data: cleanerRows } = await supabase.from('cleaners').select('*')
      if (cleanerRows) setCleanersList(cleanerRows)
    } catch (err) {
      setFetchError(err.message || 'Could not load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Registered workers from the DB; falls back to the demo name list
  const cleanerOptions = cleanersList.length ? cleanersList : CLEANERS.map(name => ({ id: null, name }))

  const assignCleaner = (bookingId, name) => {
    const c = cleanerOptions.find(o => o.name === name)
    updateBooking(bookingId, { cleaner_assigned: name || null, cleaner_id: c?.id ?? null })
  }

  const processRefund = async (bookingId) => {
    setRefundingId(bookingId)
    setActionError('')
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', { body: { bookingId } })
      if (error) throw new Error(data?.error || error.message || 'Could not process the refund.')
      if (data?.error) throw new Error(data.error)
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, payment_status: 'refunded' } : b))
      if (selectedBooking?.id === bookingId) setSelectedBooking(prev => ({ ...prev, payment_status: 'refunded' }))
    } catch (err) {
      setActionError(err.message || 'Could not process the refund.')
    } finally {
      setRefundingId(null)
    }
  }

  const updateBooking = async (id, updates) => {
    const previous = bookings.find(b => b.id === id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    if (selectedBooking?.id === id) setSelectedBooking(prev => ({ ...prev, ...updates }))
    setActionError('')
    try {
      const { error } = await supabase.from('bookings').update(updates).eq('id', id)
      if (error) throw error
      if (updates.status) {
        await supabase.functions.invoke('send-whatsapp', {
          body: { type: 'status_update', booking: { ...previous, ...updates }, customerPhone: previous?.contact_phone, customerName: previous?.contact_name }
        }).catch(() => {})
      }
    } catch (err) {
      if (previous) {
        setBookings(prev => prev.map(b => b.id === id ? previous : b))
        if (selectedBooking?.id === id) setSelectedBooking(previous)
      }
      setActionError(err.message || 'That update failed. Please try again.')
    }
  }

  const updateCleaner = async (id, updates) => {
    const previous = cleanersList.find(c => c.id === id)
    setCleanersList(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    setActionError('')
    try {
      const { error } = await supabase.from('cleaners').update(updates).eq('id', id)
      if (error) throw error
    } catch (err) {
      if (previous) setCleanersList(prev => prev.map(c => c.id === id ? previous : c))
      setActionError(err.message || 'That update failed. Please try again.')
    }
  }

  const forceAssignBroadcastJob = async (bookingId, cleanerId, cleanerName) => {
    setActionError('')
    const updates = { job_status: 'accepted', accepted_by: cleanerId, cleaner_id: cleanerId, cleaner_assigned: cleanerName, status: 'confirmed' }
    const previous = bookings.find(b => b.id === bookingId)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updates } : b))
    try {
      const { error } = await supabase.from('bookings').update(updates).eq('id', bookingId)
      if (error) throw error
      supabase.functions.invoke('send-whatsapp', {
        body: { type: 'job_accepted', booking: { ...previous, ...updates }, customerPhone: previous?.contact_phone, customerName: previous?.contact_name }
      }).catch(() => {})
    } catch (err) {
      if (previous) setBookings(prev => prev.map(b => b.id === bookingId ? previous : b))
      setActionError(err.message || 'Could not force-assign this job.')
    }
  }

  const unassignedCount = bookings.filter(b => !b.cleaner_assigned && !['completed', 'cancelled'].includes(b.status)).length
  const broadcastingCount = bookings.filter(b => b.job_status === 'broadcasting').length

  if (fetchError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 40px', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ marginBottom: 16 }}><Icon name="info" size={44} color="#E11900" /></div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Couldn't load data</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{fetchError}</p>
          <button onClick={fetchData} className="btn-primary" style={{ padding: '12px 24px' }}>Try Again</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 68, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px 80px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 30, marginBottom: 4 }}>Operations Centre</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>CleanConnect Admin · {bookings.length} total bookings</p>
          </div>
          <button onClick={fetchData} style={{ background: 'var(--tile)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>
            Refresh Data
          </button>
        </div>

        {actionError && (
          <div style={{ background: 'rgba(225,25,0,0.1)', border: '1px solid rgba(225,25,0,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, color: '#E11900', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            {actionError}
            <button onClick={() => setActionError('')} style={{ background: 'none', border: 'none', color: '#E11900', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, flexWrap: 'wrap' }}>
          {TABS.map(t => {
            const count = t.id === 'unassigned' ? unassignedCount : t.id === 'broadcast' ? broadcastingCount : undefined
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: activeTab === t.id ? '#00C896' : 'transparent',
                color: activeTab === t.id ? '#FFFFFF' : 'var(--text-muted)',
                fontSize: 12.5, fontWeight: activeTab === t.id ? 600 : 400, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                <Icon name={TAB_ICON[t.id === 'unassigned' ? 'bookings' : t.id] || 'clipboard'} size={14} color={activeTab === t.id ? '#FFFFFF' : 'var(--text-dim)'} />
                {t.label}
                {!!count && (
                  <span style={{ background: activeTab === t.id ? 'rgba(0,0,0,0.15)' : 'rgba(225,25,0,0.15)', color: activeTab === t.id ? '#FFFFFF' : '#E11900', borderRadius: 100, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Loading operations data…</div>
        ) : (
          <>
            {activeTab === 'overview' && <Overview bookings={bookings} cleaners={cleanersList} />}
            {activeTab === 'bookings' && (
              <BookingsTab
                bookings={bookings} loading={loading} cleanerOptions={cleanerOptions}
                updateBooking={updateBooking} assignCleaner={assignCleaner}
                processRefund={processRefund} refundingId={refundingId}
                selectedBooking={selectedBooking} setSelectedBooking={setSelectedBooking}
              />
            )}
            {activeTab === 'unassigned' && (
              <BookingsTab
                bookings={bookings} loading={loading} cleanerOptions={cleanerOptions}
                updateBooking={updateBooking} assignCleaner={assignCleaner}
                processRefund={processRefund} refundingId={refundingId}
                selectedBooking={selectedBooking} setSelectedBooking={setSelectedBooking}
                highlightUnassigned
              />
            )}
            {activeTab === 'customers' && <CustomersTab bookings={bookings} />}
            {activeTab === 'workers' && <WorkersTab cleaners={cleanersList} bookings={bookings} loading={loading} updateCleaner={updateCleaner} />}
            {activeTab === 'broadcast' && <BroadcastTab bookings={bookings} cleanerOptions={cleanerOptions} onForceAssign={forceAssignBroadcastJob} />}
            {activeTab === 'messages' && <MessagesTab />}
            {activeTab === 'financials' && <FinancialsTab bookings={bookings} />}
            {activeTab === 'health' && <SystemHealthTab />}
          </>
        )}
      </div>
    </div>
  )
}
