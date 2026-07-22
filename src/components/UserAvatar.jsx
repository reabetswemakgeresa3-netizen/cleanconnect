import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Icon } from './Icons'
import PinSpinner from './PinSpinner'

function initialsOf(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image'))
    img.src = URL.createObjectURL(file)
  })
}

// Centered square crop, resized down to `size` — keeps uploads small and
// gives every avatar a consistent circle-ready square source image.
async function cropToSquare(file, size = 512) {
  const img = await loadImage(file)
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85))
}

// Circular avatar shown anywhere the user's identity appears. When
// `editable`, tapping it opens the take-photo/gallery/remove sheet and
// handles cropping + upload + saving to both profiles.avatar_url and
// auth user_metadata itself — consumers don't need any extra wiring.
export default function UserAvatar({ size = 40, editable = false, ringWidth }) {
  const { user } = useAuth()
  const [sheetOpen, setSheetOpen] = useState(false)
  const avatarUrl = user?.user_metadata?.avatar_url
  const name = user?.user_metadata?.full_name || user?.email || user?.phone
  const ring = ringWidth ?? Math.max(2, Math.round(size * 0.045))

  return (
    <>
      <button
        onClick={editable ? () => setSheetOpen(true) : undefined}
        aria-label={editable ? 'Change profile photo' : undefined}
        style={{
          position: 'relative', width: size, height: size, borderRadius: '50%',
          flexShrink: 0, background: 'transparent', cursor: editable ? 'pointer' : 'default'
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name || 'Profile'} style={{
            width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
            border: `${ring}px solid #00C896`, display: 'block'
          }} />
        ) : (
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: 'rgba(0,200,150,0.16)', color: '#00A87E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: Math.round(size * 0.38), letterSpacing: '0.02em'
          }}>
            {initialsOf(name)}
          </div>
        )}
        {editable && (
          <div style={{
            position: 'absolute', right: -2, bottom: -2,
            width: Math.max(18, Math.round(size * 0.32)), height: Math.max(18, Math.round(size * 0.32)),
            borderRadius: '50%', background: '#00C896', border: '2px solid var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="camera" size={Math.max(9, Math.round(size * 0.16))} color="#FFFFFF" strokeWidth={2.4} />
          </div>
        )}
      </button>

      {sheetOpen && <AvatarUploadSheet currentUrl={avatarUrl} onClose={() => setSheetOpen(false)} />}
    </>
  )
}

function AvatarUploadSheet({ currentUrl, onClose }) {
  const { user } = useAuth()
  const [pendingBlob, setPendingBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const galleryInput = useRef(null)
  const cameraInput = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again later
    if (!file) return
    setError('')
    try {
      const blob = await cropToSquare(file)
      setPendingBlob(blob)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch {
      setError('Could not process that image. Try a different photo.')
    }
  }

  const confirmUpload = async () => {
    if (!pendingBlob || !user) return
    setBusy(true)
    setError('')
    try {
      const path = `${user.id}/avatar-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, pendingBlob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

      await Promise.all([
        supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() }),
        supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
      ])

      onClose()
    } catch {
      setError('Upload failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const removePhoto = async () => {
    if (!user) return
    setBusy(true)
    setError('')
    try {
      await Promise.all([
        supabase.from('profiles').upsert({ id: user.id, avatar_url: null, updated_at: new Date().toISOString() }),
        supabase.auth.updateUser({ data: { avatar_url: null } })
      ])
      onClose()
    } catch {
      setError('Could not remove your photo. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1400,
      display: 'flex', alignItems: 'flex-end'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, margin: '0 auto', background: 'var(--surface)',
        borderRadius: '24px 24px 0 0', padding: `18px 22px calc(24px + var(--sab))`
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 18px' }} />

        {pendingBlob ? (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, marginBottom: 18 }}>Use this photo?</h3>
            <div style={{
              width: 160, height: 160, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 20px',
              border: '3px solid #00C896'
            }}>
              <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {error && <p style={{ color: '#E11900', fontSize: 13, marginBottom: 14 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setPendingBlob(null); setPreviewUrl(null); setError('') }} disabled={busy}
                className="btn-outline" style={{ flex: 1, justifyContent: 'center', padding: 14 }}>
                Retake
              </button>
              <button onClick={confirmUpload} disabled={busy} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: 14 }}>
                {busy ? <PinSpinner size={18} variant="mono" /> : 'Use Photo'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 18, marginBottom: 14 }}>Profile Photo</h3>
            {error && <p style={{ color: '#E11900', fontSize: 13, marginBottom: 14 }}>{error}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SheetRow icon="camera" label="Take Photo" onClick={() => cameraInput.current?.click()} disabled={busy} />
              <SheetRow icon="inbox" label="Choose from Gallery" onClick={() => galleryInput.current?.click()} disabled={busy} />
              {currentUrl && (
                <SheetRow icon="logout" label="Remove Photo" danger onClick={removePhoto} disabled={busy} />
              )}
              <button onClick={onClose} disabled={busy} style={{
                marginTop: 6, padding: 14, borderRadius: 12, background: 'transparent',
                color: 'var(--text-muted)', fontWeight: 600, fontSize: 15
              }}>
                Cancel
              </button>
            </div>
          </>
        )}

        <input ref={galleryInput} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        <input ref={cameraInput} type="file" accept="image/*" capture="user" onChange={handleFile} style={{ display: 'none' }} />
      </div>
    </div>
  )
}

function SheetRow({ icon, label, onClick, disabled, danger }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '13px 10px',
      borderRadius: 12, background: 'var(--tile)', textAlign: 'left'
    }}>
      <Icon name={icon} size={19} color={danger ? '#E11900' : 'var(--text)'} />
      <span style={{ fontSize: 15.5, fontWeight: 600, color: danger ? '#E11900' : 'var(--text)' }}>{label}</span>
    </button>
  )
}
