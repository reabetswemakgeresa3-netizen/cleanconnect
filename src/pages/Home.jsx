import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { SERVICES } from '../data/services'
import { Icon, ServiceBadge } from '../components/Icons'

const TILE_ORDER = ['residential', 'office', 'industrial', 'gardening', 'medical', 'carpet', 'postConstruction', 'event']
const TILE_LABELS = {
  residential: 'Home Clean', office: 'Office', industrial: 'Industrial', gardening: 'Garden',
  medical: 'Medical', carpet: 'Carpet', postConstruction: 'Post-Construction', event: 'Events'
}

const SLIDES = [
  {
    gradient: 'linear-gradient(135deg, #00E5B0 0%, #00C896 45%, #016B52 100%)',
    eyebrow: "SA's First On-Demand Cleaning App 🇿🇦",
    sub: 'Vetted cleaners at your door in hours',
    cta: 'Book your first clean'
  },
  {
    gradient: 'linear-gradient(150deg, #00C896 0%, #00795C 60%, #013C2E 100%)',
    eyebrow: 'Up to 60% Cheaper Than Market Rates 💚',
    sub: 'Home cleans from R5/m² — guaranteed lowest',
    cta: 'See prices'
  },
  {
    gradient: 'linear-gradient(120deg, #0D9488 0%, #00C896 50%, #004D3D 100%)',
    eyebrow: 'Track Your Cleaner Live 📍',
    sub: 'Watch them arrive in real time, Uber-style',
    cta: 'How it works'
  },
  {
    gradient: 'linear-gradient(160deg, #00C896 0%, #0D7A63 55%, #052E24 100%)',
    eyebrow: 'Become a Cleaner, Earn Daily 💼',
    sub: 'Join CleanConnect Workers and get jobs near you',
    cta: 'Start earning'
  }
]

const TRUST = [
  { icon: 'users', text: '500+ Vetted Cleaners' },
  { icon: 'star', text: '4.9★ Average Rating' },
  { icon: 'lock', text: 'Secure Yoco Payments 🔒' },
  { icon: 'pin', text: 'All 9 Provinces 🇿🇦' }
]

const HOW_IT_WORKS = [
  { icon: 'bucket', title: 'Choose a service', desc: 'Pick from 8 cleaning categories' },
  { icon: 'card', title: 'Book & pay securely', desc: 'Confirm details and pay via Yoco' },
  { icon: 'radio', title: 'Track your cleaner live', desc: 'Watch them arrive in real time' }
]

