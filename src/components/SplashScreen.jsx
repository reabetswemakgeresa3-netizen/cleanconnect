import { motion as Motion } from 'framer-motion'

// App-launch splash. Always the same dark charcoal brand moment regardless
// of the user's light/dark preference — shown for a minimum time by the
// parent (App.jsx) and dismissed with a fade once the auth session check
// resolves. Rendered inside <AnimatePresence>, so `exit` drives the fade-out.
export default function SplashScreen() {
  return (
    <Motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      style={{
        position: 'fixed', inset: 0, zIndex: 5000, background: '#0D1117',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 22
      }}
    >
      {/* Pin drops in from above with a bounce, ripple pings behind it,
          sparkle twinkles once everything has landed. */}
      <div style={{ position: 'relative', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Motion.span
          aria-hidden="true"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 2.1], opacity: [0, 0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.9, ease: 'easeOut' }}
          style={{ position: 'absolute', width: 70, height: 70, borderRadius: '50%', background: '#00C896' }}
        />
        <Motion.svg
          width={92} height={92} viewBox="0 0 96 96" fill="none"
          initial={{ y: -220, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 12, mass: 0.9, delay: 0.15 }}
          style={{ position: 'relative' }}
        >
          <path
            d="M48 10 C32.5 10 20 22.5 20 38 C20 50.5 29.5 60.5 48 84 C66.5 60.5 76 50.5 76 38 C76 22.5 63.5 10 48 10 Z"
            fill="#00C896"
          />
          <path
            d="M36.5 39 H59.5 L56.6 53.2 C56.4 54.3 55.4 55 54.3 55 H41.7 C40.6 55 39.6 54.3 39.4 53.2 Z"
            fill="#FFFFFF"
          />
          <path
            d="M39.5 37.5 C40.5 28.5 55.5 28.5 56.5 37.5"
            stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" fill="none"
          />
          <Motion.path
            d="M30 26.5 L31.9 31.6 L37 33.5 L31.9 35.4 L30 40.5 L28.1 35.4 L23 33.5 L28.1 31.6 Z"
            fill="#FFFFFF"
            style={{ transformOrigin: '30px 33.5px' }}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1, 1.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: 1, repeatDelay: 0.4, ease: 'easeInOut' }}
          />
          <circle cx="65.5" cy="30.5" r="2.8" fill="#FFFFFF" />
        </Motion.svg>
      </div>

      {/* Wordmark, then tagline */}
      <Motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.05 }}
        style={{ textAlign: 'center' }}
      >
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
          Clean<span style={{ color: '#00C896' }}>Connect</span>
        </span>
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.35 }}
          style={{ marginTop: 10, fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', color: '#6B7684', textTransform: 'uppercase' }}
        >
          Cleaning at your fingertips
        </Motion.div>
      </Motion.div>

      {/* Indeterminate progress bar */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 'calc(56px + var(--sab))', transform: 'translateX(-50%)',
        width: 120, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', overflow: 'hidden'
      }}>
        <Motion.div
          initial={{ x: '-100%' }}
          animate={{ x: ['-100%', '260%'] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '40%', height: '100%', borderRadius: 2, background: '#00C896' }}
        />
      </div>
    </Motion.div>
  )
}
