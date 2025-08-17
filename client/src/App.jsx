import React, { useEffect, useMemo, useState } from 'react'
import { fetchRoads, fetchSegments, resizeSegment } from './api'
import ControlBar from './components/ControlBar'
import SLDCanvasV2 from './components/SLDCanvasV2'

/** Default band order + initial heights (px) */
const DEFAULT_BANDS = [
  { key: 'surface',  title: 'Surface',       height: 28 },
  { key: 'aadt',     title: 'AADT',          height: 28 },
  { key: 'status',   title: 'Route Status',  height: 28 },
  { key: 'quality',  title: 'Quality',       height: 28 },
  { key: 'sidewalk', title: 'Sidewalk',      height: 28 },
]

export default function App() {
  const [roads, setRoads] = useState([])
  const [q, setQ] = useState('')
  const [road, setRoad] = useState(null)
  const [segments, setSegments] = useState([])

  // domain controls (From/To)
  const [fromKm, setFromKm] = useState(0)
  const [toKm, setToKm] = useState(10)
  const [scale, setScale] = useState(0.1)

  // band heights (not vertical-resizable anymore, but persisted for layout)
  const [bands, setBands] = useState(() => {
    const saved = localStorage.getItem('sld.bandHeights.v1')
    if (saved) {
      try {
        const arr = JSON.parse(saved)
        return DEFAULT_BANDS.map(d => {
          const found = arr.find(x => x.key === d.key)
          return found ? { ...d, height: Math.max(20, Math.min(120, Number(found.height)||d.height)) } : d
        })
      } catch { /* ignore */ }
    }
    return DEFAULT_BANDS
  })
  useEffect(() => {
    localStorage.setItem('sld.bandHeights.v1', JSON.stringify(bands.map(b => ({ key: b.key, height: b.height }))))
  }, [bands])

  // initial data
  useEffect(() => {
    (async () => {
      const r = await fetchRoads('')
      setRoads(r)
      if (r.length) setRoad(r[0])
    })()
  }, [])

  // load segments whenever road changes
  useEffect(() => {
    if (!road) return
    ;(async () => {
      const { segments } = await fetchSegments(road.id)
      setSegments(segments || [])
      const L = Number(road.lengthKm || 0)
      setFromKm(0); setToKm(L || 10)
    })()
  }, [road])

  const onSearch = async () => {
    const r = await fetchRoads(q)
    setRoads(r)
    if (r.length) setRoad(r[0])
  }

  const domain = useMemo(() => ({ fromKm, toKm }), [fromKm, toKm])

  /** Persist an edge drag to the server and refresh local segments.
   *  (If your server resize endpoint is not wired, this will just refetch.) */
  const handleResizeEdge = async (segmentId, payload) => {
    const resp = await resizeSegment(segmentId, payload)
    setSegments(resp.segments || [])
  }

  return (
    <div style={{ fontFamily:'Inter, system-ui, Arial', background:'#f0f2f5', minHeight:'100vh' }}>
      <div style={{ maxWidth: 1400, margin:'0 auto', padding:'16px' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:8 }}>
          <h2 style={{ margin:0 }}>Road Analyzer — SLD</h2>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Search roads…"
              onKeyDown={(e)=>{ if(e.key==='Enter') onSearch() }}
              style={{ width: 260 }}
            />
            <button onClick={onSearch}>Search</button>
            <select
              value={road?.id || ''}
              onChange={(e)=>{ const next = roads.find(r=>r.id===Number(e.target.value)); setRoad(next||null) }}
            >
              {roads.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        <ControlBar
          road={road}
          domain={domain}
          onDomainChange={(a,b)=>{ setFromKm(a); setToKm(b) }}
          scale={scale}
          setScale={setScale}
        />

        <SLDCanvasV2
          road={road}
          segments={segments}
          domain={domain}
          onDomainChange={(a,b)=>{ setFromKm(a); setToKm(b) }}
          bands={bands}
          onBandsChange={setBands}
          onResizeEdge={handleResizeEdge}
        />
      </div>
    </div>
  )
}
