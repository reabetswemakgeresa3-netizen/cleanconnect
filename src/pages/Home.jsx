import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SERVICES } from '../data/services'

export default function Home() {
  const { user } = useAuth()

  return (
    <div style={{ paddingTop: 68 }}>
      {/* Hero */}
      <section style={{
        minHeight: '92vh', display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
        padding: '80px 24px 60px'
      }}>
        {/* Background grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(0,200,150,0.08) 0%, transparent 50%),
                            radial-gradient(circle at 75% 75%, rgba(0,168,126,0.06) 0%, transparent 50%)`,
          pointerEvents: 'none'
        }} />
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(46,58,78,0.6) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none', opacity: 0.5
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative' }}>
          <div style={{ maxWidth: 700 }}>
            {/* Tag */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)',
              borderRadius: '100px', padding: '8px 16px', marginBottom: 28
            }}>
              <span style={{ color: '#00C896', fontSize: 13, fontWeight: 500 }}>🇿🇦 South Africa's #1 Cleaning Platform</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(42px, 6vw, 76px)', lineHeight: 1.1,
              color: '#E8EDF4', marginBottom: 24, letterSpacing: '-1.5px'
            }}>
              Professional<br />
              <span style={{
                background: 'linear-gradient(90deg, #00C896, #00E5B0)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>Cleaning Services</span>
              <br />at Your Door
            </h1>

            <p style={{
              fontSize: 18, color: '#7A8B9C', lineHeight: 1.7,
              marginBottom: 40, maxWidth: 520
            }}>
              Book vetted cleaning professionals for your home, office, garden, or industrial space. Priced per square meter — transparent, fair, no surprises.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link to={user ? '/book' : '/signup'} className="btn-primary" style={{ fontSize: 16, padding: '16px 32px' }}>
                Book a Clean →
              </Link>
              <Link to="/services" className="btn-outline" style={{ fontSize: 16, padding: '16px 32px' }}>
                View Services
              </Link>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 40, marginTop: 56, flexWrap: 'wrap' }}>
              {[
                { value: '500+', label: 'Cleaners Nationwide' },
                { value: '4.9★', label: 'Average Rating' },
                { value: 'R8/m²', label: 'Starting Price' }
              ].map(stat => (
                <div key={stat.label}>
                  <div style={{ fontSize: 28, fontFamily: 'Syne', fontWeight: 800, color: '#00C896' }}>{stat.value}</div>
                  <div style={{ fontSize: 13, color: '#7A8B9C', marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section style={{ padding: '80px 24px', background: 'rgba(22,27,34,0.5)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', marginBottom: 12 }}>
              Everything Clean, <span style={{ color: '#00C896' }}>Covered</span>
            </h2>
            <p style={{ color: '#7A8B9C', fontSize: 16 }}>8 specialist service categories, all charged per m²</p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 20
          }}>
            {SERVICES.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <Link to={user ? '/book' : '/signup'} className="btn-primary" style={{ fontSize: 16, padding: '16px 40px' }}>
              Book Any Service
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', marginBottom: 12 }}>
              How It <span style={{ color: '#00C896' }}>Works</span>
            </h2>
            <p style={{ color: '#7A8B9C', fontSize: 16 }}>From booking to spotless — 4 simple steps</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
            {[
              { step: '01', title: 'Choose Service', desc: 'Pick from 8 categories — residential, industrial, garden, and more', icon: '🔍' },
              { step: '02', title: 'Enter Details', desc: 'Tell us your square meters, location, and preferred date & time', icon: '📋' },
              { step: '03', title: 'Secure Payment', desc: 'Pay via Yoco — card or instant EFT. Your booking is instantly confirmed', icon: '💳' },
              { step: '04', title: 'We Arrive & Clean', desc: 'Our vetted team arrives on time and leaves your space spotless', icon: '✨' }
            ].map(item => (
              <div key={item.step} style={{
                background: '#161B22', border: '1px solid #2E3A4E',
                borderRadius: 16, padding: '28px 24px', position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', top: 20, right: 20,
                  fontSize: 12, fontWeight: 700, color: '#2E3A4E',
                  fontFamily: 'Syne'
                }}>{item.step}</div>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ fontSize: 18, marginBottom: 8, color: '#E8EDF4' }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: '#7A8B9C', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '80px 24px', margin: '0 24px 80px',
        background: 'linear-gradient(135deg, rgba(0,200,150,0.12), rgba(0,168,126,0.06))',
        border: '1px solid rgba(0,200,150,0.2)', borderRadius: 24,
        textAlign: 'center', maxWidth: 900, marginLeft: 'auto', marginRight: 'auto'
      }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', marginBottom: 16 }}>
          Ready for a <span style={{ color: '#00C896' }}>Spotless Space?</span>
        </h2>
        <p style={{ color: '#7A8B9C', fontSize: 17, marginBottom: 36, maxWidth: 500, margin: '0 auto 36px' }}>
          Join thousands of South Africans who trust CleanConnect for professional, reliable cleaning services.
        </p>
        <Link to={user ? '/book' : '/signup'} className="btn-primary" style={{ fontSize: 17, padding: '18px 44px' }}>
          Get Started Free →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #2E3A4E', padding: '40px 24px',
        textAlign: 'center', color: '#4A5568', fontSize: 14
      }}>
        <div style={{ marginBottom: 12, fontFamily: 'Syne', fontSize: 18, color: '#E8EDF4' }}>
          Clean<span style={{ color: '#00C896' }}>Connect</span>
        </div>
        <p>© 2025 CleanConnect South Africa. All rights reserved.</p>
        <p style={{ marginTop: 6 }}>Serving all 9 provinces 🇿🇦</p>
      </footer>
    </div>
  )
}

function ServiceCard({ service }) {
  const { user } = useAuth()
  return (
    <Link to={user ? `/book?service=${service.id}` : '/signup'} style={{
      display: 'block',
      background: '#161B22', border: '1px solid #2E3A4E',
      borderRadius: 16, padding: '24px',
      transition: 'all 0.25s', cursor: 'pointer'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = '#00C896'
      e.currentTarget.style.transform = 'translateY(-3px)'
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,200,150,0.12)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = '#2E3A4E'
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'none'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 32 }}>{service.icon}</span>
        {service.popular && (
          <span style={{
            background: 'rgba(0,200,150,0.15)', color: '#00C896',
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
            border: '1px solid rgba(0,200,150,0.2)'
          }}>POPULAR</span>
        )}
      </div>
      <h3 style={{ fontSize: 16, marginBottom: 6, color: '#E8EDF4' }}>{service.name}</h3>
      <p style={{ fontSize: 13, color: '#7A8B9C', lineHeight: 1.5, marginBottom: 16 }}>{service.description}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#00C896', fontWeight: 700, fontSize: 15 }}>
          R{service.pricePerSqm}/m²
        </span>
        <span style={{ color: '#4A5568', fontSize: 12 }}>{service.duration}</span>
      </div>
    </Link>
  )
}
