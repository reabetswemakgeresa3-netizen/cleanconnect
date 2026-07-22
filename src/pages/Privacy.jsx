import { useNavigate, Link } from 'react-router-dom'
import { Icon } from '../components/Icons'

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)',
        borderBottom: '1px solid var(--border)', paddingTop: 'var(--sat)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
          <button onClick={() => navigate(-1)} aria-label="Back" style={{
            width: 38, height: 38, borderRadius: '50%', background: 'var(--tile)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Icon name="chevronLeft" size={20} color="var(--text)" />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Privacy Policy</span>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 22px 60px' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 26 }}>Last updated: 20 July 2026</p>

        <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', marginBottom: 26 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            CleanConnect processes your personal information in accordance with the <strong>Protection of Personal
            Information Act, 2013 (POPIA)</strong>, South Africa's data protection law. This policy explains what we
            collect, why, and the rights you have over your information.
          </p>
        </div>

        <Section title="1. Information We Collect">
          <ul style={listStyle}>
            <li>Account details: name, email address, phone number, and password (encrypted).</li>
            <li>Booking details: service address, property size, scheduling preferences, and special instructions.</li>
            <li>Payment information: processed directly by Yoco — CleanConnect never stores your full card details.</li>
            <li>Location data: your device's location, used to show nearby cleaners and enable live tracking during an active job (only while the app is open).</li>
            <li>Worker profile data (for Cleaners): name, contact details, service area, specialties, and an optional profile photo.</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          We use your information to create and manage your account, process bookings and payments, match you with
          available Cleaners, provide live cleaner tracking, send booking confirmations and updates (including via
          WhatsApp and SMS), and improve the safety and reliability of the Service.
        </Section>

        <Section title="3. Third Parties We Share Data With">
          <ul style={listStyle}>
            <li><strong>Supabase</strong> — our database and authentication provider, used to securely store account and booking data.</li>
            <li><strong>Yoco</strong> — our payment processor, used to handle card and EFT payments securely.</li>
            <li><strong>Twilio</strong> — used to send SMS one-time passwords and WhatsApp booking notifications.</li>
          </ul>
          We do not sell your personal information to third parties.
        </Section>

        <Section title="4. Your Rights Under POPIA">
          As a data subject under POPIA, you have the right to access the personal information we hold about you,
          request correction of inaccurate information, request deletion of your information (subject to legal
          retention requirements, e.g. for financial records), object to certain uses of your information, and lodge
          a complaint with the Information Regulator of South Africa if you believe your rights have been infringed.
        </Section>

        <Section title="5. Data Retention">
          We retain account and booking information for as long as your account is active, and for a reasonable
          period afterwards to comply with legal, tax, and accounting obligations. Live location data shared during
          an active booking is not retained beyond the completion of that job.
        </Section>

        <Section title="6. Security">
          We apply industry-standard safeguards — including encryption in transit, row-level access controls on our
          database, and PCI DSS–compliant payment processing via Yoco — to protect your information against
          unauthorised access, loss, or misuse.
        </Section>

        <Section title="7. Contact for Data Requests">
          To exercise any of your rights under POPIA, or for any privacy-related question, contact our Information
          Officer at <a href="mailto:privacy@cleanconnect.co.za" style={linkStyle}>privacy@cleanconnect.co.za</a> or
          via our <Link to="/contact" style={linkStyle}>Contact page</Link>. See also our{' '}
          <Link to="/terms" style={linkStyle}>Terms & Conditions</Link>.
        </Section>
      </div>
    </div>
  )
}

const listStyle = { margin: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }
const linkStyle = { color: '#00C896', fontWeight: 600 }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, marginBottom: 8, color: 'var(--text)' }}>{title}</h2>
      <div style={{ fontSize: 14.5, color: 'var(--text-muted)', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}
