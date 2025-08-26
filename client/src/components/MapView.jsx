import React, { useMemo } from 'react'

function interp(track = [], km) {
  if (!track.length) return null
  let prev = track[0]
  for (let i = 1; i < track.length; i++) {
    const cur = track[i]
    if (km <= cur.km) {
      const span = cur.km - prev.km
      const t = span > 0 ? (km - prev.km) / span : 0
      const lat = prev.lat + t * (cur.lat - prev.lat)
      const lng = prev.lng + t * (cur.lng - prev.lng)
      return { lat, lng }
    }
    prev = cur
  }
  return { lat: prev.lat, lng: prev.lng }
}

export default function MapView({ track = [], centerKm, highlightRange }) {
  const center = useMemo(() => interp(track, centerKm), [track, centerKm])
  const span = useMemo(() => {
    if (!highlightRange) return null
    const start = interp(track, highlightRange.startKm)
    const end = interp(track, highlightRange.endKm)
    return (start && end) ? { start, end } : null
  }, [track, highlightRange])

  const src = useMemo(() => {
    if (!center) return null
    const zoom = 14
    let url = `https://staticmap.openstreetmap.de/staticmap.php?center=${center.lat},${center.lng}&zoom=${zoom}&size=260x200&markers=${center.lat},${center.lng},lightblue1`
    if (span) {
      url += `&path=${span.start.lng},${span.start.lat}|${span.end.lng},${span.end.lat},red`
    }
    return url
  }, [center, span])

  return (
    <div style={{ width: '100%', height: '100%', background: '#e0e0e0' }}>
      {src ? (
        <img src={src} alt="map" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ fontSize: 12, padding: 8 }}>No map data</div>
      )}
    </div>
  )
}
