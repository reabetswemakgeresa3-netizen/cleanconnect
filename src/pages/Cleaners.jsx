import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DEMO_CLEANERS = [
  {
    id: '1',
    name: 'Zanele Dlamini',
    avatar: '👩🏾',
    location: 'Johannesburg, Gauteng',
    specialties: ['residential', 'office', 'carpet'],
    rating: 4.9,
    total_jobs: 187,
    bio: 'Professional cleaner with 6 years experience. Specialist in deep residential and office cleans. Detail-oriented and reliable.',
    verified: true,
    available: true,
    languages: ['Zulu', 'English', 'Sotho'],
    response_time: '< 1 hour'
  },
  {
    id: '2',
    name: 'Sipho Nkosi',
    avatar: '👨🏿',
    location: 'Sandton, Gauteng',
    specialties: ['industrial', 'postConstruction', 'office'],
    rating: 4.8,
    total_jobs: 243,
    bio: 'Industrial and post-construction specialist. Equipped with heavy-duty machinery. Handles large commercial spaces with ease.',
    verified: true,
    available: true,
    languages: ['Zulu', 'English'],
    response_time: '< 2 hours'
  },
  {
    id: '3',
    name: 'Fatima Mokoena',
    avatar: '👩🏽',
    location: 'Cape Town, Western Cape',
    specialties: ['medical', 'residential', 'office'],
    rating: 5.0,
    total_jobs: 312,
    bio: 'Certified medical-grade cleaning specialist. Works with clinics, dental practices, and sterile environments. SABS compliant.',
    verified: true,
    available: false,
    languages: ['Afrikaans', 'English', 'Sotho'],
    response_time: '< 30 min'
  },
  {
    id: '4',
    name: 'Thabo Sithole',
    avatar: '👨🏾',
    location: 'Pretoria, Gauteng',
    specialties: ['gardening', 'residential', 'event'],
    rating: 4.7,
    total_jobs: 156,
    bio: 'Garden and outdoor specialist with a passion for landscaping. Also handles pre and post-event clean-ups for large venues.',
    verified: true,
    available: true,
    languages: ['Sotho', 'Tswana', 'English'],
    response_time: '< 3 hours'
  },
  {
    id: '5',
    name: 'Nomsa Khumalo',
    avatar: '👩🏿',
    location: 'Durban, KwaZulu-Natal',
    specialties: ['residential', 'carpet', 'event'],
    rating: 4.9,
    total_jobs: 201,
    bio: 'Carpet and upholstery restoration expert. Uses professional hot-water extraction equipment. Your home will look brand new.',
    verified: true,
    available: true,
    languages: ['Zulu', 'English'],
    response_time: '< 1 hour'
  },
  {
    id: '6',
    name: 'Kagiso Molefe',
    avatar: '👨🏽',
    location: 'Ekurhuleni, Gauteng',
    specialties: ['industrial', 'postConstruction', 'gardening'],
    rating: 4.6,
    total_jobs: 98,
    bio: 'Heavy-duty industrial and post-construction cleaner. Handles factories, warehouses, and large construction sites efficiently.',
    verified: false,
    available: true,
    languages: ['Tswana', 'Sotho', 'English'],
    response_time: '< 4 hours'
  }
]

