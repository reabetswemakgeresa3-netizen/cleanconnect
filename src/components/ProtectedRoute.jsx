import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0D1117'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid #2E3A4E', borderTopColor: '#00C896',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <p style={{ color: '#7A8B9C' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}
