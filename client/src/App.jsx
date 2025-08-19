import React, { useEffect, useMemo, useState } from 'react'
import { fetchRoads, fetchSegments, fetchLayers, moveBandSeam } from './api'
import ControlBar from './components/ControlBar'
import SLDCanvasV2 from './components/SLDCanvasV2'

const DEFAULT_BANDS = [
  { key: 'surface',      title: 'Surface',            height: 28 },
  { key: 'aadt',         title: 'AADT',               height: 28 },
  { key: 'status',       title: 'Status',             height: 28 },
  { key: 'quality',      title: 'Condition',          height: 28 },
  { key: 'rowWidth',     title: 'ROW Width (m)',      height: 28 },
  { key: 'lanes',        title: 'Number of Lanes',    height: 28 },
  { key: 'municipality', title: 'Municipality',       height: 28 },
  { key: 'bridges',      title: 'Bridges',            height: 24 },
]

export default function App() {
  const [roads, setRoads] = useState([])
  const [q, setQ] = useState('')
  const [road, setRoad] = useState(null)
  const [segments, setSegments] = useState([])
  const [layers, setLayers] = useState(null)

  const [fromKm, setFromKm] = useState(0)
  const [toKm, setToKm] = useState(10)

  const [bands] = useState(() => DEFAULT_BANDS)
  const domain = useMemo(() => ({ fromKm, toKm }), [fromKm, toKm])

  useEffect(() => {
    (async () => {
      const r = await fetchRoads('')
      setRoads(r)
      if (r.length) setRoad(r[0])
    })()
  }, [])

  useEffect(() => {
    if (!road) return
    ;(async () => {
      const seg = await fetchSegments(road.id)
      setSegments(seg.segments || [])
      const L = Number(seg.road?.lengthKm || road.lengthKm || 10)
      setFromKm(0); setToKm(L)

      const ly = await fetchLayers(road.id)
      setLayers(ly)
    })()
  }, [road])

  const onSearch = async () => {
    const r = await fetchRoads(q)
    setRoads(r)
    if (r.length) setRoad(r[0])
  }

  // ✅ Forward the optional extras (like { edge: 'start' } for bridges)
  const handleMoveSeam = async (bandKey, leftId, rightId, km, extra = {}) => {
    if (!road) return
    await moveBandSeam(road.id, bandKey, leftId, rightId, km, extra)
    const ly = await fetchLayers(road.id)
    setLayers(ly)
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
        />

        <SLDCanvasV2
          road={road}
          segments={segments}
          layers={layers}
          domain={domain}
          onDomainChange={(a,b)=>{ setFromKm(a); setToKm(b) }}
          bands={bands}
          onMoveSeam={handleMoveSeam}
        />
      </div>
    </div>
  )
}