// Real photo when the cleaner uploaded one, emoji fallback otherwise
function Avatar({ cleaner, size, fontSize, ring = '#E8E8E8' }) {
  const [broken, setBroken] = useState(false)
  const showPhoto = cleaner.avatar_url && !broken
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', fontSize, overflow: 'hidden',
      background: '#EEEEEE', border: `2px solid ${ring}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {showPhoto
        ? <img src={cleaner.avatar_url} alt={cleaner.name} loading="lazy" onError={() => setBroken(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (cleaner.avatar || cleaner.avatar_emoji || '🧹')}
    </div>
  )
}

const SERVICE_LABELS = {
  residential: '🏠 Residential',
  industrial: '🏭 Industrial',
  office: '🏢 Office',
  gardening: '🌿 Gardening',
  medical: '🏥 Medical',
  carpet: '🛋️ Carpet',
  postConstruction: '🔨 Post-Construction',
  event: '🎉 Events'
}

export default function Cleaners() {
  const [cleaners, setCleaners] = useState(DEMO_CLEANERS)
  const [filter, setFilter] = useState('all')

  // Show real registered cleaners when there are any; demo profiles otherwise
  useEffect(() => {
    supabase.from('cleaners').select('*').order('rating', { ascending: false })
      .then(({ data }) => { if (data?.length) setCleaners(data) })
  }, [])

  const [availableOnly, setAvailableOnly] = useState(false)
  const [selected, setSelected] = useState(null)

  const specialties = ['all', 'residential', 'industrial', 'office', 'gardening', 'medical', 'carpet', 'postConstruction', 'event']

  const filtered = cleaners.filter(c => {
    if (availableOnly && !c.available) return false
    if (filter === 'all') return true
    return c.specialties.includes(filter)
  })

  return (
    <div style={{ paddingTop: 64, background: '#FFFFFF' }}>
      {/* Header — Uber-style big left-aligned heading */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 0' }}>
        <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', letterSpacing: '-0.03em', marginBottom: 10 }}>
          Our Cleaners
        </h1>
        <p style={{ color: '#6B6B6B', fontSize: 16, maxWidth: 520 }}>
          {filtered.length} vetted professionals — background-checked, trained, and rated by real customers.
        </p>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            {specialties.map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '8px 16px', borderRadius: 100,
                border: `1.5px solid ${filter === s ? '#00C896' : '#E8E8E8'}`,
                background: filter === s ? 'rgba(0,200,150,0.1)' : 'transparent',
                color: filter === s ? '#00C896' : '#6B6B6B',
                fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
              }}>
                {s === 'all' ? 'All Services' : SERVICE_LABELS[s]}
              </button>
            ))}
          </div>
          <button onClick={() => setAvailableOnly(v => !v)} style={{
            padding: '8px 18px', borderRadius: 100,
            border: `1.5px solid ${availableOnly ? '#00C896' : '#E8E8E8'}`,
            background: availableOnly ? 'rgba(0,200,150,0.1)' : 'transparent',
            color: availableOnly ? '#00C896' : '#6B6B6B',
            fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap'
          }}>
            {availableOnly ? '✓ ' : ''}Available Now
          </button>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 20 }}>
          {filtered.map(cleaner => (
            <CleanerCard key={cleaner.id} cleaner={cleaner} onClick={() => setSelected(cleaner)} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6B6B6B' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p>No cleaners found for this filter. Try a different service.</p>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selected && <CleanerModal cleaner={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function CleanerCard({ cleaner, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#F6F6F6',
        border: `1px solid ${hovered ? '#00C896' : '#E8E8E8'}`,
        borderRadius: 18, padding: 24, cursor: 'pointer',
        transition: 'all 0.25s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 10px 32px rgba(0,200,150,0.1)' : 'none'
      }}
    >
      {/* Avatar + availability */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Avatar cleaner={cleaner} size={64} fontSize={36} />
          <div style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 14, height: 14, borderRadius: '50%',
            background: cleaner.available ? '#00C896' : '#E11900',
            border: '2px solid #F6F6F6'
          }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginBottom: 4 }}>
            <span style={{ color: '#C46A00', fontSize: 14 }}>★</span>
            <span style={{ color: '#000000', fontWeight: 700, fontSize: 16 }}>{cleaner.rating}</span>
          </div>
          <div style={{ fontSize: 12, color: '#9E9E9E' }}>{cleaner.total_jobs} jobs</div>
        </div>
      </div>

      {/* Name + location */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <h3 style={{ fontSize: 17, color: '#000000' }}>{cleaner.name}</h3>
          {cleaner.verified && (
            <span style={{ fontSize: 14 }} title="Verified">✅</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#6B6B6B' }}>📍 {cleaner.location}</div>
      </div>

      {/* Bio */}
      <p style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.6, marginBottom: 16,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {cleaner.bio}
      </p>

      {/* Specialties */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {cleaner.specialties.map(s => (
          <span key={s} style={{
            background: '#EEEEEE', border: '1px solid #E8E8E8',
            borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#6B6B6B'
          }}>{SERVICE_LABELS[s] || s}</span>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #EEEEEE' }}>
        <span style={{ fontSize: 12, color: cleaner.available ? '#00C896' : '#E11900', fontWeight: 500 }}>
          ● {cleaner.available ? 'Available' : 'Unavailable'}
        </span>
        <span style={{ fontSize: 12, color: '#9E9E9E' }}>⚡ {cleaner.response_time}</span>
      </div>
    </div>
  )
}

function CleanerModal({ cleaner, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(24px + var(--sat)) calc(24px + var(--sar)) calc(24px + var(--sab)) calc(24px + var(--sal))',
      backdropFilter: 'blur(4px)'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#F6F6F6', border: '1px solid #E8E8E8',
        borderRadius: 20, width: '100%', maxWidth: 500,
        maxHeight: '85vh', overflowY: 'auto', padding: 32
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Avatar cleaner={cleaner} size={72} fontSize={42} />
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: cleaner.available ? '#00C896' : '#E11900', border: '2px solid #F6F6F6' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{ fontSize: 22 }}>{cleaner.name}</h2>
                {cleaner.verified && <span>✅</span>}
              </div>
              <div style={{ color: '#6B6B6B', fontSize: 14 }}>📍 {cleaner.location}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#EEEEEE', border: '1px solid #E8E8E8', color: '#6B6B6B', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Rating', value: `★ ${cleaner.rating}` },
            { label: 'Jobs Done', value: cleaner.total_jobs },
            { label: 'Response', value: cleaner.response_time }
          ].map(s => (
            <div key={s.label} style={{ background: '#EEEEEE', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
              <div style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter', fontSize: 18 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bio */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>About</div>
          <p style={{ color: '#6B6B6B', fontSize: 14, lineHeight: 1.7 }}>{cleaner.bio}</p>
        </div>

        {/* Specialties */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Specialties</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cleaner.specialties.map(s => (
              <span key={s} style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)', color: '#00C896', borderRadius: 8, padding: '5px 12px', fontSize: 13 }}>
                {SERVICE_LABELS[s]}
              </span>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Languages</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cleaner.languages.map(l => (
              <span key={l} style={{ background: '#EEEEEE', border: '1px solid #E8E8E8', color: '#6B6B6B', borderRadius: 8, padding: '5px 12px', fontSize: 13 }}>
                🗣 {l}
              </span>
            ))}
          </div>
        </div>

        <a href="/book" className="btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
          Book {cleaner.name.split(' ')[0]} →
        </a>
      </div>
    </div>
  )
}
