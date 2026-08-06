import { useState, useMemo } from 'react'
import { ServiceIcon } from '../../components/Icons'
import { SERVICES, formatCurrency } from '../../data/services'
import { EmptyState, Pagination, downloadCSV } from './shared'

const PER_PAGE = 50

export default function FinancialsTab({ bookings }) {
  const [page, setPage] = useState(0)

  const byService = useMemo(() => SERVICES.map(s => ({
    ...s,
    count: bookings.filter(b => b.service_id === s.id).length,
    revenue: bookings.filter(b => b.service_id === s.id && b.payment_status === 'paid').reduce((sum, b) => sum + (b.amount || 0), 0)
  })).filter(s => s.count > 0).sort((a, b) => b.revenue - a.revenue), [bookings])

  const byProvince = useMemo(() => Object.entries(bookings.reduce((acc, b) => {
    acc[b.province] = acc[b.province] || { count: 0, revenue: 0 }
    acc[b.province].count++
    if (b.payment_status === 'paid') acc[b.province].revenue += b.amount || 0
    return acc
  }, {})).sort((a, b) => b[1].revenue - a[1].revenue), [bookings])

  const byDay = useMemo(() => {
    const days = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const revenue = bookings.filter(b => b.payment_status === 'paid' && b.created_at?.slice(0, 10) === key)
        .reduce((s, b) => s + (b.amount || 0), 0)
      days.push({ key, label: d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }), revenue })
    }
    return days
  }, [bookings])

  const paymentTotals = useMemo(() => {
    const totals = { paid: 0, unpaid: 0, refunded: 0, 'pending-review': 0 }
    for (const b of bookings) totals[b.payment_status] = (totals[b.payment_status] || 0) + (b.amount || 0)
    return totals
  }, [bookings])

  const maxRevenue = Math.max(...byService.map(s => s.revenue), 1)
  const maxProv = Math.max(...byProvince.map(([, v]) => v.revenue), 1)
  const maxDay = Math.max(...byDay.map(d => d.revenue), 1)

  const transactions = bookings.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const pageRows = transactions.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  const exportCSV = () => {
    downloadCSV(`cleanconnect-bookings-${new Date().toISOString().slice(0, 10)}.csv`, bookings, [
      { label: 'Booking ID', value: b => b.id },
      { label: 'Customer', value: b => b.contact_name },
      { label: 'Phone', value: b => b.contact_phone },
      { label: 'Service', value: b => b.service_name },
      { label: 'City', value: b => b.city },
      { label: 'Province', value: b => b.province },
      { label: 'Date', value: b => b.booking_date },
      { label: 'Amount', value: b => b.amount },
      { label: 'Status', value: b => b.status },
      { label: 'Payment Status', value: b => b.payment_status },
      { label: 'Payment Method', value: b => b.payment_method },
      { label: 'Payment Reference', value: b => b.payment_reference },
      { label: 'Created At', value: b => b.created_at },
    ])
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={exportCSV} className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>
          Export Bookings to CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Paid', value: formatCurrency(paymentTotals.paid), color: '#00C896' },
          { label: 'Unpaid', value: formatCurrency(paymentTotals.unpaid), color: '#C46A00' },
          { label: 'Refunded', value: formatCurrency(paymentTotals.refunded), color: '#E11900' },
          { label: 'Refund Pending Review', value: formatCurrency(paymentTotals['pending-review']), color: '#C46A00' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Inter', color: s.color, marginBottom: 3 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px,1fr))', gap: 20, marginBottom: 28 }}>
        <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: 15, marginBottom: 20, color: 'var(--text-muted)' }}>Revenue — Last 14 Days</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
            {byDay.map(d => (
              <div key={d.key} title={`${d.label}: ${formatCurrency(d.revenue)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: '100%', height: Math.max(2, (d.revenue / maxDay) * 100), background: 'linear-gradient(180deg,#00E5B0,#00C896)', borderRadius: '4px 4px 0 0' }} />
                <span style={{ fontSize: 9.5, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, marginBottom: 20, color: 'var(--text-muted)' }}>Revenue by Service</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {byService.map(s => (
              <div key={s.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ServiceIcon id={s.id} size={14} color="var(--text-muted)" /> {s.name}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{formatCurrency(s.revenue)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--tile-2)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(s.revenue / maxRevenue) * 100}%`, background: 'linear-gradient(90deg,#00C896,#00E5B0)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, marginBottom: 20, color: 'var(--text-muted)' }}>Revenue by Province</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {byProvince.map(([province, data]) => (
              <div key={province}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{province}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{formatCurrency(data.revenue)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--tile-2)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(data.revenue / maxProv) * 100}%`, background: 'linear-gradient(90deg,#276EF1,#5B93F5)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: 16, marginBottom: 14, color: 'var(--text)' }}>Transactions</h3>
      {transactions.length === 0 ? (
        <EmptyState icon="wallet" message="No transactions yet" />
      ) : (
        <>
          <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            {pageRows.map((b, i) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'Inter', minWidth: 90 }}>{b.id}</span>
                <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text)' }}>{b.contact_name} · {b.service_name}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
                  background: b.payment_status === 'paid' ? 'rgba(0,200,150,0.12)' : b.payment_status === 'refunded' ? 'rgba(225,25,0,0.1)' : 'var(--tile-2)',
                  color: b.payment_status === 'paid' ? '#00C896' : b.payment_status === 'refunded' ? '#E11900' : 'var(--text-muted)'
                }}>{b.payment_status}</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{b.payment_method === 'cash' ? 'Cash' : 'Yoco'}</span>
                <span style={{ color: '#00C896', fontWeight: 700, fontFamily: 'Inter', fontSize: 14, minWidth: 80, textAlign: 'right' }}>{formatCurrency(b.amount)}</span>
              </div>
            ))}
          </div>
          <Pagination page={page} setPage={setPage} total={transactions.length} perPage={PER_PAGE} />
        </>
      )}
    </div>
  )
}
