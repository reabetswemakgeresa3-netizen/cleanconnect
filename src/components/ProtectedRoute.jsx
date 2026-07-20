import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PinSpinner from './PinSpinner'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <PinSpinner size={48} style={{ marginBottom: 16 }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}
