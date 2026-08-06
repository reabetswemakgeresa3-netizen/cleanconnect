import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { EmptyState, LoadingState, Pagination } from './shared'

const PER_PAGE = 50

export default function MessagesTab() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [notesDraft, setNotesDraft] = useState({})
  const [savingId, setSavingId] = useState(null)

  useEffect(() => { fetchMessages() }, [])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setMessages(data || [])
    } finally {
      setLoading(false)
    }
  }

  const toggleRead = async (msg) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: !m.read } : m))
    await supabase.from('contact_messages').update({ read: !msg.read }).eq('id', msg.id)
  }

  const saveNotes = async (msg) => {
    const note = notesDraft[msg.id] ?? msg.admin_notes ?? ''
    setSavingId(msg.id)
    await supabase.from('contact_messages').update({ admin_notes: note }).eq('id', msg.id)
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, admin_notes: note } : m))
    setSavingId(null)
  }

  const filtered = messages.filter(m => filter === 'all' ? true : filter === 'unread' ? !m.read : m.read)
  const maxPage = Math.max(0, Math.ceil(filtered.length / PER_PAGE) - 1)
  const safePage = Math.min(page, maxPage)
  const pageRows = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE)

  if (loading) return <LoadingState label="Loading messages..." />

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'all', label: `All (${messages.length})` },
          { id: 'unread', label: `Unread (${messages.filter(m => !m.read).length})` },
          { id: 'read', label: 'Resolved' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '8px 16px', borderRadius: 100, fontSize: 13, cursor: 'pointer',
            border: `1.5px solid ${filter === f.id ? '#00C896' : 'var(--border)'}`,
            background: filter === f.id ? 'rgba(0,200,150,0.1)' : 'transparent',
            color: filter === f.id ? '#00C896' : 'var(--text-muted)'
          }}>{f.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="mail" message="No messages" />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pageRows.map(m => (
              <div key={m.id} style={{ background: 'var(--tile)', border: `1px solid ${m.read ? 'var(--border)' : 'rgba(0,200,150,0.3)'}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{new Date(m.created_at).toLocaleString('en-ZA')}</span>
                    <button onClick={() => toggleRead(m)} style={{
                      padding: '6px 14px', borderRadius: 100, fontSize: 12, cursor: 'pointer',
                      border: `1px solid ${m.read ? 'var(--border)' : '#00C896'}`,
                      background: m.read ? 'var(--tile-2)' : 'rgba(0,200,150,0.1)',
                      color: m.read ? 'var(--text-muted)' : '#00C896', fontWeight: 600
                    }}>{m.read ? 'Mark Unread' : 'Mark Resolved'}</button>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 14 }}>{m.message}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="input-field"
                    placeholder="Internal note (not visible to customer)..."
                    value={notesDraft[m.id] ?? m.admin_notes ?? ''}
                    onChange={e => setNotesDraft(prev => ({ ...prev, [m.id]: e.target.value }))}
                    style={{ flex: 1, fontSize: 13 }}
                  />
                  <button onClick={() => saveNotes(m)} disabled={savingId === m.id} style={{
                    padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--tile-2)',
                    color: 'var(--text)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap'
                  }}>{savingId === m.id ? 'Saving…' : 'Save Note'}</button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={safePage} setPage={setPage} total={filtered.length} perPage={PER_PAGE} />
        </>
      )}
    </div>
  )
}
