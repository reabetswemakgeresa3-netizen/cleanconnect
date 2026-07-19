import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { SERVICES, calculatePrice, formatCurrency } from '../data/services'
import Logo from '../components/Logo'

const JHB = { lat: -26.2041, lng: 28.0473 }

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// Customer position — small dark dot with white ring
const userDot = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#0D1117;border:3px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>',
  iconSize: [16, 16], iconAnchor: [8, 8]
})

// Nearby available cleaner — green dot
const availableDot = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#00C896;border:2.5px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,200,150,0.5)"></div>',
  iconSize: [14, 14], iconAnchor: [7, 7]
})

// Assigned cleaner — circular avatar inside a green pin shape
const cleanerPin = (avatarUrl) => L.divIcon({
  className: '',
  html: `<div style="width:52px;height:52px;background:#00C896;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:3px solid #FFFFFF;box-shadow:0 6px 18px rgba(0,0,0,0.28);">
    <div style="width:34px;height:34px;border-radius:50%;overflow:hidden;background:#FFFFFF;transform:rotate(45deg);display:flex;align-items:center;justify-content:center;font-size:18px;">
      ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" style="width:100%;height:100%;object-fit:cover" />` : '🧹'}
    </div>
  </div>`,
  iconSize: [52, 52], iconAnchor: [26, 63]
})

// Floating white card beside the cleaner marker
const cleanerCard = (name, rating, eta) => L.divIcon({
  className: '',
  html: `<div style="background:#FFFFFF;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,0.18);padding:10px 14px;white-space:nowrap;font-family:Inter,sans-serif;">
    <div style="font-weight:700;font-size:14px;color:#0D1117;">${escapeHtml(name)} <span style="color:#C46A00;">${escapeHtml(rating)} ★</span></div>
    <div style="color:#00C896;font-weight:600;font-size:12.5px;margin-top:2px;">Arriving in ${eta} mins</div>
  </div>`,
  iconSize: [0, 0], iconAnchor: [-16, 92]
})

function Recenter({ position, other }) {
  const map = useMap()
  useEffect(() => {
    if (other) {
      // Tracking mode: keep cleaner and customer both in view,
      // clear of the bottom sheet and the floating card.
      map.fitBounds([[position.lat, position.lng], [other.lat, other.lng]], {
        paddingTopLeft: [60, 110],
        paddingBottomRight: [60, 320],
        animate: true,
        maxZoom: 15
      })
    } else if (position) {
      map.panTo([position.lat, position.lng], { animate: true })
    }
  }, [position, other, map])
  return null
}

function etaMins(a, b) {
  const R = 6371, toRad = d => d * Math.PI / 180
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  const km = 2 * R * Math.asin(Math.sqrt(h))
  return Math.max(2, Math.min(45, Math.round(km / 25 * 60))) // ~25 km/h through town
}

export default function Home() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [city, setCity] = useState('Johannesburg')
  const [userPos, setUserPos] = useState(JHB)
  const [menuOpen, setMenuOpen] = useState(false)

  // Bottom sheet state
  const [serviceId, setServiceId] = useState('residential')
  const [sqm, setSqm] = useState(120)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Live tracking state
  const [active, setActive] = useState(null)        // { booking, cleaner }
  const [cleanerPos, setCleanerPos] = useState(null)
  const [nearby, setNearby] = useState([])

  const service = SERVICES.find(s => s.id === serviceId)
  const price = calculatePrice(serviceId, sqm)
  const bookTarget = user ? `/book?service=${serviceId}&sqm=${sqm}` : '/signup'

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
        if (label) setCity(label)
      } catch { /* keep fallback city */ }
    }, () => {}, { timeout: 8000 })
  }, [])

  // Active in-progress booking with an assigned cleaner → hero tracking mode
  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase.from('bookings')
      .select('id, cleaner_id, cleaner_assigned, status')
      .eq('user_id', user.id).eq('status', 'in-progress').not('cleaner_id', 'is', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(async ({ data: booking }) => {
        if (cancelled || !booking) return
        const { data: cleaner } = await supabase.from('cleaners')
          .select('id, name, rating, avatar_url, current_lat, current_lng')
          .eq('id', booking.cleaner_id).maybeSingle()
        if (cancelled || !cleaner) return
        setActive({ booking, cleaner })
        if (cleaner.current_lat != null) setCleanerPos({ lat: cleaner.current_lat, lng: cleaner.current_lng })
      })
    return () => { cancelled = true }
  }, [user])

  // Follow the assigned cleaner via the existing realtime channel
  useEffect(() => {
    const cleanerId = active?.cleaner?.id
    if (!cleanerId) return
    const channel = supabase
      .channel(`cleaner-location-${cleanerId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cleaners', filter: `id=eq.${cleanerId}` },
        (payload) => {
          const row = payload.new
          if (row?.current_lat != null) setCleanerPos({ lat: row.current_lat, lng: row.current_lng })
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [active?.cleaner?.id])

  // No active job → show available cleaners around the user as green dots
  useEffect(() => {
    if (active) return
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
  }, [active, userPos])

  const eta = cleanerPos ? etaMins(cleanerPos, userPos) : null

  return (
    <div className="home-screen">
      {/* ── Top bar: hamburger · logo · bell ─────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px' }}>
        <button onClick={() => setMenuOpen(true)} aria-label="Menu" style={iconBtn}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D1117" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Logo variant="mark" size={26} />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: '#0D1117' }}>
            Clean<span style={{ color: '#00C896' }}>Connect</span>
          </span>
        </Link>
        <Link to={user ? '/dashboard' : '/login'} aria-label="Notifications" style={{ ...iconBtn, position: 'relative' }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#0D1117" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          <span style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: '50%', background: '#00C896', border: '1.5px solid #FFFFFF' }} />
        </Link>
      </div>

      {/* ── Location card ────────────────────────────────────── */}
      <div style={{
        margin: '2px 20px 10px', background: '#FFFFFF', borderRadius: 16,
        border: '1px solid #F0F0F0', boxShadow: 'var(--shadow-card)',
        padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,200,150,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#00C896">
            <path d="M12 2C7.6 2 4 5.6 4 10c0 5.3 7 11.6 7.3 11.9a1 1 0 0 0 1.4 0C13 21.6 20 15.3 20 10c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 1 }}>Your Location</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0D1117', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city}</div>
        </div>
      </div>

      {/* ── "Where would you like…" row ──────────────────────── */}
      <Link to={user ? '/book' : '/signup'} style={{
        margin: '0 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#F6F6F6', borderRadius: 14, padding: '15px 16px'
      }}>
        <span style={{ fontSize: 14.5, fontWeight: 500, color: '#6B6B6B' }}>Where would you like cleaning service?</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D1117" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>

      {/* ── Map hero with bottom sheet ───────────────────────── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <MapContainer
          className="home-map"
          center={[userPos.lat, userPos.lng]} zoom={14}
          zoomControl={false} scrollWheelZoom={false}
          style={{ height: '100%', width: '100%', background: '#EEEEEE' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter position={userPos} other={active ? cleanerPos : null} />
          <Marker position={[userPos.lat, userPos.lng]} icon={userDot} interactive={false} />

          {active && cleanerPos ? (
            <>
              <Polyline
                positions={[[cleanerPos.lat, cleanerPos.lng], [userPos.lat, userPos.lng]]}
                pathOptions={{ color: '#007A5C', weight: 4, opacity: 0.9 }}
              />
              <Marker position={[cleanerPos.lat, cleanerPos.lng]} icon={cleanerPin(active.cleaner.avatar_url)} />
              <Marker
                position={[cleanerPos.lat, cleanerPos.lng]}
                icon={cleanerCard(active.cleaner.name, active.cleaner.rating ?? '5.0', eta)}
                interactive={false}
              />
            </>
          ) : (
            nearby.map(c => (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={availableDot} interactive={false} />
            ))
          )}
        </MapContainer>

        {/* Bottom sheet */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: '#FFFFFF', borderRadius: '24px 24px 0 0',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.14)', padding: '10px 20px 16px'
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E8E8', margin: '0 auto 12px' }} />

          {/* Select Service */}
          <button onClick={() => setPickerOpen(true)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'transparent', padding: '4px 0 12px', borderBottom: '1px solid #F0F0F0', textAlign: 'left'
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 2 }}>Select Service</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0D1117' }}>{service.icon} {service.name}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Size stepper */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid #F0F0F0' }}>
            <span style={{ fontSize: 14.5, color: '#6B6B6B' }}>How big is the space?</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setSqm(v => Math.max(10, v - 10))} aria-label="Smaller" style={stepBtn}>−</button>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0D1117', minWidth: 64, textAlign: 'center' }}>{sqm} m²</span>
              <button onClick={() => setSqm(v => Math.min(2000, v + 10))} aria-label="Bigger" style={stepBtn}>+</button>
            </div>
          </div>

          {/* Estimated price */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '12px 0 14px' }}>
            <span style={{ fontSize: 14.5, color: '#6B6B6B', paddingBottom: 6 }}>Estimated Price</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#00C896', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {formatCurrency(price)}
              </div>
              <div style={{ fontSize: 12, color: '#9E9E9E' }}>R{service.pricePerSqm}/m²</div>
            </div>
          </div>

          <button onClick={() => navigate(bookTarget)} className="btn-primary"
            style={{ width: '100%', padding: 17, fontSize: 17, borderRadius: 16, justifyContent: 'center' }}>
            Book Now
          </button>
        </div>
      </div>

      {/* ── Service picker sheet ─────────────────────────────── */}
      {pickerOpen && (
        <div onClick={() => setPickerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 640, margin: '0 auto', background: '#FFFFFF',
            borderRadius: '24px 24px 0 0', padding: `14px 20px calc(20px + var(--sab))`, maxHeight: '70vh', overflowY: 'auto'
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E8E8', margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: 19, marginBottom: 10 }}>Select Service</h3>
            {SERVICES.map(s => (
              <button key={s.id} onClick={() => { setServiceId(s.id); setPickerOpen(false) }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 4px',
                background: 'transparent', borderBottom: '1px solid #F5F5F5', textAlign: 'left'
              }}>
                <span style={{ fontSize: 24 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0D1117' }}>{s.name}</div>
                  <div style={{ fontSize: 12.5, color: '#9E9E9E' }}>R{s.pricePerSqm}/m² · min {s.minSqm} m²</div>
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

      {/* ── Hamburger menu drawer ────────────────────────────── */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1300 }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: 290, background: '#FFFFFF',
            padding: `calc(24px + var(--sat)) 22px calc(24px + var(--sab)) calc(22px + var(--sal))`,
            boxShadow: '8px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 22 }}>
              <Logo variant="tile" size={40} />
              <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: '#0D1117' }}>
                Clean<span style={{ color: '#00C896' }}>Connect</span>
              </span>
            </div>
            {[
              { to: '/services', label: 'Services', icon: '🧽' },
              { to: '/cleaners', label: 'Our Cleaners', icon: '⭐' },
              { to: user ? '/book' : '/signup', label: 'Book a Clean', icon: '🗓️' },
              { to: '/dashboard', label: 'My Bookings', icon: '📋' },
              { to: '/worker', label: 'Worker Portal', icon: '🧹' },
              { to: '/account', label: 'Account', icon: '👤' }
            ].map(item => (
              <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 10px',
                borderRadius: 12, fontSize: 15.5, fontWeight: 600, color: '#0D1117'
              }}>
                <span style={{ fontSize: 19 }}>{item.icon}</span> {item.label}
              </Link>
            ))}
            <div style={{ flex: 1 }} />
            {user ? (
              <button onClick={async () => { await signOut(); setMenuOpen(false) }} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 10px', background: 'transparent',
                borderRadius: 12, fontSize: 15.5, fontWeight: 600, color: '#E11900', textAlign: 'left'
              }}>
                <span style={{ fontSize: 19 }}>🚪</span> Sign Out
              </button>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-primary" style={{ justifyContent: 'center' }}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const iconBtn = {
  width: 42, height: 42, borderRadius: '50%', background: '#FFFFFF',
  border: '1px solid #F0F0F0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
}

const stepBtn = {
  width: 34, height: 34, borderRadius: '50%', background: '#F6F6F6',
  border: '1px solid #E8E8E8', color: '#0D1117', fontSize: 18, fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
}
