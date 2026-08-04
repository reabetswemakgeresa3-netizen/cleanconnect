import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Resolve admin status once we know who's signed in. RLS on admin_users
  // only ever lets a user see their OWN row, so this is a safe, minimal check.
  useEffect(() => {
    if (!user) { setIsAdmin(false); setAdminChecked(true); return }
    setAdminChecked(false)
    supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle()
      .then(({ data }) => { setIsAdmin(!!data); setAdminChecked(true) })
      .catch(() => { setIsAdmin(false); setAdminChecked(true) })
  }, [user])

  const signUp = async (email, password, fullName, phone) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone }
      }
    })
    if (error) throw error

    // Insert profile
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        phone,
        created_at: new Date().toISOString()
      })
    }
    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // Redirects to Google; Supabase handles the callback (detectSessionInUrl).
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
    if (error) throw error
  }

  // Sends a 6-digit code over WhatsApp via the send-whatsapp-otp Edge Function.
  // Creates the account on first use (handled in verifyPhoneOtp below).
  const sendPhoneOtp = async (phone) => {
    const { data, error } = await supabase.functions.invoke('send-whatsapp-otp', { body: { phone } })
    if (error) throw new Error(data?.error || error.message || 'Could not send the code. Please try again.')
    if (data?.error) throw new Error(data.error)
    return data // { success, phone }
  }

  // Verifies the code via verify-whatsapp-otp, which creates/finds the auth
  // user and hands back Supabase's own internal magic-link OTP for that
  // user's synthetic email — exchanging it here is what actually establishes
  // a real, persisted session (same mechanism the rest of the app relies on).
  const verifyPhoneOtp = async (phone, code, fullName) => {
    const { data, error } = await supabase.functions.invoke('verify-whatsapp-otp', { body: { phone, code, fullName } })
    if (error) throw new Error(data?.error || error.message || 'Invalid or expired code. Please try again.')
    if (data?.error) throw new Error(data.error)

    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      email: data.email, token: data.otp, type: 'email'
    })
    if (sessionError) throw sessionError
    return sessionData
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, adminChecked, signUp, signIn, signOut, signInWithGoogle, sendPhoneOtp, verifyPhoneOtp }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
