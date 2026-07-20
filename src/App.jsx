import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'
import ProtectedRoute from './components/ProtectedRoute'
import InstallPrompt from './components/InstallPrompt'
import SplashScreen from './components/SplashScreen'
import Account from './pages/Account'
import Settings from './pages/Settings'
import Home from './pages/Home'
import Services from './pages/Services'
import Cleaners from './pages/Cleaners'
import { Login, Signup } from './pages/Auth'
import Book from './pages/Book'
import BookingSuccess from './pages/BookingSuccess'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import WorkerDashboard from './pages/worker/WorkerDashboard'
import WorkerRegister from './pages/worker/WorkerRegister'

const SPLASH_MIN_MS = 1500

function AppShell() {
  const { loading: authLoading } = useAuth()
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), SPLASH_MIN_MS)
    return () => clearTimeout(t)
  }, [])

  const showSplash = authLoading || !minTimeElapsed

  return (
    <>
      <AnimatePresence>{showSplash && <SplashScreen key="splash" />}</AnimatePresence>
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
        <Route path="/worker" element={<ProtectedRoute><WorkerDashboard /></ProtectedRoute>} />
        <Route path="/worker/register" element={<ProtectedRoute><WorkerRegister /></ProtectedRoute>} />
        <Route path="/account" element={<Account />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <BottomNav />
      <InstallPrompt />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
