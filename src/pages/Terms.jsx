import { useNavigate, Link } from 'react-router-dom'
import { Icon } from '../components/Icons'

export default function Terms() {
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
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Terms & Conditions</span>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 22px 60px' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 26 }}>Last updated: 20 July 2026</p>

        <Section title="1. Acceptance of Terms">
          By creating an account, booking a service, or otherwise using the CleanConnect platform ("the Service"),
          you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Service.
        </Section>

        <Section title="2. Description of Service">
          CleanConnect is an on-demand platform connecting customers in South Africa with independent, vetted
          cleaning professionals ("Cleaners") for residential, commercial, industrial, and specialised cleaning
          services. CleanConnect facilitates bookings, payments, and communication between customers and Cleaners
          but does not itself perform cleaning services.
        </Section>

        <Section title="3. Booking & Payments">
          Bookings are confirmed once payment has been successfully processed through our payment partner, Yoco.
          Prices are calculated based on the service type and property size (m²) selected at the time of booking,
          plus any applicable volume discounts. All amounts are in South African Rand (ZAR) and inclusive of VAT
          where applicable. Payment is required in full before a Cleaner is dispatched, except where an alternative
          arrangement has been explicitly agreed in writing.
        </Section>

        <Section title="4. Cancellations & Refunds">
          You may cancel a pending or confirmed booking at any time from your bookings dashboard.
          <ul style={listStyle}>
            <li><strong>More than 4 hours before</strong> the scheduled arrival window: you will receive a full refund.</li>
            <li><strong>Within 4 hours</strong> of the scheduled arrival window: cancellation is still permitted, but
              a cancellation fee may apply to cover the Cleaner's reserved time. Refunds inside this window are
              flagged for manual review rather than processed automatically.</li>
          </ul>
          CleanConnect reserves the right to cancel or reschedule a booking where a Cleaner becomes unavailable,
          in which case a full refund will be issued.
        </Section>

        <Section title="5. User Responsibilities">
          You agree to provide accurate booking details (address, contact information, and property size), ensure
          safe and reasonable access to the property at the scheduled time, and treat Cleaners with respect. You
          are responsible for securing valuables and disclosing any hazards (pets, fragile items, restricted areas)
          prior to the appointment.
        </Section>

        <Section title="6. Cleaner / Worker Terms">
          Cleaners registered on CleanConnect Workers operate as independent contractors, not employees of
          CleanConnect. Cleaners are responsible for arriving within the agreed time window, performing services
          to a professional standard, and maintaining accurate availability. CleanConnect reserves the right to
          suspend or remove a Cleaner's profile for verified misconduct, repeated cancellations, or safety concerns.
        </Section>

        <Section title="7. Limitation of Liability">
          CleanConnect facilitates the connection between customers and independent Cleaners and, to the maximum
          extent permitted by South African law, is not liable for any direct, indirect, incidental, or
          consequential damages arising from services rendered by a Cleaner. Customers should report any damage
          or dissatisfaction within 24 hours of a completed service so it can be investigated.
        </Section>

        <Section title="8. Privacy">
          Your use of the Service is also governed by our <Link to="/privacy" style={linkStyle}>Privacy Policy</Link>,
          which explains how we collect, use, and protect your personal information in accordance with the
          Protection of Personal Information Act (POPIA).
        </Section>

        <Section title="9. Governing Law">
          These Terms are governed by the laws of the Republic of South Africa. Any disputes arising from these
          Terms or use of the Service will be subject to the exclusive jurisdiction of the South African courts.
        </Section>

        <Section title="10. Changes to These Terms">
          CleanConnect reserves the right to update or modify these Terms at any time. Material changes will be
          reflected by an updated "Last updated" date above. Continued use of the Service after changes take
          effect constitutes acceptance of the revised Terms.
        </Section>

        <Section title="11. Contact Details">
          Questions about these Terms can be sent to <a href="mailto:support@cleanconnect.co.za" style={linkStyle}>support@cleanconnect.co.za</a> or
          via our <Link to="/contact" style={linkStyle}>Contact page</Link>.
        </Section>
      </div>
    </div>
  )
}

const listStyle = { margin: '10px 0 10px 20px', display: 'flex', flexDirection: 'column', gap: 8 }
const linkStyle = { color: '#00C896', fontWeight: 600 }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, marginBottom: 8, color: 'var(--text)' }}>{title}</h2>
      <div style={{ fontSize: 14.5, color: 'var(--text-muted)', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}
