import { motion as Motion } from 'framer-motion'

// Compact loading indicator built from the brand mark — a bouncing pin with
// an expanding ripple ring, used everywhere the app used to show a plain
// spinner (protected-route gate, dashboard/admin lists, payment processing).
//
// variant "brand": green pin, white bucket — for use on light/dark surfaces.
// variant "mono": everything in currentColor — for use on solid accent
// backgrounds (e.g. the green "Pay with Yoco" button) where a green-on-green
// pin would lose contrast.
export default function PinSpinner({ size = 32, variant = 'brand', style }) {
  const pinFill = variant === 'mono' ? 'currentColor' : '#00C896'
  const bucketFill = variant === 'mono' ? 'currentColor' : '#FFFFFF'
  const rippleColor = variant === 'mono' ? 'currentColor' : '#00C896'

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <Motion.span
        aria-hidden="true"
        initial={{ scale: 0.3, opacity: 0.5 }}
        animate={{ scale: [0.3, 1.8], opacity: [0.45, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        style={{
          position: 'absolute', width: size * 0.7, height: size * 0.7, borderRadius: '50%',
          background: rippleColor, opacity: variant === 'mono' ? 0.3 : undefined
        }}
      />
      <Motion.svg
        width={size} height={size} viewBox="0 0 96 96" fill="none"
        animate={{ y: [-4, 0, -4] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative' }}
      >
        <path
          d="M48 10 C32.5 10 20 22.5 20 38 C20 50.5 29.5 60.5 48 84 C66.5 60.5 76 50.5 76 38 C76 22.5 63.5 10 48 10 Z"
          fill={pinFill}
        />
        <path
          d="M36.5 39 H59.5 L56.6 53.2 C56.4 54.3 55.4 55 54.3 55 H41.7 C40.6 55 39.6 54.3 39.4 53.2 Z"
          fill={bucketFill}
        />
        <path
          d="M39.5 37.5 C40.5 28.5 55.5 28.5 56.5 37.5"
          stroke={bucketFill} strokeWidth="3.4" strokeLinecap="round" fill="none"
        />
      </Motion.svg>
    </div>
  )
}
