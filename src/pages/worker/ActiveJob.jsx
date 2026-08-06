import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Icon, ServiceBadge } from '../../components/Icons'
import PinSpinner from '../../components/PinSpinner'
import { formatCurrency } from '../../data/services'

const destinationIcon = L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:#E11900;border:3px solid #FFFFFF;box-shadow:0 4px 12px rgba(0,0,0,0.35)"></div>`,
  iconSize: [36, 36], iconAnchor: [18, 34]
})

const cleanerIcon = L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#00C896,#00A87E);border:3px solid #FFFFFF;box-shadow:0 3px 10px rgba(0,0,0,0.35)"></div>`,
  iconSize: [30, 30], iconAnchor: [15, 15]
})

// A step further along than 'accepted' in the flow — used to drive the
// progressive-disclosure status button and progress dots.
const STEP_ORDER = ['accepted', 'en-route', 'in-progress', 'completed']

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 2) {
      map.fitBounds(points, { padding: [40, 40] })
    } else if (points.length === 1) {
      map.setView(points[0], 14)
    }
  }, [points, map])
  return null
}

async function geocodeAddress(query) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`)
    const data = await res.json()
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { /* fall through to null */ }
  return null
}

export default function ActiveJob() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [cleaner, setCleaner] = useState(null)
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [destination, setDestination] = useState(undefined) // undefined = loading, null = failed, {lat,lng}
  const [updating, setUpdating] = useState(false)
  const [actionError, setActionError] = useState('')

  const watchRef = useRef(null)
  const lastSentRef = useRef(0)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: cleanerRow } = await supabase.from('cleaners').select('*').eq('user_id', user.id).maybeSingle()
    if (!cleanerRow) { setNotFound(true); setLoading(false); return }
    setCleaner(cleanerRow)

    const { data: bookingRow } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle()
    if (!bookingRow || bookingRow.cleaner_id !== cleanerRow.id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setBooking(bookingRow)
    setLoading(false)
  }, [user.id, bookingId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Geocode the destination once the booking loads, caching the result back
  // onto the booking row so later opens (and the Uber deep link) don't need
  // to re-hit Nominatim every time.
  useEffect(() => {
    if (!booking) return
    if (booking.lat != null && booking.lng != null) {
      setDestination({ lat: booking.lat, lng: booking.lng })
      return
    }
    let cancelled = false
    setDestination(undefined)
    geocodeAddress(`${booking.address}, ${booking.city}, ${booking.province}, South Africa`)
      .then(pos => {
        if (cancelled) return
        setDestination(pos)
        if (pos) supabase.from('bookings').update({ lat: pos.lat, lng: pos.lng }).eq('id', booking.id).then(() => {})
      })
    return () => { cancelled = true }
  }, [booking?.lat, booking?.lng, booking?.address, booking?.city, booking?.province, booking?.id])

  // Live-updates the booking if it changes elsewhere (e.g. Admin intervenes)
  useEffect(() => {
    if (!booking) return
    const channel = supabase
      .channel(`active-job-${booking.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${booking.id}` },
        payload => setBooking(prev => ({ ...prev, ...payload.new })))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [booking?.id])

  const stopLocationSharing = useCallback(() => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = null
  }, [])

  // A ref (not the `cleaner` state value) so this callback stays stable
  // across every position tick — depending on the whole `cleaner` object
  // would recreate the callback (and, transitively, restart the watch) on
  // every single update, since we also update `cleaner` from inside it.
  const cleanerIdRef = useRef(null)
  useEffect(() => { cleanerIdRef.current = cleaner?.id ?? null }, [cleaner?.id])

  const startLocationSharing = useCallback(() => {
    if (!navigator.geolocation || watchRef.current != null || !cleanerIdRef.current) return
    watchRef.current = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        // Update our own map immediately — writing to the DB alone wouldn't
        // reflect back here, since this device isn't subscribed to its own
        // cleaner row (customers watching us are, via LiveTrackingMap).
        setCleaner(prev => prev && ({ ...prev, current_lat: coords.latitude, current_lng: coords.longitude }))
        const now = Date.now()
        if (now - lastSentRef.current < 10000) return
        lastSentRef.current = now
        await supabase.from('cleaners').update({
          current_lat: coords.latitude, current_lng: coords.longitude, location_updated_at: new Date().toISOString()
        }).eq('id', cleanerIdRef.current)
      },
      () => { /* silently fine — the map just won't show a live cleaner pin */ },
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
  }, [])

  // Resume sharing automatically if we land here mid-job (e.g. a fresh page
  // load) and the job is already past "accepted".
  useEffect(() => {
    if (booking && ['en-route', 'in-progress'].includes(booking.job_status)) startLocationSharing()
    return stopLocationSharing
  }, [booking?.job_status, startLocationSharing, stopLocationSharing])

  const sendCustomerUpdate = (type) => {
    supabase.functions.invoke('send-whatsapp', {
      body: { type, booking, customerPhone: booking.contact_phone, customerName: booking.contact_name }
    }).catch(() => {})
  }

  const markEnRoute = async () => {
    setUpdating(true)
    setActionError('')
    try {
      const { error } = await supabase.from('bookings').update({ job_status: 'en-route' }).eq('id', booking.id)
      if (error) throw error
      setBooking(prev => ({ ...prev, job_status: 'en-route' }))
      startLocationSharing()
      sendCustomerUpdate('en_route')
    } catch (err) {
      setActionError(err.message || 'Could not update the job. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const markArrived = async () => {
    setUpdating(true)
    setActionError('')
    try {
      const { error } = await supabase.from('bookings').update({ job_status: 'in-progress' }).eq('id', booking.id)
      if (error) throw error
      setBooking(prev => ({ ...prev, job_status: 'in-progress' }))
      sendCustomerUpdate('arrived')
    } catch (err) {
      setActionError(err.message || 'Could not update the job. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const markCompleted = async () => {
    setUpdating(true)
    setActionError('')
    try {
      // Cash jobs have no online payment step — completion is when the
      // cleaner actually collects the money, so mark it paid at that point.
      const updates = { job_status: 'completed', status: 'completed' }
      if (booking.payment_method === 'cash') updates.payment_status = 'paid'
      const { error } = await supabase.from('bookings').update(updates).eq('id', booking.id)
      if (error) throw error
      stopLocationSharing()
      sendCustomerUpdate('job_completed')
      navigate('/worker', { state: { justCompleted: { amount: booking.amount, serviceName: booking.service_name } } })
    } catch (err) {
      setActionError(err.message || 'Could not mark this job as done. Please try again.')
      setUpdating(false)
    }
  }

  if (loading) return <CenteredNote text="Loading job..." />
  if (notFound) return (
    <CenteredNote text="This job isn't yours to view, or it no longer exists.">
      <Link to="/worker" className="btn-primary" style={{ marginTop: 16 }}>Back to Worker Portal</Link>
    </CenteredNote>
  )

  const fullAddress = `${booking.address}, ${booking.city}, ${booking.province}`
  const cleanerPos = cleaner.current_lat != null ? { lat: cleaner.current_lat, lng: cleaner.current_lng } : null
  const points = [cleanerPos, destination].filter(Boolean).map(p => [p.lat, p.lng])

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`

  const uberNickname = `${booking.contact_name}'s booking`
  const uberQuery = destination
    ? `dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}&dropoff[formatted_address]=${encodeURIComponent(fullAddress)}&dropoff[nickname]=${encodeURIComponent(uberNickname)}`
    : `dropoff[formatted_address]=${encodeURIComponent(fullAddress)}`
  const uberDeepLink = `uber://?action=setPickup&pickup=my_location&${uberQuery}`
  const uberWebFallback = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&${uberQuery}`

  const requestUber = () => {
    let stillHere = true
    const onBlur = () => { stillHere = false }
    window.addEventListener('blur', onBlur)
    window.location.href = uberDeepLink
    setTimeout(() => {
      window.removeEventListener('blur', onBlur)
      if (stillHere) window.location.href = uberWebFallback
    }, 1500)
  }

  const currentStepIndex = STEP_ORDER.indexOf(booking.job_status)

  return (
    <div style={{ paddingTop: 68, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px 140px' }}>

        <button onClick={() => navigate('/worker')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: '8px 0', minHeight: 44
        }}>
          <Icon name="chevronLeft" size={16} color="var(--text-muted)" /> Worker Portal
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['Accepted', 'On the way', 'Cleaning', 'Done'].map((label, i) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={{ height: 5, borderRadius: 3, background: i <= currentStepIndex ? '#00C896' : 'var(--tile-2)', marginBottom: 6 }} />
              <div style={{ fontSize: 10.5, color: i <= currentStepIndex ? '#00C896' : 'var(--text-dim)', fontWeight: i === currentStepIndex ? 700 : 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Job details */}
        <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
            <ServiceBadge id={booking.service_id} size={48} iconSize={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 19, marginBottom: 3 }}>{booking.service_name}</h1>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{booking.contact_name}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Inter', color: '#00C896' }}>{formatCurrency(booking.amount)}</div>
              {booking.payment_method === 'cash' && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Cash on completion</div>}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6, fontSize: 13.5, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" size={13} color="var(--text-dim)" /> {booking.booking_date} · {booking.time_slot} · {booking.sqm} m²</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="user" size={13} color="var(--text-dim)" /> <a href={`tel:${booking.contact_phone?.replace(/\s/g, '')}`} style={{ color: '#276EF1' }}>{booking.contact_phone}</a></span>
            {booking.special_instructions && (
              <span style={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="fileText" size={13} color="var(--text-dim)" /> "{booking.special_instructions}"</span>
            )}
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Location</div>
          <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ height: 200, position: 'relative', background: 'var(--tile-2)' }}>
              {destination === undefined ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <PinSpinner size={28} />
                </div>
              ) : destination === null ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20, textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Couldn't locate this address on the map — use Get Directions below instead.</p>
                </div>
              ) : (
                <MapContainer className="app-map" center={[destination.lat, destination.lng]} zoom={14}
                  zoomControl={false} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />
                  {cleanerPos && <Marker position={[cleanerPos.lat, cleanerPos.lng]} icon={cleanerIcon} />}
                  {cleanerPos && (
                    <Polyline positions={[[cleanerPos.lat, cleanerPos.lng], [destination.lat, destination.lng]]}
                      pathOptions={{ color: '#00C896', weight: 3, dashArray: '6 8' }} />
                  )}
                  <FitBounds points={points} />
                </MapContainer>
              )}
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 13.5, color: 'var(--text)', marginBottom: 12 }}>{fullAddress}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={directionsUrl} target="_blank" rel="noreferrer" style={{
                  flex: 1, minWidth: 140, padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--tile-2)', color: 'var(--text)', fontSize: 13.5, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44
                }}>
                  <Icon name="navigation" size={15} color="var(--text)" /> Get Directions
                </a>
                <button onClick={requestUber} style={{
                  flex: 1, minWidth: 140, padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--tile-2)', color: 'var(--text)', fontSize: 13.5, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44
                }}>
                  <Icon name="car" size={15} color="var(--text)" /> Request Uber to Job
                </button>
              </div>
            </div>
          </div>
        </div>

        {actionError && (
          <div style={{ background: 'rgba(225,25,0,0.1)', border: '1px solid rgba(225,25,0,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#E11900', fontSize: 14 }}>
            {actionError}
          </div>
        )}
      </div>

      {/* Progressive status control, pinned above the bottom nav like the booking flow's CTA bar */}
      <div className="book-cta-bar">
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {booking.job_status === 'accepted' && (
            <button onClick={markEnRoute} disabled={updating} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 16, fontSize: 16 }}>
              {updating ? <PinSpinner size={20} variant="mono" /> : "I'm on my way"}
            </button>
          )}
          {booking.job_status === 'en-route' && (
            <button onClick={markArrived} disabled={updating} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 16, fontSize: 16 }}>
              {updating ? <PinSpinner size={20} variant="mono" /> : "I've arrived / Start cleaning"}
            </button>
          )}
          {booking.job_status === 'in-progress' && (
            <button onClick={markCompleted} disabled={updating} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 16, fontSize: 16 }}>
              {updating ? <PinSpinner size={20} variant="mono" /> : 'Mark job as done'}
            </button>
          )}
          {booking.job_status === 'completed' && (
            <div style={{ textAlign: 'center', padding: 14, color: '#00C896', fontWeight: 700 }}>✓ Job completed</div>
          )}
        </div>
      </div>
    </div>
  )
}

function CenteredNote({ text, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', paddingTop: 68 }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
        {text.includes('Loading') ? <PinSpinner size={40} style={{ marginBottom: 12 }} /> : null}
        <p>{text}</p>
        {children}
      </div>
    </div>
  )
}
