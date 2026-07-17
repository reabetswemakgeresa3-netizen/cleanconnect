import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // iOS detection
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    // Show iOS banner after delay if not dismissed
    if (ios && !localStorage.getItem('pwa-dismissed')) {
      setTimeout(() => setShowBanner(true), 3000)
    }

    // Android / Chrome install prompt
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!localStorage.getItem('pwa-dismissed')) {
        setTimeout(() => setShowBanner(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowBanner(false)
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  if (isInstalled || !showBanner) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
      background: '#F6F6F6', borderTop: '1px solid #E8E8E8',
      padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
      animation: 'slideUp 0.3s ease'
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

      {/* App icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(135deg,#00C896,#00A87E)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22
      }}>✦</div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#000000', fontSize: 15, fontFamily: 'Inter' }}>
          Install CleanConnect
        </div>
        {isIOS ? (
          <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>
            Tap <strong style={{ color: '#00C896' }}>Share</strong> then <strong style={{ color: '#00C896' }}>"Add to Home Screen"</strong>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>
            Add to your home screen — works like a real app
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={handleDismiss} style={{
          background: 'transparent', border: '1px solid #E8E8E8',
          color: '#6B6B6B', padding: '8px 14px', borderRadius: 8,
          fontSize: 13, cursor: 'pointer'
        }}>Later</button>

        {!isIOS && (
          <button onClick={handleInstall} style={{
            background: '#00C896', border: 'none',
            color: '#FFFFFF', padding: '8px 16px', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}>Install</button>
        )}
      </div>
    </div>
  )
}
