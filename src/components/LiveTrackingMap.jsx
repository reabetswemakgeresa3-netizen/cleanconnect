import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'

// Emoji marker avoids Leaflet's bundler-broken default icon assets
const cleanerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:44px;height:44px;border-radius:50% 50% 50% 4px;transform:rotate(0deg);
    background:linear-gradient(135deg,#00C896,#00A87E);
    display:flex;align-items:center;justify-content:center;font-size:22px;
    border:3px solid #0D1117;box-shadow:0 4px 14px rgba(0,200,150,0.5);
  ">🧹</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 40]
})

function Recenter({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.panTo([position.lat, position.lng], { animate: true })
  }, [position, map])
  return null
}

function timeAgo(iso) {
  if (!iso) return null
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.round(secs / 60)} min ago`
  return `${Math.round(secs / 3600)} hr ago`
}

export default function LiveTrackingMap({ cleanerId, cleanerName }) {
  const [position, setPosition] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [, forceTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    // Initial position
    supabase.from('cleaners')
      .select('current_lat, current_lng, location_updated_at')
      .eq('id', cleanerId).maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.current_lat != null) {
          setPosition({ lat: data.current_lat, lng: data.current_lng })
          setUpdatedAt(data.location_updated_at)
        }
      })

    // Live updates
    const channel = supabase
      .channel(`cleaner-location-${cleanerId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cleaners', filter: `id=eq.${cleanerId}` },
        (payload) => {
          const row = payload.new
          if (row?.current_lat != null) {
            setPosition({ lat: row.current_lat, lng: row.current_lng })
            setUpdatedAt(row.location_updated_at)
          }
        })
      .subscribe()

    // Keep the "last updated" label fresh
    const tick = setInterval(() => forceTick(n => n + 1), 30000)

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      clearInterval(tick)
    }
  }, [cleanerId])

  if (!position) return (
    <div style={{
      background: '#1E2530', border: '1px dashed #2E3A4E', borderRadius: 12,
      padding: '28px 20px', textAlign: 'center'
    }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>📡</div>
      <p style={{ color: '#7A8B9C', fontSize: 14 }}>
        Waiting for {cleanerName || 'your cleaner'} to share their live location...
      </p>
    </div>
  )

  return (
    <div>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #2E3A4E' }}>
        <MapContainer
          center={[position.lat, position.lng]} zoom={15} scrollWheelZoom={false}
          style={{ height: 260, width: '100%', background: '#1E2530' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[position.lat, position.lng]} icon={cleanerIcon}>
            <Popup>{cleanerName || 'Your cleaner'}</Popup>
          </Marker>
          <Recenter position={position} />
        </MapContainer>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: '#7A8B9C' }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: '#00C896',
          boxShadow: '0 0 0 3px rgba(0,200,150,0.2)', display: 'inline-block'
        }} />
        Live · {cleanerName || 'Cleaner'} on the move {updatedAt && `· updated ${timeAgo(updatedAt)}`}
      </div>
    </div>
  )
}
