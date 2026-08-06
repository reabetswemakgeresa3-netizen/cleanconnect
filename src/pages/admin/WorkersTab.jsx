import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { ServiceBadge, InitialsAvatar } from '../../components/Icons'
import LiveTrackingMap from '../../components/LiveTrackingMap'
import { STATUS_CONFIG, formatCurrency } from '../../data/services'
import { EmptyState, LoadingState, Pagination } from './shared'

const PER_PAGE = 50

export default function WorkersTab({ cleaners, bookings, loading, updateCleaner }) {
  const [search, setSearch] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(null)
  const [notifCounts, setNotifCounts] = useState({})

  useEffect(() => {
    supabase.from('worker_notifications').select('cleaner_id')
      .then(({ data }) => {
        const counts = {}
        for (const row of data || []) counts[row.cleaner_id] = (counts[row.cleaner_id] || 0) + 1
        setNotifCounts(counts)
      })
  }, [])

  const jobsByCleanerAccepted = useMemo(() => {
    const map = {}
    for (const b of bookings) {
      if (!b.accepted_by) continue
      map[b.accepted_by] = (map[b.accepted_by] || 0) + 1
    }
    return map
  }, [bookings])

  const filtered = cleaners.filter(c => {
    if (verifiedFilter === 'verified' && !c.verified) return false
    if (verifiedFilter === 'unverified' && c.verified) return false
    if (!search) return true
    const s = search.toLowerCase()
    return c.name?.toLowerCase().includes(s) || c.phone?.includes(search)
  })

  const maxPage = Math.max(0, Math.ceil(filtered.length / PER_PAGE) - 1)
  const safePage = Math.min(page, maxPage)
  const pageRows = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE)

  if (loading) return <LoadingState label="Loading cleaners..." />

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input-field" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
        <select className="input-field" value={verifiedFilter} onChange={e => setVerifiedFilter(e.target.value)} style={{ width: 'auto', cursor: 'pointer' }}>
          <option value="all">All Cleaners</option>
          <option value="verified">Verified Only</option>
          <option value="unverified">Unverified Only</option>
        </select>
      </div>

      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {cleaners.length} cleaners
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="briefcase" message="No cleaners found" />
      ) : (
        <>
          <div style={{ display: 'grid', gap: 12 }}>
            {pageRows.map(c => {
              const accepted = jobsByCleanerAccepted[c.id] || 0
              const notified = notifCounts[c.id] || 0
              const missed = Math.max(0, notified - accepted)
              return (
                <div key={c.id} style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div onClick={() => setSelected(c)} style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}>
                    {c.avatar_url ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <InitialsAvatar name={c.name} size={46} />}
                  </div>
                  <div onClick={() => setSelected(c)} style={{ flex: 1, minWidth: 160, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{c.name}</span>
                      {c.verified && <span style={{ color: '#00C896', fontSize: 11, fontWeight: 600 }}>✓ Verified</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{c.phone || '—'} · ★ {c.rating} · {c.total_jobs} jobs</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', minWidth: 120 }}>
                    {accepted} accepted{notified ? ` · ${missed} missed` : ''}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
                    background: c.available ? 'rgba(0,200,150,0.12)' : 'var(--tile-2)',
                    color: c.available ? '#00C896' : 'var(--text-dim)'
                  }}>{c.available ? 'Available' : 'Unavailable'}</span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => updateCleaner(c.id, { verified: !c.verified })} style={actionBtn(c.verified)}>
                      {c.verified ? 'Unverify' : 'Verify'}
                    </button>
                    <button onClick={() => updateCleaner(c.id, { verified: false, available: false })} style={{ ...actionBtn(false), color: '#E11900', borderColor: 'rgba(225,25,0,0.3)' }}>
                      Deactivate
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <Pagination page={safePage} setPage={setPage} total={filtered.length} perPage={PER_PAGE} />
        </>
      )}

      {selected && (
        <WorkerModal
          cleaner={selected}
          bookings={bookings.filter(b => b.accepted_by === selected.id || b.cleaner_id === selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function actionBtn(active) {
  return {
    background: active ? 'rgba(0,200,150,0.1)' : 'var(--tile-2)',
    border: `1px solid ${active ? 'rgba(0,200,150,0.3)' : 'var(--border)'}`,
    color: active ? '#00C896' : 'var(--text-muted)',
    padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44
  }
}

function WorkerModal({ cleaner, bookings, onClose }) {
  const [now] = useState(() => Date.now())
  const completed = bookings.filter(b => b.status === 'completed')
  const earnings = completed.filter(b => b.payment_status === 'paid').reduce((s, b) => s + (b.amount || 0), 0)
  const isSharing = cleaner.current_lat != null && cleaner.location_updated_at &&
    (now - new Date(cleaner.location_updated_at).getTime()) < 5 * 60 * 1000
  const sorted = bookings.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(24px + var(--sat)) calc(24px + var(--sar)) calc(24px + var(--sab)) calc(24px + var(--sal))', backdropFilter: 'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden' }}>
              {cleaner.avatar_url ? <img src={cleaner.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <InitialsAvatar name={cleaner.name} size={52} />}
            </div>
            <div>
              <h2 style={{ fontSize: 20 }}>{cleaner.name}</h2>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{cleaner.phone || '—'} · {cleaner.location}, {cleaner.province}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--tile-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', width: 36, height: 36, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Rating', value: `★ ${cleaner.rating}` },
            { label: 'Jobs Completed', value: completed.length },
            { label: 'Total Earnings', value: formatCurrency(earnings) },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--tile-2)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
              <div style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter', fontSize: 16 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {isSharing && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Location</div>
            <LiveTrackingMap cleanerId={cleaner.id} cleanerName={cleaner.name} />
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Job History</div>
        {sorted.length === 0 ? (
          <EmptyState icon="clipboard" message="No jobs yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map(b => {
              const conf = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--tile-2)', borderRadius: 10, padding: '10px 14px', flexWrap: 'wrap' }}>
                  <ServiceBadge id={b.service_id} size={36} iconSize={18} />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{b.service_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{b.booking_date} · {b.contact_name}</div>
                  </div>
                  <span className={`badge ${conf.color}`} style={{ fontSize: 11 }}>{conf.label}</span>
                  <span style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter', fontSize: 13.5 }}>{formatCurrency(b.amount)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
