import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Icon } from '../components/Icons'
import PinSpinner from '../components/PinSpinner'

// Placeholder — replace with the real CleanConnect support number before launch
const WHATSAPP_NUMBER = '27000000000'
const SUPPORT_EMAIL = 'support@cleanconnect.co.za'

const FAQS = [
  { q: 'How does pricing work?', a: 'Every service has a rate per square metre (m²). Enter your property size when booking and the price calculates instantly, with automatic volume discounts on larger spaces. There are no hidden fees — the price you see is the price you pay.' },
  { q: 'How do I cancel a booking?', a: "Open the booking from your dashboard and tap Cancel Booking. Cancelling more than 4 hours before your scheduled time gets a full refund. Inside that window, cancellation is still allowed but a fee may apply and the refund is reviewed manually." },
  { q: 'Is payment secure?', a: 'Yes. All payments are processed by Yoco, a PCI DSS–compliant payment provider used by thousands of South African businesses. CleanConnect never stores your full card details.' },
  { q: 'How are cleaners vetted?', a: 'Every cleaner on CleanConnect Workers registers with verified contact details and goes through a review before being marked as verified. Ratings from real completed jobs are visible on every profile.' },
  { q: 'What areas do you cover?', a: "CleanConnect operates across all 9 South African provinces. Availability of individual cleaners depends on your specific area — the map on the booking screen shows who's nearby." },
  { q: "What if I'm not satisfied with the clean?", a: 'Report any issue within 24 hours of a completed service via this Contact page and our team will investigate — including a re-clean or refund where appropriate.' }
]

export default function Contact() {
  const [openFaq, setOpenFaq] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: form.name, email: form.email, message: form.message
      })
      if (error) throw error
      setStatus('sent')
      setForm({ name: '', email: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 80px' }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Contact & Support</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 28 }}>
          We're here to help — reach out any way that suits you.
        </p>

        {/* Quick contact options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi CleanConnect, I need help with...')}`}
            target="_blank" rel="noreferrer"
            style={{ ...contactCard, background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.3)' }}
          >
            <Icon name="whatsapp" size={26} color="#00C896" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>WhatsApp Us</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Fastest response</div>
            </div>
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}`} style={contactCard}>
            <Icon name="mail" size={26} color="var(--text-muted)" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>Email Us</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{SUPPORT_EMAIL}</div>
            </div>
          </a>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: -20, marginBottom: 28 }}>
          WhatsApp number shown is a placeholder — update to the real CleanConnect support line before launch.
        </p>

        {/* Contact form */}
        <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Send us a message</h2>
          {status === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Icon name="checkCircle" size={36} color="#00C896" />
              <p style={{ marginTop: 12, color: 'var(--text)', fontWeight: 600 }}>Message sent — we'll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
              <input className="input-field" placeholder="Your name" required
                value={form.name} onChange={e => setVal('name', e.target.value)} />
              <input className="input-field" type="email" placeholder="Your email" required
                value={form.email} onChange={e => setVal('email', e.target.value)} />
              <textarea className="input-field" rows={4} placeholder="How can we help?" required
                style={{ resize: 'vertical' }} value={form.message} onChange={e => setVal('message', e.target.value)} />
              {status === 'error' && <p style={{ color: '#E11900', fontSize: 13 }}>Couldn't send that — please try again.</p>}
              <button type="submit" disabled={status === 'sending'} className="btn-primary" style={{ justifyContent: 'center', padding: 14 }}>
                {status === 'sending' ? <PinSpinner size={18} variant="mono" /> : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        {/* FAQ accordion */}
        <h2 style={{ fontSize: 18, marginBottom: 14 }}>Frequently Asked Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQS.map((f, i) => {
            const open = openFaq === i
            return (
              <div key={f.q} style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(open ? null : i)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', background: 'transparent', textAlign: 'left'
                }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{f.q}</span>
                  <Icon name="chevronDown" size={17} color="var(--text-dim)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                </button>
                {open && (
                  <p style={{ padding: '0 16px 16px', fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.a}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const contactCard = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '16px 14px', minWidth: 0,
  borderRadius: 14, background: 'var(--tile)', border: '1px solid var(--border)'
}
