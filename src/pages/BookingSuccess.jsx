import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../data/services'

export default function BookingSuccess() {
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('id')
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    if (bookingId) {
      // Update booking to paid
      supabase.from('bookings')
        .update({ status: 'confirmed', payment_status: 'paid' })
        .eq('id', bookingId)
        .then(() => {
          // Fetch booking details to display
          return supabase.from('bookings').select('*').eq('id', bookingId).single()
        })
        .then(({ data }) => setBooking(data))
        .catch(console.error)
    }
  }, [bookingId])

  return (
    <div style={{ paddingTop: 68, minHeight: '100vh', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px' }}>
      <div style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
        {/* Success icon */}
        <div style={{ width: 90, height: 90, borderRadius: '50%', margin: '0 auto 28px', background: 'linear-gradient(135deg,#00C896,#00A87E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>✓</div>

        <h1 style={{ fontSize: 36, marginBottom: 12 }}>Payment Successful! 🎉</h1>
        <p style={{ color: '#7A8B9C', fontSize: 16, marginBottom: 32 }}>
          Your booking is confirmed and a cleaner will be assigned shortly.
        </p>

        {/* Booking ID */}
        <div style={{ display: 'inline-block', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: 12, padding: '12px 28px', marginBottom: 32 }}>
          <div style={{ color: '#7A8B9C', fontSize: 13, marginBottom: 4 }}>Booking Reference</div>
          <div style={{ color: '#00C896', fontWeight: 800, fontFamily: 'Syne', fontSize: 20 }}>{bookingId}</div>
        </div>

        {/* Booking details if loaded */}
        {booking && (
          <div style={{ background: '#161B22', border: '1px solid #2E3A4E', borderRadius: 16, padding: 24, textAlign: 'left', marginBottom: 32 }}>
            {[
              { label: 'Service', value: booking.service_name },
              { label: 'Date', value: booking.booking_date },
              { label: 'Time', value: booking.time_slot },
              { label: 'Address', value: `${booking.address}, ${booking.city}` },
              { label: 'Amount Paid', value: formatCurrency(booking.amount), green: true },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1E2530' }}>
                <span style={{ color: '#7A8B9C', fontSize: 14 }}>{row.label}</span>
                <span style={{ color: row.green ? '#00C896' : '#E8EDF4', fontSize: 14, fontWeight: row.green ? 700 : 500 }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/dashboard" className="btn-primary">View My Bookings →</Link>
          <Link to="/book" className="btn-outline">Book Another</Link>
        </div>
      </div>
    </div>
  )
}
