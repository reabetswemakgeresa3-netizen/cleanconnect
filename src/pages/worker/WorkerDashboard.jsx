import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Icon, ServiceBadge } from '../../components/Icons'
import PinSpinner from '../../components/PinSpinner'
import { STATUS_CONFIG, formatCurrency } from '../../data/services'

// Job states that mean "the cleaner has an active job in flight" — surfaced
// via the Current Job banner and used to route back into /worker/job/:id.
const ACTIVE_JOB_STATUSES = ['accepted', 'en-route', 'in-progress']

export default function WorkerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [justCompleted] = useState(() => location.state?.justCompleted || null)
  const [cleaner, setCleaner] = useState(null)
  const [jobs, setJobs] = useState([])
  const [availableJobs, setAvailableJobs] = useState([])
  const [unseenCount, setUnseenCount] = useState(0)
  const [takenId, setTakenId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('jobs')
  const jobsChannelRef = useRef(null)

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

        const { data: broadcasting } = await supabase
          .from('bookings').select('*')
          .eq('job_status', 'broadcasting')
          .order('created_at', { ascending: false })
        setAvailableJobs(broadcasting || [])

        const { count } = await supabase
          .from('worker_notifications').select('id', { count: 'exact', head: true })
          .eq('cleaner_id', cleanerRow.id).eq('seen', false)
        setUnseenCount(count || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => { fetchData() }, [fetchData])

  // Live updates: any booking entering the broadcasting pool, from any
  // worker's tab — no polling, no manual refresh.
  //
  // Removals can't rely on postgres_changes alone: once a booking's
  // job_status leaves 'broadcasting', it stops matching the "Cleaners can
  // view broadcasting jobs" RLS policy for every OTHER cleaner, so Realtime
  // simply never delivers that UPDATE to them (Realtime filters change
  // payloads per-subscriber against the row's current RLS visibility). The
  // accepting cleaner's client is the only one guaranteed to know it won —
  // so it explicitly broadcasts a "job-taken" event (Realtime's channel
  // pub/sub, independent of table RLS) that every other worker listens for.
  useEffect(() => {
    if (!cleaner) return
    const channel = supabase
      .channel('available-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
        const row = payload.new
        if (!row) return
        if (row.job_status === 'broadcasting') {
          setAvailableJobs(prev => prev.some(j => j.id === row.id) ? prev.map(j => j.id === row.id ? row : j) : [row, ...prev])
        }
        // A job assigned to me elsewhere (e.g. Admin) should show up live too.
        if (row.cleaner_id === cleaner.id) fetchData()
      })
      .on('broadcast', { event: 'job-taken' }, ({ payload }) => {
        setAvailableJobs(prev => prev.filter(j => j.id !== payload.bookingId))
      })
      .subscribe()
    jobsChannelRef.current = channel

    const notifChannel = supabase
      .channel(`worker-notifs-${cleaner.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'worker_notifications', filter: `cleaner_id=eq.${cleaner.id}` },
        () => setUnseenCount(c => c + 1))
      .subscribe()

    return () => { supabase.removeChannel(channel); supabase.removeChannel(notifChannel); jobsChannelRef.current = null }
  }, [cleaner, fetchData])

  // Race-safe accept: the WHERE job_status='broadcasting' only matches if
  // nobody else claimed it first — Postgres re-checks this per concurrent
  // update, so exactly one caller ever gets a non-empty result back.
  const acceptJob = async (jobId) => {
    const { data, error } = await supabase.from('bookings')
      .update({ job_status: 'accepted', accepted_by: cleaner.id, cleaner_id: cleaner.id, cleaner_assigned: cleaner.name, status: 'confirmed' })
      .eq('id', jobId).eq('job_status', 'broadcasting')
      .select()

    if (error || !data || data.length === 0) {
      // Leave the card in place so the "already taken" message can render
      // on it, then remove it a few seconds later.
      setTakenId(jobId)
      setTimeout(() => {
        setTakenId(null)
        setAvailableJobs(prev => prev.filter(j => j.id !== jobId))
      }, 4000)
      return
    }

    const accepted = data[0]
    setAvailableJobs(prev => prev.filter(j => j.id !== jobId))
    jobsChannelRef.current?.send({ type: 'broadcast', event: 'job-taken', payload: { bookingId: jobId } })
    supabase.functions.invoke('send-whatsapp', {
      body: { type: 'job_accepted', booking: accepted, customerPhone: accepted.contact_phone, customerName: accepted.contact_name }
    }).catch(() => {})
    // Straight into the Active Job screen — don't leave them on the list.
    navigate(`/worker/job/${jobId}`)
  }

  const openJobsTab = () => {
    setFilter('jobs')
    if (unseenCount > 0 && cleaner) {
      setUnseenCount(0)
      supabase.from('worker_notifications').update({ seen: true }).eq('cleaner_id', cleaner.id).eq('seen', false).then(() => {})
    }
  }

  const toggleAvailable = async () => {
    const available = !cleaner.available
    setCleaner(c => ({ ...c, available }))
    await supabase.from('cleaners').update({ available }).eq('id', cleaner.id)
  }

  if (loading) return <CenteredNote icon={<PinSpinner size={40} />} text="Loading your jobs..." />

  if (!cleaner) return (
    <div style={{ paddingTop: 68, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', padding: 24, maxWidth: 440 }}>
        <div style={{ marginBottom: 20 }}><Icon name="bucket" size={52} color="var(--text-dim)" /></div>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>You're not registered as a worker yet</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Join CleanConnect Workers to receive cleaning jobs in your area.</p>
        <Link to="/worker/register" className="btn-primary">Register as a Worker →</Link>
      </div>
    </div>
  )

  const active = jobs.filter(j => !['completed', 'cancelled'].includes(j.status))
  const done = jobs.filter(j => ['completed', 'cancelled'].includes(j.status))
  const shown = filter === 'active' ? active : filter === 'done' ? done : []
  const currentJob = active.find(j => ACTIVE_JOB_STATUSES.includes(j.job_status))

  const stats = {
    today: active.filter(j => j.booking_date === new Date().toISOString().slice(0, 10)).length,
    active: active.length,
    completed: jobs.filter(j => j.status === 'completed').length,
    earned: jobs.filter(j => j.status === 'completed' && j.payment_status === 'paid')
      .reduce((s, j) => s + (j.amount || 0), 0)
  }

  return (
    <div style={{ paddingTop: 68, minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 30, marginBottom: 6 }}>
              Hi, {cleaner.name?.split(' ')[0]}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
              {cleaner.location}, {cleaner.province} {cleaner.verified && <span style={{ color: '#00C896' }}>· ✓ Verified</span>}
            </p>
          </div>
          <button onClick={toggleAvailable} style={{
            padding: '10px 20px', borderRadius: 100, cursor: 'pointer', fontSize: 14, fontWeight: 500,
            border: `1.5px solid ${cleaner.available ? '#00C896' : 'var(--border)'}`,
            background: cleaner.available ? 'rgba(0,200,150,0.1)' : 'var(--tile)',
            color: cleaner.available ? '#00C896' : 'var(--text-muted)', transition: 'all 0.2s'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cleaner.available ? '#00C896' : 'var(--text-dim)', display: 'inline-block' }} />
              {cleaner.available ? 'Available for jobs' : 'Unavailable'}
            </span>
          </button>
        </div>

        {/* Just-completed confirmation — shown once, from navigation state */}
        {justCompleted && (
          <div style={{
            background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: 16,
            padding: '20px 22px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,200,150,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="checkCircle" size={22} color="#00C896" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16 }}>Job completed! Great work 🎉</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2 }}>
                {justCompleted.serviceName} · {formatCurrency(justCompleted.amount)} earned
              </div>
            </div>
          </div>
        )}

        {/* Current Job — always surfaced so an active job is never hidden */}
        {currentJob && (
          <Link to={`/worker/job/${currentJob.id}`} style={{
            display: 'flex', alignItems: 'center', gap: 16, background: 'var(--tile)',
            border: '1.5px solid #00C896', borderRadius: 16, padding: '18px 22px', marginBottom: 28
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,200,150,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="radio" size={22} color="#00C896" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#00C896', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Current Job</div>
              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15.5 }}>{currentJob.service_name} · {currentJob.contact_name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                {currentJob.job_status === 'accepted' ? 'Ready to head out' : currentJob.job_status === 'en-route' ? "You're on the way" : 'Cleaning in progress'}
              </div>
            </div>
            <Icon name="chevronRight" size={18} color="#00C896" style={{ flexShrink: 0 }} />
          </Link>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 14, marginBottom: 32 }}>
          {[
            { label: 'Jobs Today', value: stats.today, icon: 'calendar', color: '#276EF1' },
            { label: 'Active Jobs', value: stats.active, icon: 'refresh', color: '#C46A00' },
            { label: 'Completed', value: stats.completed, icon: 'checkCircle', color: '#00C896' },
            { label: 'Total Earned', value: formatCurrency(stats.earned), icon: 'wallet', color: '#00C896' }
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ marginBottom: 8 }}><Icon name={s.icon} size={20} color={s.color} /></div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Inter', color: s.color, marginBottom: 3 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Live location sharing — customers see this on their tracking map.
            The Active Job screen starts this automatically on "I'm on my
            way"; this is a manual fallback/override. */}
        {active.some(j => ['en-route', 'in-progress'].includes(j.job_status)) && (
          <LocationShareCard cleaner={cleaner} />
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { id: 'jobs', label: `Available Jobs (${availableJobs.length})`, badge: unseenCount },
            { id: 'active', label: `Active (${active.length})` },
            { id: 'done', label: `History (${done.length})` }
          ].map(f => (
            <button key={f.id} onClick={() => f.id === 'jobs' ? openJobsTab() : setFilter(f.id)} style={{
              padding: '10px 18px', borderRadius: 100, fontSize: 14, cursor: 'pointer', minHeight: 44,
              border: `1.5px solid ${filter === f.id ? '#00C896' : 'var(--border)'}`,
              background: filter === f.id ? 'rgba(0,200,150,0.1)' : 'transparent',
              color: filter === f.id ? '#00C896' : 'var(--text-muted)', transition: 'all 0.2s',
              display: 'inline-flex', alignItems: 'center', gap: 8
            }}>
              {f.label}
              {!!f.badge && (
                <span style={{ background: '#E11900', color: '#FFFFFF', borderRadius: 100, minWidth: 18, height: 18, padding: '0 5px', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {f.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Available Jobs (broadcast) */}
        {filter === 'jobs' && (
          availableJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16 }}>
              <div style={{ marginBottom: 14 }}><Icon name="inbox" size={40} color="var(--text-dim)" /></div>
              <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>No jobs available right now — new bookings will show up here instantly.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {availableJobs.map(job => (
                <AvailableJobCard key={job.id} job={job} taken={takenId === job.id} onAccept={() => acceptJob(job.id)} />
              ))}
            </div>
          )
        )}

        {/* Active / History */}
        {filter !== 'jobs' && (
          shown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16 }}>
              <div style={{ marginBottom: 14 }}><Icon name="inbox" size={40} color="var(--text-dim)" /></div>
              <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
                {filter === 'active' ? 'No active jobs yet — accept one from Available Jobs.' : 'No completed jobs yet.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {shown.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )
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
      background: sharing ? 'rgba(0,200,150,0.06)' : 'var(--tile)',
      border: `1px solid ${sharing ? 'rgba(0,200,150,0.3)' : 'var(--border)'}`,
      borderRadius: 16, padding: '18px 22px', marginBottom: 28,
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
    }}>
      <Icon name="radio" size={26} color="#00C896" />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
          {sharing ? 'Sharing your live location' : 'Share your live location'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
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
        {sharing ? 'Stop Sharing' : 'Start Sharing'}
      </button>
    </div>
  )
}

// A job anyone verified+available can grab — first tap wins.
function AvailableJobCard({ job, taken, onAccept }) {
  const fullAddress = `${job.address}, ${job.city}, ${job.province}`

  return (
    <div style={{ background: 'var(--tile)', border: `1px solid ${taken ? '#E11900' : 'var(--border)'}`, borderRadius: 16, padding: '22px 24px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <ServiceBadge id={job.service_id} size={52} iconSize={26} />

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 17, color: 'var(--text)' }}>{job.service_name}</h3>
            {job.payment_method === 'cash' && (
              <span style={{ background: 'var(--tile-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '3px 10px', borderRadius: 100, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="wallet" size={12} color="var(--text-muted)" /> Cash on Completion
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gap: 5, fontSize: 13.5, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="pin" size={13} color="var(--text-dim)" /> {fullAddress}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" size={13} color="var(--text-dim)" /> {job.booking_date} · {job.time_slot} · {job.sqm} m²</span>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Inter', color: '#00C896' }}>{formatCurrency(job.amount)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'Inter', marginTop: 3 }}>{job.id}</div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        {taken ? (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(225,25,0,0.08)', border: '1px solid rgba(225,25,0,0.25)', color: '#E11900', fontSize: 13.5, fontWeight: 500 }}>
            This job was just taken by another cleaner.
          </div>
        ) : (
          <button onClick={onAccept} className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>
            Accept Job
          </button>
        )}
      </div>
    </div>
  )
}

function JobCard({ job }) {
  const conf = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending
  const fullAddress = `${job.address}, ${job.city}, ${job.province}`
  const isActive = ACTIVE_JOB_STATUSES.includes(job.job_status)

  return (
    <div style={{ background: 'var(--tile)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <ServiceBadge id={job.service_id} size={52} iconSize={26} />

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 17, color: 'var(--text)' }}>{job.service_name}</h3>
            <span className={`badge ${conf.color}`} style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12 }}>
              {conf.label}
            </span>
            {job.payment_method === 'cash' && (
              <span style={{ background: 'var(--tile-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '3px 10px', borderRadius: 100, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="wallet" size={12} color="var(--text-muted)" /> Cash on Completion
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gap: 5, fontSize: 13.5, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="pin" size={13} color="var(--text-dim)" /> {fullAddress}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" size={13} color="var(--text-dim)" /> {job.booking_date} · {job.time_slot} · {job.sqm} m²</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="user" size={13} color="var(--text-dim)" /> {job.contact_name} · <a href={`tel:${job.contact_phone?.replace(/\s/g, '')}`} style={{ color: '#276EF1' }}>{job.contact_phone}</a></span>
            {job.special_instructions && <span style={{ fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="fileText" size={13} color="var(--text-dim)" /> "{job.special_instructions}"</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Inter', color: '#00C896' }}>{formatCurrency(job.amount)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'Inter', marginTop: 3 }}>{job.id}</div>
        </div>
      </div>

      {/* Progression (map, directions, status controls) now lives on the
          dedicated Active Job screen — this card just links into it. */}
      {isActive && (
        <div style={{ marginTop: 18 }}>
          <Link to={`/worker/job/${job.id}`} className="btn-primary" style={{ padding: '10px 20px', fontSize: 14, display: 'inline-flex' }}>
            View Active Job →
          </Link>
        </div>
      )}
    </div>
  )
}

function CenteredNote({ icon, text }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', paddingTop: 68 }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
        {text}
      </div>
    </div>
  )
}
