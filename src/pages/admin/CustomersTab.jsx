import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { ServiceBadge, InitialsAvatar } from '../../components/Icons'
import { STATUS_CONFIG, formatCurrency } from '../../data/services'
import { EmptyState, LoadingState, Pagination } from './shared'

const PER_PAGE = 50

export default function CustomersTab({ bookings }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProfiles(data || []); setLoading(false) })
  }, [])

  const bookingsByUser = useMemo(() => {
    const map = {}
    for (const b of bookings) {
      if (!b.user_id) continue
      if (!map[b.user_id]) map[b.user_id] = []
      map[b.user_id].push(b)
    }
    return map
  }, [bookings])

  const customers = useMemo(() => profiles.map(p => {
    const own = bookingsByUser[p.id] || []
    const spent = own.filter(b => b.payment_status === 'paid').reduce((s, b) => s + (b.amount || 0), 0)
    const last = own.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    return { ...p, bookings: own, totalSpent: spent, lastBookingDate: last?.created_at }
  }), [profiles, bookingsByUser])

  const filtered = customers.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return c.full_name?.toLowerCase().includes(s) || c.phone?.includes(search) || c.email?.toLowerCase().includes(s)
  })

  const maxPage = Math.max(0, Math.ceil(filtered.length / PER_PAGE) - 1)
  const safePage = Math.min(page, maxPage)
  const pageRows = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE)

  if (loading) return <LoadingState label="Loading customers..." />

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <input className="input-field" placeholder="Search by name, phone, or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400 }} />
      </div>
      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {profiles.length} customers
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="users" message="No customers found" />
      ) : (
        <>
          <div style={{ display: 'grid', gap: 12 }}>
            {pageRows.map(c => (
              <div key={c.id} onClick={() => setSelected(c)} style={{
                background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 14,
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', flexWrap: 'wrap'
              }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                  {c.avatar_url ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <InitialsAvatar name={c.full_name} size={46} />}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>{c.full_name || 'Unnamed'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.phone || c.email || '—'}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Joined {new Date(c.created_at).toLocaleDateString('en-ZA')}</div>
                <div style={{ textAlign: 'right', minWidth: 90 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{c.bookings.length} booking{c.bookings.length === 1 ? '' : 's'}</div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 100 }}>
                  <div style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter', fontSize: 15 }}>{formatCurrency(c.totalSpent)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>total spent</div>
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: 18 }}>›</div>
              </div>
            ))}
          </div>
          <Pagination page={safePage} setPage={setPage} total={filtered.length} perPage={PER_PAGE} />
        </>
      )}

      {selected && <CustomerModal customer={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function CustomerModal({ customer, onClose }) {
  const sorted = customer.bookings.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(24px + var(--sat)) calc(24px + var(--sar)) calc(24px + var(--sab)) calc(24px + var(--sal))', backdropFilter: 'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden' }}>
              {customer.avatar_url ? <img src={customer.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <InitialsAvatar name={customer.full_name} size={52} />}
            </div>
            <div>
              <h2 style={{ fontSize: 20 }}>{customer.full_name || 'Unnamed'}</h2>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{customer.phone || '—'} {customer.email ? `· ${customer.email}` : ''}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--tile-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', width: 36, height: 36, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Signed Up', value: new Date(customer.created_at).toLocaleDateString('en-ZA') },
            { label: 'Total Bookings', value: customer.bookings.length },
            { label: 'Total Spent', value: formatCurrency(customer.totalSpent) },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--tile-2)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
              <div style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter', fontSize: 16 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Booking History</div>
        {sorted.length === 0 ? (
          <EmptyState icon="clipboard" message="No bookings yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map(b => {
              const conf = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--tile-2)', borderRadius: 10, padding: '10px 14px', flexWrap: 'wrap' }}>
                  <ServiceBadge id={b.service_id} size={36} iconSize={18} />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{b.service_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{b.booking_date} · {b.city}</div>
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
