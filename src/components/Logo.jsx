// CleanConnect brand mark — a location pin holding a cleaning bucket.
// variant "tile": green rounded-square app tile with white pin (icons, favicon)
// variant "mark": standalone green pin for light backgrounds (navbar)
const GREEN = '#00C896'

export default function Logo({ size = 32, variant = 'mark', style }) {
  const tile = variant === 'tile'
  const pinFill = tile ? '#FFFFFF' : GREEN
  const detailFill = tile ? GREEN : '#FFFFFF'

  return (
    <svg
      width={size} height={size} viewBox="0 0 96 96"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      style={style} aria-label="CleanConnect logo" role="img"
    >
      {tile && <rect width="96" height="96" rx="22" fill={GREEN} />}

      {/* Map pin */}
      <path
        d="M48 10 C32.5 10 20 22.5 20 38 C20 50.5 29.5 60.5 48 84 C66.5 60.5 76 50.5 76 38 C76 22.5 63.5 10 48 10 Z"
        fill={pinFill}
      />

      {/* Bucket body */}
      <path
        d="M36.5 39 H59.5 L56.6 53.2 C56.4 54.3 55.4 55 54.3 55 H41.7 C40.6 55 39.6 54.3 39.4 53.2 Z"
        fill={detailFill}
      />
      {/* Bucket handle */}
      <path
        d="M39.5 37.5 C40.5 28.5 55.5 28.5 56.5 37.5"
        stroke={detailFill} strokeWidth="3.4" strokeLinecap="round" fill="none"
      />

      {/* Four-pointed sparkle, left of the bucket */}
      <path
        d="M30 26.5 L31.9 31.6 L37 33.5 L31.9 35.4 L30 40.5 L28.1 35.4 L23 33.5 L28.1 31.6 Z"
        fill={detailFill}
      />
      {/* Small dot, right of the bucket */}
      <circle cx="65.5" cy="30.5" r="2.8" fill={detailFill} />
    </svg>
  )
}
