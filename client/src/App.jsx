import React, { useEffect, useMemo, useState } from 'react'
import { fetchRoads, fetchSegments, fetchLayers, moveBandSeam } from './api'
import ControlBar from './components/ControlBar'
import SLDCanvasV2 from './components/SLDCanvasV2'
import { DEFAULT_BANDS } from './bands'

export default function App() {
  const [roads, setRoads] = useState([])
  const [q, setQ] = useState('')
  const [road, setRoad] = useState(null)
  const [sectionList, setSectionList] = useState([])
  const [sectionId, setSectionId] = useState(null)
  const [segments, setSegments] = useState([])
  const [allLayers, setAllLayers] = useState(null)
  const [layers, setLayers] = useState(null)

  const [fromKm, setFromKm] = useState(0)
  const [toKm, setToKm] = useState(10)

  const [bands] = useState(() => DEFAULT_BANDS)
  const domain = useMemo(() => ({ fromKm, toKm }), [fromKm, toKm])
  const currentSection = useMemo(() => sectionList.find(s => s.id === sectionId) || null, [sectionList, sectionId])
  const currentRoad = useMemo(() => {
    if (!currentSection) return road
    return { ...road, lengthKm: currentSection.endKm - currentSection.startKm }
  }, [road, currentSection])

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
      const list = seg.segments || []
      setSectionList(list)
      const first = list[0]
      setSectionId(first?.id || null)

      const ly = await fetchLayers(road.id)
      setAllLayers(ly)
    })()
  }, [road])

  useEffect(() => {
    if (!sectionId) { setSegments([]); setLayers(null); return }
    const section = sectionList.find(s => s.id === sectionId)
    if (!section) { setSegments([]); setLayers(null); return }
    const start = section.startKm
    const end   = section.endKm
    const length = end - start
    setFromKm(0); setToKm(length)

    const segs = sectionList
      .filter(s => s.endKm > start && s.startKm < end)
      .map(s => ({ ...s, startKm: s.startKm - start, endKm: s.endKm - start }))
    setSegments(segs)

    const slice = (arr = []) => arr
      .filter(r => r.endKm > start && r.startKm < end)
      .map(r => ({
        ...r,
        startKm: Math.max(r.startKm, start) - start,
        endKm: Math.min(r.endKm, end) - start,
      }))

    const slicePosts = (arr = []) => arr
      .filter(p => p.chainageKm >= start && p.chainageKm <= end)
      .map(p => ({ ...p, chainageKm: p.chainageKm - start }))

    if (allLayers) {
      setLayers({
        surface: slice(allLayers.surface),
        aadt: slice(allLayers.aadt),
        status: slice(allLayers.status),
        quality: slice(allLayers.quality),
        lanes: slice(allLayers.lanes),
        rowWidth: slice(allLayers.rowWidth),
        municipality: slice(allLayers.municipality),
        bridges: slice(allLayers.bridges),
        kmPosts: slicePosts(allLayers.kmPosts),
      })
    }
  }, [sectionId, sectionList, allLayers])

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
            <select
              value={sectionId || ''}
              onChange={(e)=>setSectionId(Number(e.target.value))}
            >
              {sectionList.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>
          </div>
        </div>

        <ControlBar
          road={currentRoad}
          domain={domain}
          onDomainChange={(a,b)=>{ setFromKm(a); setToKm(b) }}
        />

        <SLDCanvasV2
          road={currentRoad}
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
