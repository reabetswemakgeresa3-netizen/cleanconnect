import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Icon, ServiceBadge } from '../../components/Icons'
import { SERVICES, STATUS_CONFIG, formatCurrency } from '../../data/services'

// What the worker can do next for each booking status
const NEXT_ACTION = {
  pending: { to: 'confirmed', label: 'Accept Job' },
  confirmed: { to: 'in-progress', label: 'Start Job' },
  'in-progress': { to: 'completed', label: 'Mark Complete' }
}

export default function WorkerDashboard() {
  const { user } = useAuth()
  const [cleaner, setCleaner] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: cleanerRow } = await supabase
        .from('cleaners').select('*').eq('user_id', user.id).maybeSingle()
      setCleaner(cleanerRow)

      if (cleanerRow) {
        const { data: bookings } = await supabase
          .from('bookings').select('*')
          .eq('cleaner_id', cleanerRow.id)
          .order('booking_date', { ascending: true })
        setJobs(bookings || [])
      }
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => { fetchData() }, [fetchData])

  const updateStatus = async (jobId, status) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j))
    const { error } = await supabase.from('bookings').update({ status }).eq('id', jobId)
    if (error) fetchData() // revert optimistic update if it failed
  }

  const toggleAvailable = async () => {
    const available = !cleaner.available
    setCleaner(c => ({ ...c, available }))
    await supabase.from('cleaners').update({ available }).eq('id', cleaner.id)
  }

  if (loading) return <CenteredNote icon="⏳" text="Loading your jobs..." />

  if (!cleaner) return (
    <div style={{ paddingTop: 68, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
      <div style={{ textAlign: 'center', padding: 24, maxWidth: 440 }}>
        <div style={{ marginBottom: 20 }}><Icon name="bucket" size={52} color="#D5D5D5" /></div>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>You're not registered as a worker yet</h2>
        <p style={{ color: '#6B6B6B', marginBottom: 28 }}>Join CleanConnect Workers to receive cleaning jobs in your area.</p>
        <Link to="/worker/register" className="btn-primary">Register as a Worker →</Link>
      </div>
    </div>
  )

  const active = jobs.filter(j => !['completed', 'cancelled'].includes(j.status))
  const done = jobs.filter(j => ['completed', 'cancelled'].includes(j.status))
  const shown = filter === 'active' ? active : done

  const stats = {
    today: active.filter(j => j.booking_date === new Date().toISOString().slice(0, 10)).length,
    active: active.length,
    completed: jobs.filter(j => j.status === 'completed').length,
    earned: jobs.filter(j => j.status === 'completed' && j.payment_status === 'paid')
      .reduce((s, j) => s + (j.amount || 0), 0)
  }

  return (
    <div style={{ paddingTop: 68, minHeight: '100vh', background: '#FFFFFF' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 30, marginBottom: 6 }}>
              Hi, {cleaner.name?.split(' ')[0]}
            </h1>
            <p style={{ color: '#6B6B6B', fontSize: 15 }}>
              {cleaner.location}, {cleaner.province} {cleaner.verified && <span style={{ color: '#00C896' }}>· ✓ Verified</span>}
            </p>
          </div>
          <button onClick={toggleAvailable} style={{
            padding: '10px 20px', borderRadius: 100, cursor: 'pointer', fontSize: 14, fontWeight: 500,
            border: `1.5px solid ${cleaner.available ? '#00C896' : '#E8E8E8'}`,
            background: cleaner.available ? 'rgba(0,200,150,0.1)' : '#F6F6F6',
            color: cleaner.available ? '#00C896' : '#6B6B6B', transition: 'all 0.2s'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cleaner.available ? '#00C896' : '#9E9E9E', display: 'inline-block' }} />
              {cleaner.available ? 'Available for jobs' : 'Unavailable'}
            </span>
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 14, marginBottom: 32 }}>
          {[
            { label: 'Jobs Today', value: stats.today, icon: 'calendar', color: '#276EF1' },
            { label: 'Active Jobs', value: stats.active, icon: 'refresh', color: '#C46A00' },
            { label: 'Completed', value: stats.completed, icon: 'checkCircle', color: '#00C896' },
            { label: 'Total Earned', value: formatCurrency(stats.earned), icon: 'wallet', color: '#00C896' }
          ].map(s => (
            <div key={s.label} style={{ background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ marginBottom: 8 }}><Icon name={s.icon} size={20} color={s.color} /></div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Inter', color: s.color, marginBottom: 3 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#9E9E9E' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Live location sharing — customers see this on their tracking map */}
        {active.some(j => j.status === 'in-progress') && (
          <LocationShareCard cleaner={cleaner} />
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[
            { id: 'active', label: `Active (${active.length})` },
            { id: 'done', label: `History (${done.length})` }
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '8px 18px', borderRadius: 100, fontSize: 14, cursor: 'pointer',
              border: `1.5px solid ${filter === f.id ? '#00C896' : '#E8E8E8'}`,
              background: filter === f.id ? 'rgba(0,200,150,0.1)' : 'transparent',
              color: filter === f.id ? '#00C896' : '#6B6B6B', transition: 'all 0.2s'
            }}>{f.label}</button>
          ))}
        </div>

        {/* Jobs */}
        {shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 16 }}>
            <div style={{ marginBottom: 14 }}><Icon name="inbox" size={40} color="#C9C9C9" /></div>
            <p style={{ color: '#6B6B6B', fontSize: 16 }}>
              {filter === 'active' ? 'No active jobs yet — new assignments will appear here.' : 'No completed jobs yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {shown.map(job => (
              <JobCard key={job.id} job={job} onStatusChange={status => updateStatus(job.id, status)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Publishes the worker's GPS position to their cleaners row (throttled to ~10s)
// so customers can watch them approach on the live map.
function LocationShareCard({ cleaner }) {
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')
  const watchRef = useRef(null)
  const lastSentRef = useRef(0)

  const stop = useCallback(() => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = null
    setSharing(false)
  }, [])

  useEffect(() => stop, [stop])

  const start = () => {
    setError('')
    if (!navigator.geolocation) return setError('Location is not supported on this device.')
    watchRef.current = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const now = Date.now()
        if (now - lastSentRef.current < 10000) return
        lastSentRef.current = now
        await supabase.from('cleaners').update({
          current_lat: coords.latitude,
          current_lng: coords.longitude,
          location_updated_at: new Date().toISOString()
        }).eq('id', cleaner.id)
      },
      (err) => {
        setError(err.code === 1 ? 'Location permission denied — allow location access in your browser settings.' : err.message)
        stop()
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    setSharing(true)
  }

  return (
    <div style={{
      background: sharing ? 'rgba(0,200,150,0.06)' : '#F6F6F6',
      border: `1px solid ${sharing ? 'rgba(0,200,150,0.3)' : '#E8E8E8'}`,
      borderRadius: 16, padding: '18px 22px', marginBottom: 28,
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
    }}>
      <Icon name="radio" size={26} color="#00C896" />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#000000', marginBottom: 3 }}>
          {sharing ? 'Sharing your live location' : 'Share your live location'}
        </div>
        <div style={{ fontSize: 13, color: '#6B6B6B' }}>
          {sharing
            ? 'Your customer can see you approaching on their map.'
            : 'Let your customer track your arrival while a job is in progress.'}
        </div>
        {error && <div style={{ fontSize: 13, color: '#E11900', marginTop: 6 }}>{error}</div>}
      </div>
      <button onClick={sharing ? stop : start} style={{
        padding: '10px 20px', borderRadius: 100, cursor: 'pointer', fontSize: 14, fontWeight: 500,
        border: `1.5px solid ${sharing ? '#E11900' : '#00C896'}`,
        background: sharing ? 'rgba(225,25,0,0.1)' : 'rgba(0,200,150,0.1)',
        color: sharing ? '#E11900' : '#00C896', transition: 'all 0.2s'
      }}>
        {sharing ? '⏹ Stop Sharing' : '▶️ Start Sharing'}
      </button>
    </div>
  )
}

function JobCard({ job, onStatusChange }) {
  const conf = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending
  const action = NEXT_ACTION[job.status]
  const fullAddress = `${job.address}, ${job.city}, ${job.province}`

  // Uber universal link: opens the app on mobile (web on desktop) with
  // pickup at the cleaner's current location and drop-off at the job address.
  const uberUrl = 'https://m.uber.com/ul/?action=setPickup&pickup=my_location'
    + `&dropoff[nickname]=${encodeURIComponent(`CleanConnect Job ${job.id}`)}`
    + `&dropoff[formatted_address]=${encodeURIComponent(fullAddress)}`

  return (
    <div style={{ background: '#F6F6F6', border: '1px solid #E8E8E8', borderRadius: 16, padding: '22px 24px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <ServiceBadge id={job.service_id} size={52} iconSize={26} />

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 17, color: '#000000' }}>{job.service_name}</h3>
            <span className={`badge ${conf.color}`} style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12 }}>
              {conf.label}
            </span>
          </div>
          <div style={{ display: 'grid', gap: 5, fontSize: 13.5, color: '#6B6B6B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="pin" size={13} color="#9E9E9E" /> {fullAddress}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" size={13} color="#9E9E9E" /> {job.booking_date} · {job.time_slot} · {job.sqm} m²</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="user" size={13} color="#9E9E9E" /> {job.contact_name} · <a href={`tel:${job.contact_phone?.replace(/\s/g, '')}`} style={{ color: '#276EF1' }}>{job.contact_phone}</a></span>
            {job.special_instructions && <span style={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="fileText" size={13} color="#9E9E9E" /> "{job.special_instructions}"</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Inter', color: '#00C896' }}>{formatCurrency(job.amount)}</div>
          <div style={{ fontSize: 12, color: '#9E9E9E', fontFamily: 'Inter', marginTop: 3 }}>{job.id}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        {action && (
          <button onClick={() => onStatusChange(action.to)} className="btn-primary"
            style={{ padding: '10px 20px', fontSize: 14 }}>
            {action.label}
          </button>
        )}
        <a href={uberUrl} target="_blank" rel="noreferrer"
          style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #E8E8E8', background: '#EEEEEE', color: '#000000', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="car" size={16} color="#0D1117" /> Uber to Job
        </a>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`}
          target="_blank" rel="noreferrer"
          style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #E8E8E8', background: '#EEEEEE', color: '#000000', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="navigation" size={15} color="#0D1117" /> Directions
        </a>
      </div>
    </div>
  )
}

function CenteredNote({ icon, text }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', paddingTop: 68 }}>
      <div style={{ textAlign: 'center', color: '#6B6B6B' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
        {text}
      </div>
    </div>
  )
}
