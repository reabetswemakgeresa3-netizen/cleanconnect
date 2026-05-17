import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import InstallPrompt from './components/InstallPrompt'
import Home from './pages/Home'
import Services from './pages/Services'
import Cleaners from './pages/Cleaners'
import { Login, Signup } from './pages/Auth'
import Book from './pages/Book'
import BookingSuccess from './pages/BookingSuccess'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/cleaners" element={<Cleaners />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/book" element={<ProtectedRoute><Book /></ProtectedRoute>} />
          <Route path="/booking-success" element={<ProtectedRoute><BookingSuccess /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <InstallPrompt />
      </AuthProvider>
    </BrowserRouter>
  )
}
