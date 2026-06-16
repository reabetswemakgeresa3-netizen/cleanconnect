import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SERVICES, formatCurrency, calculatePrice } from '../data/services'

export default function Services() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ paddingTop: 68 }}>
      {/* Header */}
      <div style={{
        padding: '60px 24px 50px', textAlign: 'center',
        borderBottom: '1px solid #2E3A4E', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle at 50% 100%, rgba(0,200,150,0.07) 0%, transparent 60%)'
        }} />
        <span style={{
          display: 'inline-block',
          background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)',
          borderRadius: 100, padding: '6px 16px', fontSize: 13, color: '#00C896',
          marginBottom: 20, fontWeight: 500
        }}>8 Service Categories</span>
        <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', marginBottom: 14 }}>
          Our <span style={{ color: '#00C896' }}>Cleaning Services</span>
        </h1>
        <p style={{ color: '#7A8B9C', fontSize: 17, maxWidth: 520, margin: '0 auto' }}>
          All services priced transparently per square meter. Volume discounts apply automatically.
        </p>
      </div>

      {/* Pricing note */}
      <div style={{ padding: '24px 24px 0', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.2)',
          borderRadius: 12, padding: '14px 20px',
          display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <div>
            <span style={{ color: '#00C896', fontWeight: 500 }}>Volume Discounts: </span>
            <span style={{ color: '#7A8B9C', fontSize: 14 }}>
              Save 5% over 100m² · Save 10% over 200m² · Save 15% over 500m²
            </span>
          </div>
        </div>
      </div>

      {/* Service cards */}
      <div style={{ padding: '40px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 24 }}>
          {SERVICES.map(service => (
            <ServiceDetailCard
              key={service.id}
              service={service}
              onBook={() => user ? navigate(`/book?service=${service.id}`) : navigate('/signup')}
              hovered={hovered === service.id}
              onHover={() => setHovered(service.id)}
              onLeave={() => setHovered(null)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ServiceDetailCard({ service, onBook, hovered, onHover, onLeave }) {
  const [sqm, setSqm] = useState(service.minSqm)
  const price = calculatePrice(service.id, sqm)

  return (
    <div
      style={{
        background: '#161B22',
        border: `1px solid ${hovered ? '#00C896' : '#2E3A4E'}`,
        borderRadius: 20, padding: 28, transition: 'all 0.25s',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 12px 40px rgba(0,200,150,0.12)' : 'none'
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 40 }}>{service.icon}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#00C896', fontWeight: 700, fontSize: 20 }}>R{service.pricePerSqm}/m²</div>
          <div style={{ color: '#4A5568', fontSize: 12, marginTop: 2 }}>our rate</div>
          <div style={{ color: '#FF5C3A', fontSize: 11, marginTop: 2, textDecoration: 'line-through' }}>market: {service.marketRate}</div>
        </div>
      </div>

      <h3 style={{ fontSize: 20, marginBottom: 6, color: '#E8EDF4' }}>{service.name}</h3>
      <p style={{ fontSize: 14, color: '#7A8B9C', lineHeight: 1.6, marginBottom: 20 }}>{service.description}</p>

      {/* Includes */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#4A5568', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>What's included</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {service.includes.map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#7A8B9C' }}>
              <span style={{ color: '#00C896', fontSize: 10 }}>✓</span> {item}
            </div>
          ))}
        </div>
      </div>

      {/* Price calculator */}
      <div style={{
        background: '#1E2530', borderRadius: 12, padding: '16px',
        marginBottom: 20, border: '1px solid #2E3A4E'
      }}>
        <div style={{ fontSize: 12, color: '#4A5568', marginBottom: 10, fontWeight: 500 }}>Quick price estimate</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <input
              type="range"
              min={service.minSqm}
              max={service.minSqm * 20}
              value={sqm}
              onChange={e => setSqm(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#00C896' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4A5568', marginTop: 4 }}>
              <span>{service.minSqm}m²</span>
              <span style={{ color: '#7A8B9C', fontWeight: 500 }}>{sqm}m²</span>
              <span>{service.minSqm * 20}m²</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 80 }}>
            <div style={{ color: '#00C896', fontWeight: 700, fontSize: 18 }}>{formatCurrency(price)}</div>
            <div style={{ fontSize: 11, color: '#4A5568' }}>estimated</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#4A5568' }}>⏱ {service.duration}</span>
        <button onClick={onBook} className="btn-primary" style={{ padding: '10px 22px', fontSize: 14 }}>
          Book Now →
        </button>
      </div>
    </div>
  )
}
