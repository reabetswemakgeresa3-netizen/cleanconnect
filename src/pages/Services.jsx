import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SERVICES, formatCurrency, calculatePrice } from '../data/services'
import { Icon, ServiceBadge } from '../components/Icons'

export default function Services() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ paddingTop: 64, background: '#FFFFFF' }}>
      {/* Header — Uber-style big left-aligned heading */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 8px' }}>
        <h1 style={{ fontSize: 'clamp(32px,5vw,44px)', letterSpacing: '-0.03em', marginBottom: 10 }}>
          Services
        </h1>
        <p style={{ color: '#6B6B6B', fontSize: 16, maxWidth: 520 }}>
          8 categories, priced transparently per square meter. Volume discounts apply automatically.
        </p>
      </div>

      {/* Pricing note */}
      <div style={{ padding: '24px 24px 0', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.2)',
          borderRadius: 12, padding: '14px 20px',
          display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap'
        }}>
          <Icon name="tag" size={20} color="#00C896" />
          <div>
            <span style={{ color: '#00C896', fontWeight: 500 }}>Volume Discounts: </span>
            <span style={{ color: '#6B6B6B', fontSize: 14 }}>
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
        background: '#F6F6F6',
        border: `1px solid ${hovered ? '#00C896' : '#E8E8E8'}`,
        borderRadius: 20, padding: 28, transition: 'all 0.25s',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 12px 40px rgba(0,200,150,0.12)' : 'none'
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <ServiceBadge id={service.id} size={56} iconSize={28} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#00C896', fontWeight: 700, fontSize: 20 }}>R{service.pricePerSqm}/m²</div>
          <div style={{ color: '#9E9E9E', fontSize: 12, marginTop: 2 }}>our rate</div>
          <div style={{ color: '#E11900', fontSize: 11, marginTop: 2, textDecoration: 'line-through' }}>market: {service.marketRate}</div>
        </div>
      </div>

      <h3 style={{ fontSize: 20, marginBottom: 6, color: '#000000' }}>{service.name}</h3>
      <p style={{ fontSize: 14, color: '#6B6B6B', lineHeight: 1.6, marginBottom: 20 }}>{service.description}</p>

      {/* Includes */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#9E9E9E', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>What's included</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {service.includes.map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6B6B6B' }}>
              <Icon name="check" size={13} color="#00C896" strokeWidth={3} /> {item}
            </div>
          ))}
        </div>
      </div>

      {/* Price calculator */}
      <div style={{
        background: '#EEEEEE', borderRadius: 12, padding: '16px',
        marginBottom: 20, border: '1px solid #E8E8E8'
      }}>
        <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 10, fontWeight: 500 }}>Quick price estimate</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9E9E9E', marginTop: 4 }}>
              <span>{service.minSqm}m²</span>
              <span style={{ color: '#6B6B6B', fontWeight: 500 }}>{sqm}m²</span>
              <span>{service.minSqm * 20}m²</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 80 }}>
            <div style={{ color: '#00C896', fontWeight: 700, fontSize: 18 }}>{formatCurrency(price)}</div>
            <div style={{ fontSize: 11, color: '#9E9E9E' }}>estimated</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#9E9E9E', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="clock" size={14} color="#9E9E9E" /> {service.duration}
        </span>
        <button onClick={onBook} className="btn-primary" style={{ padding: '10px 22px', fontSize: 14 }}>
          Book Now →
        </button>
      </div>
    </div>
  )
}
