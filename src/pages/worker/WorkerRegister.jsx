import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { SERVICES, PROVINCES } from '../../data/services'
import Logo from '../../components/Logo'
import { Icon } from '../../components/Icons'

const LANGUAGES = ['English', 'isiZulu', 'isiXhosa', 'Afrikaans', 'Sepedi', 'Setswana', 'Sesotho', 'Xitsonga', 'siSwati', 'Tshivenda', 'isiNdebele']

export default function WorkerRegister() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: user?.user_metadata?.full_name || '',
    phone: user?.user_metadata?.phone || '',
    location: '',
    province: 'Gauteng',
    bio: ''
  })
  const [specialties, setSpecialties] = useState([])
  const [languages, setLanguages] = useState(['English'])
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Already registered? Go straight to the dashboard.
  useEffect(() => {
    if (!user) return
    supabase.from('cleaners').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) navigate('/worker', { replace: true }) })
  }, [user, navigate])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return setError('Photo must be under 5 MB')
    setError('')
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const toggle = (list, setList, value) =>
    setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (specialties.length === 0) return setError('Select at least one service you offer')
    setLoading(true)
    try {
      // Upload profile photo first (registration still goes through if it fails)
      let avatarUrl = null
      if (photo) {
        const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${user.id}/avatar-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('cleaner-photos')
          .upload(path, photo, { upsert: true, contentType: photo.type || undefined })
        if (!uploadError) {
          avatarUrl = supabase.storage.from('cleaner-photos').getPublicUrl(path).data.publicUrl
        }
      }

      const { error: insertError } = await supabase.from('cleaners').insert({
        user_id: user.id,
        avatar_url: avatarUrl,
        name: form.name,
        email: user.email || null,
        phone: form.phone,
        location: form.location,
        province: form.province,
        specialties,
        languages,
        bio: form.bio,
        available: true
      })
      if (insertError) throw insertError
      navigate('/worker')
    } catch (err) {
      setError(err.message || 'Could not complete registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ paddingTop: 68, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Logo variant="tile" size={64} /></div>
          <h1 style={{ fontSize: 30, marginBottom: 8 }}>Become a CleanConnect Worker</h1>
          <p style={{ color: 'var(--text-muted)' }}>Register once, get assigned jobs, earn on your schedule</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--tile-2)', borderRadius: 20, padding: 36, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 30px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: 'rgba(225,25,0,0.1)', border: '1px solid rgba(225,25,0,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#E11900', fontSize: 14 }}>{error}</div>
            )}

            <Field label="Profile photo (optional)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: 'var(--tile)', border: '1.5px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30
                }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="Your profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Icon name="camera" size={26} color="var(--text-dim)" />}
                </div>
                <div>
                  <label className="btn-outline" style={{ cursor: 'pointer', display: 'inline-block', padding: '10px 18px', fontSize: 14 }}>
                    {photo ? 'Change photo' : 'Upload a photo'}
                    <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                  </label>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                    A clear, friendly face photo gets you more jobs. Max 5 MB.
                  </p>
                </div>
              </div>
            </Field>

            <Field label="Full name">
              <input className="input-field" placeholder="Zanele Dlamini" value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="Phone number">
              <input className="input-field" type="tel" placeholder="072 123 4567" value={form.phone} onChange={set('phone')} required />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="City / Area">
                <input className="input-field" placeholder="Johannesburg" value={form.location} onChange={set('location')} required />
              </Field>
              <Field label="Province">
                <select className="input-field" value={form.province} onChange={set('province')} style={{ cursor: 'pointer' }}>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Services you offer">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SERVICES.map(s => (
                  <Chip key={s.id} active={specialties.includes(s.name)} onClick={() => toggle(specialties, setSpecialties, s.name)}>
                    {s.name}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Languages">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {LANGUAGES.map(l => (
                  <Chip key={l} active={languages.includes(l)} onClick={() => toggle(languages, setLanguages, l)}>
                    {l}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Short bio (optional)">
              <textarea className="input-field" rows={3} placeholder="Tell customers about your experience..."
                value={form.bio} onChange={set('bio')} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </Field>

            <button type="submit" className="btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: 16, fontSize: 16 }}>
              {loading ? 'Registering...' : 'Register as a Worker →'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', marginTop: 12 }}>
              Your profile will be reviewed and verified by the CleanConnect team.
            </p>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-muted)', fontSize: 15 }}>
          Already registered? <Link to="/worker" style={{ color: '#00C896', fontWeight: 500 }}>Go to your jobs</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '10px 14px', borderRadius: 100, fontSize: 13, cursor: 'pointer', minHeight: 44,
      border: `1.5px solid ${active ? '#00C896' : 'var(--border)'}`,
      background: active ? 'rgba(0,200,150,0.1)' : 'transparent',
      color: active ? '#00C896' : 'var(--text-muted)', transition: 'all 0.2s'
    }}>{children}</button>
  )
}