const JHB = { lat: -26.2041, lng: 28.0473 }

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const miniCleanerIcon = (avatarUrl) => L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;border-radius:50%;overflow:hidden;background:#00C896;border:2.5px solid #FFFFFF;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    ${avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" style="width:100%;height:100%;object-fit:cover" />`
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"><path d="M5 8.5h14l-1.7 10.6a2 2 0 0 1-2 1.7H8.7a2 2 0 0 1-2-1.7Z"/><path d="M7.5 8.5a4.5 4.5 0 0 1 9 0"/></svg>'}
  </div>`,
  iconSize: [30, 30], iconAnchor: [15, 15]
})

function etaMins(a, b) {
  const R = 6371, toRad = d => d * Math.PI / 180
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  const km = 2 * R * Math.asin(Math.sqrt(h))
  return Math.max(2, Math.min(45, Math.round(km / 25 * 60)))
}

function greetingWord() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// Staggered fade/slide-up entrance for each section, first load only
const fadeUp = (i) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: i * 0.09, ease: 'easeOut' }
})

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const howItWorksRef = useRef(null)

  const [[page, direction], setPage] = useState([0, 0])
  const [paused, setPaused] = useState(false)
  const slideIndex = ((page % SLIDES.length) + SLIDES.length) % SLIDES.length
  const paginate = (dir) => setPage(([p]) => [p + dir, dir])

  const [active, setActive] = useState(null) // { booking, cleaner }
  const [cleanerPos, setCleanerPos] = useState(null)
  const [userPos, setUserPos] = useState(JHB)

  // Auto-advance the hero carousel every 4s; pause while the user is touching it
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => paginate(1), 4000)
    return () => clearInterval(t)
  }, [paused])

  // Only needed to compute the active-booking ETA below — no location UI on this screen
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setUserPos({ lat: coords.latitude, lng: coords.longitude }),
      () => {}, { timeout: 8000 }
    )
  }, [])

  // If there's an in-progress booking with an assigned cleaner, surface it above the fold
  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase.from('bookings')
      .select('id, cleaner_id, status')
      .eq('user_id', user.id).eq('status', 'in-progress').not('cleaner_id', 'is', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(async ({ data: booking }) => {
        if (cancelled || !booking) return
        const { data: cleaner } = await supabase.from('cleaners')
          .select('id, name, avatar_url, current_lat, current_lng')
          .eq('id', booking.cleaner_id).maybeSingle()
        if (cancelled || !cleaner) return
        setActive({ booking, cleaner })
        if (cleaner.current_lat != null) setCleanerPos({ lat: cleaner.current_lat, lng: cleaner.current_lng })
      })
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    const cleanerId = active?.cleaner?.id
    if (!cleanerId) return
    const channel = supabase
      .channel(`home-cleaner-${cleanerId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cleaners', filter: `id=eq.${cleanerId}` },
        (payload) => {
          const row = payload.new
          if (row?.current_lat != null) setCleanerPos({ lat: row.current_lat, lng: row.current_lng })
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [active?.cleaner?.id])

  const ctaHandlers = [
    () => navigate(user ? '/book' : '/signup'),
    () => navigate('/services'),
    () => howItWorksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    () => navigate('/worker')
  ]

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '18px 20px 130px' }}>

        {/* Greeting */}
        <Motion.div {...fadeUp(0)} style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 26, letterSpacing: '-0.02em', marginBottom: 4 }}>
            {greetingWord()}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Ready for a spotless space?</p>
        </Motion.div>

        {/* Active booking card — only when there's a live job to show */}
        {active && (
          <Motion.div {...fadeUp(1)} style={{ marginBottom: 16 }}>
            <ActiveBookingCard cleaner={active.cleaner} cleanerPos={cleanerPos} userPos={userPos} />
          </Motion.div>
        )}

        {/* Hero slideshow */}
        <Motion.div {...fadeUp(2)} style={{ marginBottom: 28 }}>
          <div
            style={{ position: 'relative', height: 210, borderRadius: 20, overflow: 'hidden' }}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
          >
            <AnimatePresence initial={false} custom={direction}>
              <Motion.div
                key={page}
                custom={direction}
                initial={{ opacity: 0, x: direction >= 0 ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction >= 0 ? -50 : 50 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(e, info) => {
                  if (info.offset.x < -60) paginate(1)
                  else if (info.offset.x > 60) paginate(-1)
                }}
                style={{
                  position: 'absolute', inset: 0, borderRadius: 20,
                  background: SLIDES[slideIndex].gradient, padding: '24px 22px 20px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  overflow: 'hidden', cursor: 'grab', touchAction: 'pan-y'
                }}
              >
                <Bubbles />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.3, marginBottom: 8, letterSpacing: '-0.01em', maxWidth: 260 }}>
                    {SLIDES[slideIndex].eyebrow}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginBottom: 18, lineHeight: 1.5, maxWidth: 250 }}>
                    {SLIDES[slideIndex].sub}
                  </div>
                  <button onClick={() => ctaHandlers[slideIndex]()} style={{
                    background: '#FFFFFF', color: '#016B52', fontWeight: 700, fontSize: 13.5,
                    padding: '10px 18px', borderRadius: 100
                  }}>
                    {SLIDES[slideIndex].cta}
                  </button>
                </div>
              </Motion.div>
            </AnimatePresence>

            {/* Dot indicators */}
            <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, zIndex: 2 }}>
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => setPage([i, i > slideIndex ? 1 : -1])} aria-label={`Slide ${i + 1}`} style={{
                  width: i === slideIndex ? 18 : 6, height: 6, borderRadius: 3,
                  background: i === slideIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  transition: 'width 0.3s', padding: 0
                }} />
              ))}
            </div>
          </div>
        </Motion.div>

        {/* Quick services grid */}
        <Motion.div {...fadeUp(3)} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 19, marginBottom: 14 }}>What needs cleaning?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {TILE_ORDER.map(id => {
              const s = SERVICES.find(x => x.id === id)
              return (
                <Link key={id} to={user ? `/book?service=${id}` : '/signup'} className="tile" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ServiceBadge id={id} size={40} iconSize={20} />
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{TILE_LABELS[id]}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>from R{s.pricePerSqm}/m²</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </Motion.div>

        {/* Trust strip */}
        <Motion.div {...fadeUp(4)} style={{ marginBottom: 28 }}>
          <div className="hscroll">
            {TRUST.map(t => (
              <div key={t.text} style={{
                minWidth: 152, background: 'var(--tile)', borderRadius: 16, padding: '16px 14px',
                display: 'flex', flexDirection: 'column', gap: 10
              }}>
                <Icon name={t.icon} size={20} color="#00C896" />
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.35 }}>{t.text}</div>
              </div>
            ))}
          </div>
        </Motion.div>

        {/* How it works */}
        <Motion.div {...fadeUp(5)} ref={howItWorksRef}>
          <h2 style={{ fontSize: 19, marginBottom: 14 }}>How It Works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {HOW_IT_WORKS.map((s) => (
              <div key={s.title} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--tile)', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,200,150,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={s.icon} size={18} color="#00C896" />
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{s.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Motion.div>
      </div>

      {/* Floating Book Now — always visible, above the bottom nav */}
      <div className="book-cta-bar">
        <Link to={user ? '/book' : '/signup'} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 16, fontSize: 16 }}>
          Book Now
        </Link>
      </div>
    </div>
  )
}

function Bubbles() {
  return (
    <>
      <div style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
      <div style={{ position: 'absolute', bottom: -55, left: -40, width: 175, height: 175, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ position: 'absolute', top: 22, right: 64, width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
    </>
  )
}

function ActiveBookingCard({ cleaner, cleanerPos, userPos }) {
  const eta = cleanerPos ? etaMins(cleanerPos, userPos) : null
  return (
    <Link to="/dashboard" style={{
      display: 'block', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-card)'
    }}>
      <div style={{ height: 84, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {cleanerPos ? (
            <MapContainer
              className="app-map" center={[cleanerPos.lat, cleanerPos.lng]} zoom={14}
              zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false}
              touchZoom={false} attributionControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[cleanerPos.lat, cleanerPos.lng]} icon={miniCleanerIcon(cleaner.avatar_url)} />
            </MapContainer>
          ) : <div style={{ height: '100%', background: 'var(--tile)' }} />}
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent 65%)', pointerEvents: 'none' }} />
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleaner.name} is on the way</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#00C896' }}>
            {eta != null ? `Arriving in ${eta} mins` : 'Live tracking active'}
          </div>
        </div>
        <Icon name="chevronRight" size={18} color="var(--text-dim)" style={{ flexShrink: 0 }} />
      </div>
    </Link>
  )
}
