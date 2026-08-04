import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../context/AuthContext'
import { Icon, ServiceBadge } from '../components/Icons'
import PinSpinner from '../components/PinSpinner'
import { SERVICES, PROVINCES, calculatePrice, formatCurrency } from '../data/services'
import { supabase } from '../lib/supabase'

const STEPS = ['Service', 'Details', 'Schedule', 'Payment', 'Confirmation']
const JHB = { lat: -26.2041, lng: 28.0473 }

// Customer position — small dark dot with white ring
const userDot = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:var(--text);border:3px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>',
  iconSize: [16, 16], iconAnchor: [8, 8]
})

// Nearby available cleaner — green dot
const availableDot = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#00C896;border:2.5px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,200,150,0.5)"></div>',
  iconSize: [14, 14], iconAnchor: [7, 7]
})

function Recenter({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.panTo([position.lat, position.lng], { animate: true })
  }, [position, map])
  return null
}

export default function Book() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1)
  const [preselectedCleaner, setPreselectedCleaner] = useState(null)

  // Coming from a cleaner's profile ("Book {name}") — carry that choice
  // through to the booking itself, so it actually reaches their portal
  // instead of silently landing as an unassigned job.
  useEffect(() => {
    const cleanerId = searchParams.get('cleaner')
    if (!cleanerId) return
    supabase.from('cleaners').select('id, name').eq('id', cleanerId).maybeSingle()
      .then(({ data }) => { if (data) setPreselectedCleaner(data) })
  }, [searchParams])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bookingId, setBookingId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('yoco')

  const [form, setForm] = useState({
    serviceId: searchParams.get('service') || 'residential',
    sqm: Math.max(10, Number(searchParams.get('sqm')) || 120),
    address: '', city: '', province: 'Gauteng',
    specialInstructions: '', date: '', timeSlot: '',
    contactName: user?.user_metadata?.full_name || '',
    contactPhone: user?.user_metadata?.phone || '',
  })

  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedService = SERVICES.find(s => s.id === form.serviceId)
  const price = selectedService ? calculatePrice(form.serviceId, form.sqm) : 0

  const TIME_SLOTS = ['07:00 – 09:00','09:00 – 11:00','11:00 – 13:00','13:00 – 15:00','15:00 – 17:00']
  const minDate = () => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0] }

  // Save pending booking to Supabase before redirecting to Yoco
  const savePendingBooking = async () => {
    const bookingData = {
      user_id: user.id,
      service_id: form.serviceId,
      service_name: selectedService?.name,
      sqm: form.sqm,
      address: form.address,
      city: form.city,
      province: form.province,
      special_instructions: form.specialInstructions,
      booking_date: form.date,
      time_slot: form.timeSlot,
      contact_name: form.contactName,
      contact_phone: form.contactPhone,
      amount: price,
      status: 'pending',
      payment_status: 'unpaid',
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      cleaner_id: preselectedCleaner?.id || null,
      cleaner_assigned: preselectedCleaner?.name || null
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single()

      return data?.id || ('CC-' + Math.random().toString(36).substr(2,8).toUpperCase())
    } catch {
      return 'CC-' + Math.random().toString(36).substr(2,8).toUpperCase()
    }
  }

  const handlePayment = async () => {
    setError('')
    setLoading(true)
    let bId

    try {
      // 1. Save booking first (as pending) — this succeeding is what actually
      // matters; everything below is just trying to hand off to Yoco.
      bId = await savePendingBooking()
      setBookingId(bId)

      // Cash bookings skip Yoco entirely — the cleaner collects payment on
      // completion (WorkerDashboard marks payment_status paid at that point).
      if (paymentMethod === 'cash') {
        setStep(5)
        return
      }

      // 2. Get site URL for redirects
      const siteUrl = window.location.origin

      // 3. Call our Netlify function to create Yoco checkout
      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price * 100, // Yoco uses cents
          currency: 'ZAR',
          successUrl: `${siteUrl}/booking-success?id=${bId}`,
          cancelUrl: `${siteUrl}/book?cancelled=true`,
          failureUrl: `${siteUrl}/book?failed=true`,
          metadata: {
            bookingId: bId,
            serviceName: selectedService?.name,
            customerName: form.contactName,
            customerPhone: form.contactPhone
          }
        })
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data || data.error) {
        throw new Error(data?.error || 'Could not create payment session')
      }

      // Save the checkout id now — it's what a later refund looks up the
      // payment by, and it's only ever available at this point in the flow.
      if (data.checkoutId) {
        await supabase.from('bookings').update({ payment_reference: data.checkoutId }).eq('id', bId)
      }

      // 4. Redirect to Yoco hosted payment page
      window.location.href = data.redirectUrl

    } catch (err) {
      console.error('Payment error:', err)

      // The booking itself is already saved above regardless of what the
      // payment gateway call did, so fall back to the confirmation screen
      // rather than stranding the customer on a raw error after their
      // booking already exists. Only show a real error if the booking save
      // itself failed (bId never got set).
      if (bId) {
        setStep(5)
      } else {
        setError(err.message || 'Payment failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const canNext = () => {
    if (step === 1) return !!form.serviceId
    if (step === 2) return form.address && form.city && form.contactName && form.contactPhone
    if (step === 3) return form.date && form.timeSlot
    return false
  }

  // Step 1 (choosing service + size on the map) owns its own full-height
  // layout and "Continue" action, so it skips the standard wrapper/progress
  // header/bottom cta-bar used by the rest of the flow.
  if (step === 1) {
    return (
      <ServiceMapStep
        serviceId={form.serviceId}
        sqm={form.sqm}
        onSelectService={id => setVal('serviceId', id)}
        onSqmChange={v => setVal('sqm', v)}
        onContinue={() => setStep(2)}
        preselectedCleaner={preselectedCleaner}
      />
    )
  }

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 170px' }}>

        {/* Progress */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', position: 'relative' }}>
            {STEPS.map((s, i) => {
              const num = i+1; const done = num < step; const active = num === step
              return (
                <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {i > 0 && <div style={{ position: 'absolute', top: 14, right: '50%', left: '-50%', height: 2, background: done||active ? '#00C896' : 'var(--border)', transition: 'background 0.3s' }} />}
                  <div style={{ width: 28, height: 28, borderRadius: '50%', zIndex: 1, background: done ? '#00C896' : active ? 'transparent' : 'var(--tile-2)', border: `2px solid ${done||active ? '#00C896' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: done ? '#FFFFFF' : active ? '#00C896' : 'var(--text-dim)', fontWeight: 700 }}>
                    {done ? '✓' : num}
                  </div>
                  {step !== 5 && <div style={{ fontSize: 11, marginTop: 6, color: active ? '#00C896' : 'var(--text-dim)', fontWeight: active ? 600 : 400 }}>{s}</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* STEP 2 — Details */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 8 }}>Property Details</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Tell us about the space to be cleaned</p>
            <div style={{ display: 'grid', gap: 16 }}>
              <FormField label="Street Address"><input className="input-field" placeholder="123 Main Road" value={form.address} onChange={e => setVal('address', e.target.value)} /></FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="City / Town"><input className="input-field" placeholder="Johannesburg" value={form.city} onChange={e => setVal('city', e.target.value)} /></FormField>
                <FormField label="Province">
                  <select className="input-field" value={form.province} onChange={e => setVal('province', e.target.value)} style={{ cursor: 'pointer' }}>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </FormField>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Contact Name"><input className="input-field" placeholder="Your name" value={form.contactName} onChange={e => setVal('contactName', e.target.value)} /></FormField>
                <FormField label="Contact Phone"><input className="input-field" placeholder="072 123 4567" value={form.contactPhone} onChange={e => setVal('contactPhone', e.target.value)} /></FormField>
              </div>
              <FormField label="Special Instructions (optional)">
                <textarea className="input-field" rows={3} placeholder="Gate code, pets, specific areas..." value={form.specialInstructions} onChange={e => setVal('specialInstructions', e.target.value)} style={{ resize: 'vertical' }} />
              </FormField>
            </div>
          </div>
        )}

        {/* STEP 3 — Schedule */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 8 }}>Pick a Date & Time</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Choose when you'd like us to arrive</p>
            <FormField label="Preferred Date">
              <input className="input-field" type="date" min={minDate()} value={form.date} onChange={e => setVal('date', e.target.value)} />
            </FormField>
            <div style={{ marginTop: 24 }}>
              <label style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)', marginBottom: 14, fontWeight: 500 }}>Arrival Time Window</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12 }}>
                {TIME_SLOTS.map(slot => (
                  <button key={slot} onClick={() => setVal('timeSlot', slot)} style={{
                    padding: '14px 12px', borderRadius: 12,
                    border: `2px solid ${form.timeSlot === slot ? '#00C896' : 'var(--border)'}`,
                    background: form.timeSlot === slot ? 'rgba(0,200,150,0.1)' : 'var(--tile)',
                    color: form.timeSlot === slot ? '#00C896' : 'var(--text-muted)',
                    fontSize: 14, fontWeight: form.timeSlot === slot ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s'
                  }}>{slot}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — Payment */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 8 }}>Review & Pay</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Confirm your booking then pay securely via Yoco</p>

            {/* Summary card */}
            <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Booking Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SummaryRow label="Service" value={selectedService?.name} />
                <SummaryRow label="Property Size" value={`${form.sqm} m²`} />
                <SummaryRow label="Address" value={`${form.address}, ${form.city}`} />
                <SummaryRow label="Province" value={form.province} />
                <SummaryRow label="Date" value={new Date(form.date+'T00:00:00').toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} />
                <SummaryRow label="Time" value={form.timeSlot} />
                {form.specialInstructions && <SummaryRow label="Notes" value={form.specialInstructions} />}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Total Amount</span>
                  <span style={{ color: '#00C896', fontWeight: 800, fontSize: 28, fontFamily: 'Inter' }}>{formatCurrency(price)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(225,25,0,0.1)', border: '1px solid rgba(225,25,0,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#E11900', fontSize: 14 }}>
                {error}
              </div>
            )}

            {/* Payment method selector */}
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 12 }}>Payment Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <button onClick={() => setPaymentMethod('yoco')} style={{
                padding: '16px 14px', borderRadius: 14, textAlign: 'left',
                border: `2px solid ${paymentMethod === 'yoco' ? '#00C896' : 'var(--border)'}`,
                background: paymentMethod === 'yoco' ? 'rgba(0,200,150,0.1)' : 'var(--tile)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}>
                <Icon name="lock" size={22} color={paymentMethod === 'yoco' ? '#00C896' : 'var(--text-muted)'} />
                <div style={{ fontWeight: 600, color: paymentMethod === 'yoco' ? '#00C896' : 'var(--text)', fontSize: 14, marginTop: 8 }}>Pay Online</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Card, EFT or SnapScan via Yoco</div>
              </button>
              <button onClick={() => setPaymentMethod('cash')} style={{
                padding: '16px 14px', borderRadius: 14, textAlign: 'left',
                border: `2px solid ${paymentMethod === 'cash' ? '#00C896' : 'var(--border)'}`,
                background: paymentMethod === 'cash' ? 'rgba(0,200,150,0.1)' : 'var(--tile)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}>
                <Icon name="wallet" size={22} color={paymentMethod === 'cash' ? '#00C896' : 'var(--text-muted)'} />
                <div style={{ fontWeight: 600, color: paymentMethod === 'cash' ? '#00C896' : 'var(--text)', fontSize: 14, marginTop: 8 }}>Cash on Completion</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Pay your cleaner directly when the job is done</div>
              </button>
            </div>

            {/* Payment details */}
            {paymentMethod === 'yoco' ? (
              <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <Icon name="lock" size={26} color="#00C896" />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 16 }}>Secure Payment via Yoco</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>You'll be redirected to Yoco's secure payment page</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                  {['Visa / Mastercard', 'Instant EFT', 'SnapScan'].map(m => (
                    <span key={m} style={{ background: 'var(--tile-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{m}</span>
                  ))}
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                  Powered by Yoco · PCI DSS Compliant · 256-bit SSL
                </p>
              </div>
            ) : (
              <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Icon name="wallet" size={26} color="#00C896" />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 16 }}>Cash on Completion</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Have the exact amount ready for your cleaner</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                  Your booking is confirmed immediately — no online payment is needed now.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 5 — Confirmation (demo/fallback only) */}
        {step === 5 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px', background: 'linear-gradient(135deg,#00C896,#00A87E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✓</div>
            <h2 style={{ fontSize: 32, marginBottom: 12 }}>Booking Received!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, marginBottom: 24 }}>
              {paymentMethod === 'cash'
                ? 'Your booking is confirmed. Have the exact cash amount ready for your cleaner on the day.'
                : 'Your booking has been saved. Complete payment to confirm.'}
            </p>
            <div style={{ display: 'inline-block', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: 12, padding: '10px 24px', marginBottom: 32 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Booking ID: </span>
              <span style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter' }}>{bookingId}</span>
            </div>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/dashboard" className="btn-primary">View My Bookings →</Link>
              <Link to="/book" className="btn-outline">Book Another</Link>
            </div>
          </div>
        )}

        {/* Bottom sheet CTA — price + action pinned to bottom, like Uber's ride confirmation */}
        {step > 1 && step < 5 && (
          <div className="book-cta-bar">
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => setStep(s => s - 1)} aria-label="Back" style={{
                width: 48, height: 48, borderRadius: '50%', background: 'var(--tile)',
                color: 'var(--text)', fontSize: 18, flexShrink: 0, fontWeight: 700
              }}>←</button>
              {selectedService && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {step === 4 ? 'Total to pay' : 'Estimated total'}
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                    {formatCurrency(price)}
                  </div>
                </div>
              )}
              {step < 4 ? (
                <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="btn-primary"
                  style={{ flex: selectedService ? 'none' : 1, padding: '15px 30px', fontSize: 16 }}>
                  Continue
                </button>
              ) : (
                <button onClick={handlePayment} disabled={loading} className="btn-primary"
                  style={{ padding: '15px 26px', fontSize: 16 }}>
                  {loading
                    ? <><PinSpinner size={20} variant="mono" /> Processing…</>
                    : paymentMethod === 'cash' ? 'Confirm Cash Booking' : 'Pay with Yoco'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── STEP 1 — pick a service + property size on a live map of nearby cleaners ──
function ServiceMapStep({ serviceId, sqm, onSelectService, onSqmChange, onContinue, preselectedCleaner }) {
  const [geoCity, setGeoCity] = useState('Johannesburg')
  const [userPos, setUserPos] = useState(JHB)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [nearby, setNearby] = useState([])

  const service = SERVICES.find(s => s.id === serviceId)
  const price = calculatePrice(serviceId, sqm)

  // Locate the user and label their city (fallback stays Johannesburg)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const pos = { lat: coords.latitude, lng: coords.longitude }
      setUserPos(pos)
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.lat}&lon=${pos.lng}`)
        const j = await r.json()
        const a = j.address || {}
        const label = a.city || a.town || a.suburb || a.village || a.county
        if (label) setGeoCity(label)
      } catch { /* keep fallback city */ }
    }, () => {}, { timeout: 8000 })
  }, [])

  // Show available cleaners around the user as green dots
  useEffect(() => {
    let cancelled = false
    supabase.from('cleaners')
      .select('id, current_lat, current_lng')
      .eq('available', true).not('current_lat', 'is', null).limit(20)
      .then(({ data }) => {
        if (cancelled) return
        if (data?.length) {
          setNearby(data.map(c => ({ id: c.id, lat: c.current_lat, lng: c.current_lng })))
        } else {
          // Nothing sharing a location yet — sprinkle indicative dots nearby
          const offsets = [[0.010, 0.007], [-0.007, 0.011], [0.005, -0.010], [-0.011, -0.005], [0.014, -0.002]]
          setNearby(offsets.map(([dLat, dLng], i) => ({ id: `demo-${i}`, lat: userPos.lat + dLat, lng: userPos.lng + dLng })))
        }
      })
    return () => { cancelled = true }
  }, [userPos])

  return (
    <div className="home-screen">
      {/* Location card */}
      <div style={{
        margin: '14px 20px 10px', background: 'var(--surface)', borderRadius: 16,
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)',
        padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,200,150,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#00C896">
            <path d="M12 2C7.6 2 4 5.6 4 10c0 5.3 7 11.6 7.3 11.9a1 1 0 0 0 1.4 0C13 21.6 20 15.3 20 10c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 1 }}>Your Location</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{geoCity}</div>
        </div>
      </div>

      {/* Confirms the customer's cleaner choice actually carried through from the profile page */}
      {preselectedCleaner && (
        <div style={{
          margin: '0 20px 10px', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.3)',
          borderRadius: 14, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <Icon name="checkCircle" size={17} color="#00C896" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>
            Booking with {preselectedCleaner.name}
          </span>
        </div>
      )}

      {/* Map hero with bottom sheet */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <MapContainer
          className="app-map"
          center={[userPos.lat, userPos.lng]} zoom={14}
          zoomControl={false} scrollWheelZoom={false}
          style={{ height: '100%', width: '100%', background: 'var(--tile-2)' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter position={userPos} />
          <Marker position={[userPos.lat, userPos.lng]} icon={userDot} interactive={false} />
          {nearby.map(c => (
            <Marker key={c.id} position={[c.lat, c.lng]} icon={availableDot} interactive={false} />
          ))}
        </MapContainer>

        {/* Bottom sheet */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: 'var(--surface)', borderRadius: '24px 24px 0 0',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.14)', padding: '10px 20px 16px'
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 12px' }} />

          {/* Select Service */}
          <button onClick={() => setPickerOpen(true)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'transparent', padding: '4px 0 12px', borderBottom: '1px solid var(--border)', textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ServiceBadge id={serviceId} size={40} iconSize={20} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 2 }}>Select Service</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{service.name}</div>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Size stepper */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>How big is the space?</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => onSqmChange(Math.max(10, sqm - 10))} aria-label="Smaller" style={stepBtn}>−</button>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', minWidth: 64, textAlign: 'center' }}>{sqm} m²</span>
              <button onClick={() => onSqmChange(Math.min(2000, sqm + 10))} aria-label="Bigger" style={stepBtn}>+</button>
            </div>
          </div>

          {/* Estimated price */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '12px 0 14px' }}>
            <span style={{ fontSize: 14.5, color: 'var(--text-muted)', paddingBottom: 6 }}>Estimated Price</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#00C896', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {formatCurrency(price)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>R{service.pricePerSqm}/m²</div>
            </div>
          </div>

          <button onClick={onContinue} className="btn-primary"
            style={{ width: '100%', padding: 17, fontSize: 17, borderRadius: 16, justifyContent: 'center' }}>
            Continue
          </button>
        </div>
      </div>

      {/* Service picker sheet */}
      {pickerOpen && (
        <div onClick={() => setPickerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 640, margin: '0 auto', background: 'var(--surface)',
            borderRadius: '24px 24px 0 0', padding: `14px 20px calc(20px + var(--sab))`, maxHeight: '70vh', overflowY: 'auto'
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: 19, marginBottom: 10 }}>Select Service</h3>
            {SERVICES.map(s => (
              <button key={s.id} onClick={() => { onSelectService(s.id); setPickerOpen(false) }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 4px',
                background: 'transparent', borderBottom: '1px solid var(--border)', textAlign: 'left'
              }}>
                <ServiceBadge id={s.id} size={40} iconSize={20} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>R{s.pricePerSqm}/m² · min {s.minSqm} m²</div>
                </div>
                {s.id === serviceId && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00C896" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const stepBtn = {
  width: 34, height: 34, borderRadius: '50%', background: 'var(--tile)',
  border: '1px solid var(--border)', color: 'var(--text)', fontSize: 18, fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
}

function FormField({ label, children }) {
  return <div><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 7 }}>{label}</label>{children}</div>
}

function SummaryRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 14, flexShrink: 0 }}>{label}</span>
      <span style={{ color: highlight ? '#00C896' : 'var(--text)', fontSize: 14, fontWeight: highlight ? 700 : 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
