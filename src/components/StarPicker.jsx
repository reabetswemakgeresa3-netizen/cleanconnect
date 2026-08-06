import { useState } from 'react'

const STAR_PATH = 'm12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6L12 16.8l-5.4 2.9 1.1-6L3.2 9.4l6.1-.8Z'

// Interactive 1-5 star rating input. Uses the same star path as the shared
// Icon component, but toggles fill (Icon's is stroke-only) for selected state.
export default function StarPicker({ value, onChange, size = 32, readOnly = false }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value

  return (
    <div style={{ display: 'flex', gap: 6 }} onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          style={{
            background: 'none', border: 'none', padding: 0,
            cursor: readOnly ? 'default' : 'pointer', lineHeight: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: readOnly ? size : 44, minHeight: readOnly ? size : 44
          }}
        >
          <svg width={size} height={size} viewBox="0 0 24 24"
            fill={n <= display ? '#FFB800' : 'none'}
            stroke={n <= display ? '#FFB800' : 'var(--text-dim)'}
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  )
}
