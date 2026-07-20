import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Icon, ServiceBadge } from '../components/Icons'
import PinSpinner from '../components/PinSpinner'
import { SERVICES, PROVINCES, calculatePrice, formatCurrency } from '../data/services'
import { supabase } from '../lib/supabase'

const STEPS = ['Service', 'Details', 'Schedule', 'Payment', 'Confirmation']

export default function Book() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bookingId, setBookingId] = useState(null)

  const [form, setForm] = useState({
    serviceId: searchParams.get('service') || '',
    sqm: Math.max(10, Number(searchParams.get('sqm')) || 50),
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
      created_at: new Date().toISOString()
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

    try {
      // 1. Save booking first (as pending)
      const bId = await savePendingBooking()
      setBookingId(bId)

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

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Could not create payment session')
      }

      // 4. Redirect to Yoco hosted payment page
      window.location.href = data.redirectUrl

    } catch (err) {
      console.error('Payment error:', err)

      // If Netlify function not set up yet, fall back to demo mode
      if (err.message.includes('fetch') || err.message.includes('404') || err.message.includes('not configured')) {
        const bId = await savePendingBooking()
        setBookingId(bId)
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

        {/* STEP 1 — Service */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 8 }}>Choose a Service</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Select the type of cleaning you need</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14 }}>
              {SERVICES.map(service => (
                <button key={service.id} onClick={() => setVal('serviceId', service.id)} style={{
                  background: form.serviceId === service.id ? 'rgba(0,200,150,0.1)' : 'var(--tile)',
                  border: `2px solid ${form.serviceId === service.id ? '#00C896' : 'var(--border)'}`,
                  borderRadius: 14, padding: '20px 16px', textAlign: 'left', transition: 'all 0.2s', cursor: 'pointer'
                }}>
                  <div style={{ marginBottom: 10 }}><ServiceBadge id={service.id} size={48} iconSize={24} /></div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{service.name}</div>
                  <div style={{ fontSize: 13, color: '#00C896', fontWeight: 700 }}>R{service.pricePerSqm}/m²</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Details */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 8 }}>Property Details</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Tell us about the space to be cleaned</p>
            <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 500 }}>Property Size (m²)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input type="range" min={selectedService?.minSqm||10} max={2000} value={form.sqm}
                  onChange={e => setVal('sqm', Number(e.target.value))} style={{ flex: 1, accentColor: '#00C896' }} />
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  <input type="number" value={form.sqm} min={selectedService?.minSqm||10}
                    onChange={e => setVal('sqm', Math.max(selectedService?.minSqm||10, Number(e.target.value)))}
                    style={{ width: 80, background: 'var(--tile-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, color: 'var(--text)', fontSize: 16, textAlign: 'center', fontWeight: 700 }} />
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>m²</div>
                </div>
              </div>
              <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--tile-2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Estimated Total</span>
                <span style={{ color: '#00C896', fontSize: 22, fontWeight: 800, fontFamily: 'Inter' }}>{formatCurrency(price)}</span>
              </div>
            </div>
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

            {/* Pay button */}
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
          </div>
        )}

        {/* STEP 5 — Confirmation (demo/fallback only) */}
        {step === 5 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px', background: 'linear-gradient(135deg,#00C896,#00A87E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✓</div>
            <h2 style={{ fontSize: 32, marginBottom: 12 }}>Booking Received!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, marginBottom: 24 }}>
              Your booking has been saved. Complete payment to confirm.
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
        {step < 5 && (
          <div className="book-cta-bar">
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')} aria-label="Back" style={{
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
                  {loading ? <><PinSpinner size={20} variant="mono" /> Processing…</> : 'Pay with Yoco'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
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
