import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', paddingTop: 20, textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 14 }}>
        <Link to="/terms" style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Terms</Link>
        <Link to="/privacy" style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Privacy</Link>
        <Link to="/contact" style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Contact</Link>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>© {new Date().getFullYear()} CleanConnect South Africa</p>
    </footer>
  )
}
