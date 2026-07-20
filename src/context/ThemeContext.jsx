import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({})
const STORAGE_KEY = 'cc-theme'
const THEME_COLOR = { light: '#FFFFFF', dark: '#0D1117' }

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

// index.html already set data-theme synchronously before paint; read it back
// here so React's first render matches what's on screen (no mismatch flash).
function getInitialPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'system'
  } catch {
    return 'system'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialPreference) // 'light' | 'dark' | 'system'
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    document.documentElement.getAttribute('data-theme') || 'light'
  )

  const applyResolved = (mode) => {
    const resolved = mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode
    document.documentElement.setAttribute('data-theme', resolved)
    const meta = document.getElementById('theme-color-meta')
    if (meta) meta.setAttribute('content', THEME_COLOR[resolved])
    setResolvedTheme(resolved)
  }

  useEffect(() => {
    applyResolved(theme)
  }, [theme])

  // Follow OS changes live while the user has picked "System"
  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyResolved('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = (mode) => {
    setThemeState(mode)
    try { localStorage.setItem(STORAGE_KEY, mode) } catch { /* private browsing etc. */ }
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
