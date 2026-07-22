// Shared line-icon set — 24×24 viewBox, stroke-based, Uber-style.
// Usage: <Icon name="calendar" size={18} color="#6B6B6B" />
//        <ServiceIcon id="residential" size={22} color="#00C896" />

const PATHS = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.7V21h14V9.7" /><path d="M9.5 21v-6h5v6" /></>,
  building: <><rect x="4" y="3" width="11" height="18" rx="1.5" /><path d="M15 9h4.5a.5.5 0 0 1 .5.5V21" /><path d="M2.5 21h19" /><path d="M7.5 7.5h1.5M7.5 11h1.5M7.5 14.5h1.5M11 7.5h1.5M11 11h1.5M11 14.5h1.5" /></>,
  factory: <><path d="M2.5 21V9.5l6 4v-4l6 4V4.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V21" /><path d="M2.5 21h19" /><path d="M6.5 17.5h2M11.5 17.5h2M16.5 17.5h2" /></>,
  leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></>,
  medical: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M12 11v6M9 14h6" /></>,
  sofa: <><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" /><path d="M5 11a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2" /><path d="M4 18v2M20 18v2" /><path d="M5 13h14" /></>,
  hammer: <><path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9" /><path d="m17.64 15 4-4" /><path d="m20.91 11.7-1.25-1.25a2 2 0 0 1-.59-1.42V7.9l-2.27-2.27a6 6 0 0 0-4.24-1.76L9.4 3.86l.82.82a6 6 0 0 1 1.76 4.24v1.15l2.13 2.13h1.15a2 2 0 0 1 1.42.59l1.25 1.25" /></>,
  sparkles: <><path d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9Z" /><path d="M19 15.5l.85 2.4 2.4.85-2.4.85L19 22l-.85-2.4-2.4-.85 2.4-.85Z" /></>,
  bucket: <><path d="M5 8.5h14l-1.7 10.6a2 2 0 0 1-2 1.7H8.7a2 2 0 0 1-2-1.7Z" /><path d="M7.5 8.5a4.5 4.5 0 0 1 9 0" /></>,
  pin: <><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.6" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="17" rx="2" /><path d="M8 2.5v4M16 2.5v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 1.8" /></>,
  ruler: <><rect x="2.6" y="9" width="18.8" height="6" rx="1.5" transform="rotate(-45 12 12)" /><path d="m8.5 12.5 1.4 1.4M11.3 9.7l1.4 1.4M14.1 6.9l1.4 1.4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  users: <><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.6a3.5 3.5 0 0 1 0 5.8M17.8 14.1A6.5 6.5 0 0 1 21.5 20" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19" /><path d="M6.5 15h4" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="18" rx="2" /><path d="M9 4a2 2 0 0 1 6 0" /><path d="M9 10.5h6M9 14h6M9 17.5h3.5" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.2 2.4 2.4 4.9-5" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6L12 16.8l-5.4 2.9 1.1-6L3.2 9.4l6.1-.8Z" />,
  briefcase: <><rect x="3" y="7.5" width="18" height="13" rx="2" /><path d="M9 7.5V5.7A1.7 1.7 0 0 1 10.7 4h2.6A1.7 1.7 0 0 1 15 5.7v1.8" /><path d="M3 12.7h18" /></>,
  logout: <><path d="M9 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2H9" /><path d="m16 16.5 4.5-4.5L16 7.5" /><path d="M20.5 12H9.5" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10.5" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  chevronRight: <path d="M9 18l6-6-6-6" />,
  chevronLeft: <path d="M15 18l-6-6 6-6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  whatsapp: <><path d="M17.5 14.4c-.3-.15-1.7-.85-2-.94-.27-.1-.46-.15-.65.15-.2.3-.75.94-.9 1.13-.18.2-.33.22-.6.08-.3-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.3-.02-.46.13-.6.13-.13.3-.34.44-.5.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.65-1.58-.9-2.16-.24-.58-.48-.5-.65-.5h-.56c-.2 0-.5.08-.77.38S6 8.24 6 9.55c0 1.32.96 2.6 1.1 2.78.13.18 1.9 2.9 4.6 4.07.64.28 1.15.44 1.53.57.65.2 1.24.18 1.7.1.52-.08 1.6-.65 1.83-1.28.22-.63.22-1.16.15-1.28-.06-.12-.24-.2-.5-.34Z" /><path d="M12 21a9 9 0 1 1 9-9 9 9 0 0 1-9 9Zm0 0-4.5 1.2 1.2-4.4" /></>,
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />,
  alertTriangle: <><path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9.5V14M12 17.5h.01" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  car: <><path d="M5 16.5 6.4 11a2 2 0 0 1 2-1.5h7.4a2 2 0 0 1 2 1.5L19 16.5" /><path d="M4 16.5h16a1 1 0 0 1 1 1V20h-3v-1.5H6V20H3v-2.5a1 1 0 0 1 1-1Z" /><path d="M6.8 14h.01M17.2 14h.01" /></>,
  navigation: <path d="M21 3 3 10.5l7.5 3L13.5 21Z" />,
  radio: <><circle cx="12" cy="12" r="2.2" /><path d="M7.75 16.25a6 6 0 0 1 0-8.5M16.25 7.75a6 6 0 0 1 0 8.5" /><path d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2" /></>,
  wallet: <><path d="M20 7H5a2 2 0 0 1 0-4h13v4" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1" /><path d="M16.5 13.5h.01" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></>,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z" /></>,
  fileText: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6" /><path d="M9 13h6M9 17h6" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.25a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7a2 2 0 0 1 1.7 2Z" />,
  mail: <><rect x="2.5" y="4.5" width="19" height="15" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></>,
  camera: <><path d="M4 8h2.5l1.5-2.5h8L17.5 8H20a1.5 1.5 0 0 1 1.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 19V9.5A1.5 1.5 0 0 1 4 8Z" /><circle cx="12" cy="13.7" r="3.4" /></>,
  zap: <path d="M13 2 4.5 13.5H11L9.5 22 18.5 10H12Z" />,
  shield: <><path d="M12 22s8-3.5 8-10V5.5L12 2 4 5.5V12c0 6.5 8 10 8 10Z" /><path d="m9 11.6 2.2 2.2 4-4.2" /></>,
  tag: <><path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8l-6.6 6.6a2 2 0 0 1-2.8 0L3.2 12A2 2 0 0 1 2.6 10.6V4.6a2 2 0 0 1 2-2h6a2 2 0 0 1 1.4.6Z" /><circle cx="8" cy="8" r="1.4" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M12 11.5V16" /></>,
  sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.3M12 19.2v2.3M4.5 12H2.2M21.8 12h-2.3M5.7 5.7l1.6 1.6M16.7 16.7l1.6 1.6M18.3 5.7l-1.6 1.6M7.3 16.7l-1.6 1.6" /></>,
  moon: <path d="M20.5 14.7A8.5 8.5 0 1 1 9.3 3.5a7 7 0 0 0 11.2 11.2Z" />,
  device: <><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M11 18.2h2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 17.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" /></>
}

// Which line icon represents each cleaning service
const SERVICE_ICON = {
  residential: 'home',
  industrial: 'factory',
  office: 'building',
  gardening: 'leaf',
  medical: 'medical',
  carpet: 'sofa',
  postConstruction: 'hammer',
  event: 'sparkles'
}

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2, style }) {
  const paths = PATHS[name]
  if (!paths) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} aria-hidden="true"
    >
      {paths}
    </svg>
  )
}

export function ServiceIcon({ id, size = 22, color = '#00C896', strokeWidth = 2, style }) {
  return <Icon name={SERVICE_ICON[id] || 'bucket'} size={size} color={color} strokeWidth={strokeWidth} style={style} />
}

// Tinted circle wrapper — the standard way service icons appear in lists
export function ServiceBadge({ id, size = 44, iconSize = 22 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'rgba(0,200,150,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      <ServiceIcon id={id} size={iconSize} />
    </div>
  )
}

// Initials avatar — realistic fallback when no photo is available
export function InitialsAvatar({ name, size = 64, fontSize }) {
  const initials = String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'rgba(0,200,150,0.14)', color: '#00A87E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: fontSize || Math.round(size * 0.38), letterSpacing: '0.02em'
    }}>
      {initials || '?'}
    </div>
  )
}
