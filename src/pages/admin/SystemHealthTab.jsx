import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Icon } from '../../components/Icons'
import { EmptyState } from './shared'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || ''

const QUICK_LINKS = [
  { label: 'Supabase Dashboard', url: projectRef ? `https://supabase.com/dashboard/project/${projectRef}` : 'https://supabase.com/dashboard' },
  { label: 'Netlify Dashboard', url: 'https://app.netlify.com/' },
  { label: 'Twilio Console', url: 'https://console.twilio.com/' },
  { label: 'Yoco Portal', url: 'https://portal.yoco.com/' },
]

export default function SystemHealthTab() {
  const [health, setHealth] = useState(null)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const [notes, setNotes] = useState([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchNotes = () => {
    setLoadingNotes(true)
    supabase.from('admin_notes').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setNotes(data || []); setLoadingNotes(false) })
  }

  useEffect(() => { fetchNotes() }, [])

  const runCheck = async () => {
    setChecking(true)
    setCheckError('')
    setHealth(null)
    try {
      const { data, error } = await supabase.functions.invoke('system-health', { body: {} })
      if (error) throw new Error(data?.error || error.message || 'Health check failed.')
      if (data?.error) throw new Error(data.error)
      setHealth(data)
    } catch (err) {
      setCheckError(err.message || 'Health check failed.')
    } finally {
      setChecking(false)
    }
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    setAdding(true)
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('admin_notes').insert({ note: newNote.trim(), created_by: userData?.user?.id })
    setNewNote('')
    setAdding(false)
    fetchNotes()
  }

  const deleteNote = async (id) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    await supabase.from('admin_notes').delete().eq('id', id)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 20, marginBottom: 28 }}>
        <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, marginBottom: 16, color: 'var(--text-muted)' }}>Environment</h3>
          <Row label="Supabase Project" value={projectRef || 'unknown'} />
          <Row label="Supabase URL" value={supabaseUrl || 'not set'} mono small />
        </div>

        <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, color: 'var(--text-muted)' }}>Connections</h3>
            <button onClick={runCheck} disabled={checking} style={{
              padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--tile-2)',
              color: 'var(--text)', fontSize: 12, cursor: checking ? 'default' : 'pointer', minHeight: 44
            }}>{checking ? 'Checking…' : 'Run Check'}</button>
          </div>
          {checkError && <p style={{ color: '#E11900', fontSize: 12.5, marginBottom: 10 }}>{checkError}</p>}
          {!health && !checkError && !checking && <p style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Click "Run Check" to test Twilio and inspect the Yoco key mode.</p>}
          {health && (
            <>
              <StatusRow label="Twilio (WhatsApp)" ok={health.twilio?.ok} detail={health.twilio?.detail} />
              <StatusRow label="Yoco Key" ok={health.yoco?.configured} detail={health.yoco?.configured ? `Configured — ${health.yoco.mode} mode` : 'Not set'} />
            </>
          )}
        </div>

        <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, marginBottom: 16, color: 'var(--text-muted)' }}>Quick Links</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {QUICK_LINKS.map(l => (
              <a key={l.label} href={l.url} target="_blank" rel="noreferrer" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px',
                borderRadius: 8, background: 'var(--tile-2)', color: 'var(--text)', fontSize: 13.5, textDecoration: 'none'
              }}>
                {l.label} <span style={{ color: 'var(--text-dim)' }}>↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: 16, marginBottom: 4, color: 'var(--text)' }}>Known Issues / Notes</h3>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
        Edge Function invocation logs aren't accessible from a client app — track anything noticed here instead.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input className="input-field" placeholder="Add a note..." value={newNote} onChange={e => setNewNote(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addNote()} style={{ flex: 1 }} />
        <button onClick={addNote} disabled={adding || !newNote.trim()} className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>
          Add
        </button>
      </div>

      {loadingNotes ? null : notes.length === 0 ? (
        <EmptyState icon="fileText" message="No notes yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map(n => (
            <div key={n.id} style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{n.note}</p>
                <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{new Date(n.created_at).toLocaleString('en-ZA')}</span>
              </div>
              <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono, small }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--tile-2)', gap: 12 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
      <span style={{ color: 'var(--text)', fontSize: small ? 11.5 : 13, fontWeight: 500, fontFamily: mono ? 'Inter' : undefined, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}

function StatusRow({ label, ok, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <Icon name={ok ? 'checkCircle' : 'alertTriangle'} size={16} color={ok ? '#00C896' : '#E11900'} />
      <div>
        <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{detail}</div>
      </div>
    </div>
  )
}
