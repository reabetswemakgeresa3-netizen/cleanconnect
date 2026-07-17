import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SERVICES } from '../data/services'

// Short Uber-tile labels for the service grid
const TILE_LABELS = {
  residential: 'Home Clean',
  office: 'Office',
  industrial: 'Industrial',
  gardening: 'Garden',
  medical: 'Medical',
  carpet: 'Carpet',
  postConstruction: 'Post-Construction',
  event: 'Events'
}
const TILE_ORDER = ['residential', 'office', 'industrial', 'gardening', 'medical', 'carpet', 'postConstruction', 'event']

// Drop a residential.webp / office.jpg etc. into public/images/services/
// and the tile picks it up automatically; otherwise the emoji shows.
const TILE_IMG_EXTS = ['webp', 'jpg', 'png']

function TileArt({ id, emoji }) {
  const [extIdx, setExtIdx] = useState(0)
  if (extIdx >= TILE_IMG_EXTS.length) {
    return <span style={{ position: 'absolute', top: 12, right: 14, fontSize: 30 }}>{emoji}</span>
  }
  return (
    <img
      src={`/images/services/${id}.${TILE_IMG_EXTS[extIdx]}`}
      alt=""
      loading="lazy"
      onError={() => setExtIdx(i => i + 1)}
      style={{ position: 'absolute', top: 10, right: 10, width: 64, height: 64, objectFit: 'contain' }}
    />
  )
}

const BENEFITS = [
  { icon: '💸', title: 'Up to 60% cheaper', desc: 'Below market rates on every service — guaranteed.' },
  { icon: '✅', title: 'Vetted cleaners', desc: 'Background-checked, trained and rated by real customers.' },
  { icon: '📍', title: 'Live tracking', desc: 'Watch your cleaner arrive in real time on the map.' },
  { icon: '💳', title: 'Secure payment', desc: 'Card or instant EFT via Yoco. PCI DSS compliant.' }
]

export default function Home() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')

  const bookTarget = (id) => user ? `/book?service=${id}` : '/signup'

  const tiles = TILE_ORDER
    .map(id => SERVICES.find(s => s.id === id))
    .filter(Boolean)
    .filter(s => {
      if (!query) return true
      const hay = `${TILE_LABELS[s.id]} ${s.name} ${s.description}`.toLowerCase()
      return hay.includes(query.toLowerCase())
    })

  return (
    <div style={{ paddingTop: 64, background: '#FFFFFF', minHeight: '100vh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 20px 60px' }}>

        {/* Search — like Uber's "Where to?" */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#F6F6F6', borderRadius: 100, padding: '4px 8px 4px 20px', marginBottom: 28
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="What needs cleaning?"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              fontSize: 16, fontWeight: 600, color: '#000000', padding: '14px 0'
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              background: '#EEEEEE', border: 'none', width: 32, height: 32,
              borderRadius: '50%', color: '#6B6B6B', fontSize: 14, flexShrink: 0
            }}>✕</button>
          )}
        </div>

        {/* Big bold heading */}
        <h1 style={{ fontSize: 40, letterSpacing: '-0.03em', marginBottom: 24 }}>Services</h1>

        {/* Book a clean — 2-column tappable tile grid */}
        <h2 style={{ fontSize: 20, marginBottom: 14 }}>Book a clean</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 36 }}>
          {tiles.map(s => (
            <Link key={s.id} to={bookTarget(s.id)} className="tile" style={{ minHeight: 116, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {/* Image if one exists in public/images/services, emoji otherwise */}
              <TileArt id={s.id} emoji={s.icon} />
              {s.popular && (
                <span style={{
                  position: 'absolute', top: 14, left: 14,
                  background: '#00C896', color: '#FFFFFF', fontSize: 10, fontWeight: 700,
                  padding: '3px 8px', borderRadius: 100, letterSpacing: '0.03em'
                }}>POPULAR</span>
              )}
              <div style={{ fontSize: 15, fontWeight: 700, color: '#000000' }}>{TILE_LABELS[s.id]}</div>
              <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>From R{s.pricePerSqm}/m²</div>
            </Link>
          ))}
          {tiles.length === 0 && (
            <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px 0', color: '#6B6B6B' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              Nothing matches "{query}" — try "home" or "office".
            </div>
          )}
        </div>

        {/* Why CleanConnect — horizontal scroll of benefit cards */}
        <h2 style={{ fontSize: 20, marginBottom: 14 }}>Why CleanConnect</h2>
        <div className="hscroll" style={{ marginBottom: 36 }}>
          {BENEFITS.map(b => (
            <div key={b.title} style={{
              width: 220, background: '#F6F6F6', borderRadius: 16, padding: '18px 18px 20px'
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{b.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#000000', marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>

        {/* Promo banner */}
        <Link to={user ? '/book' : '/signup'} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          background: '#00C896', borderRadius: 16, padding: '22px 22px', marginBottom: 40
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              Ready for a spotless space?
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 3 }}>
              Book in under 2 minutes · Serving all 9 provinces 🇿🇦
            </div>
          </div>
          <span style={{
            background: '#FFFFFF', color: '#000000', fontWeight: 700, fontSize: 14,
            padding: '10px 18px', borderRadius: 100, whiteSpace: 'nowrap', flexShrink: 0
          }}>Book now</span>
        </Link>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #F0F0F0', paddingTop: 24, textAlign: 'center', color: '#9E9E9E', fontSize: 13 }}>
          <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 800, color: '#000000' }}>
            Clean<span style={{ color: '#00C896' }}>Connect</span>
          </div>
          <p>© 2025 CleanConnect South Africa · 500+ cleaners · 4.9★ average rating</p>
        </footer>
      </div>
    </div>
  )
}
