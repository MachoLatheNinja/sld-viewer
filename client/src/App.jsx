import React, { useEffect, useMemo, useState } from 'react'
import { fetchRoads, fetchLayers, moveBandSeam } from './api'
import ControlBar from './components/ControlBar'
import SLDCanvasV2 from './components/SLDCanvasV2'
import { DEFAULT_BANDS } from './bands'
import { lrpToChainageKm } from './lrp'

const EPS = 1e-6

function mergeRanges(arr = [], prop) {
  if (!arr.length) return []
  const out = [{ ...arr[0] }]
  for (let i = 1; i < arr.length; i++) {
    const prev = out[out.length - 1]
    const cur = arr[i]
    if (prev[prop] === cur[prop] && Math.abs(prev.endKm - cur.startKm) < EPS) {
      prev.endKm = cur.endKm
    } else {
      out.push({ ...cur })
    }
  }
  return out
}

export default function App() {
  const [roads, setRoads] = useState([])
  const [q, setQ] = useState('')
  const [road, setRoad] = useState(null)
  const [sectionList, setSectionList] = useState([])
  const [sectionId, setSectionId] = useState(null)
  const [allLayers, setAllLayers] = useState(null)
  const [layers, setLayers] = useState(null)
  const [guideKm, setGuideKm] = useState(null)

  const [fromKm, setFromKm] = useState(0)
  const [toKm, setToKm] = useState(10)

  const [showGuide, setShowGuide] = useState(false)

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
      const ly = await fetchLayers(road.id)
      setAllLayers(ly)
      const list = ly.sections || []
      setSectionList(list)
      const first = list[0]
      setSectionId(first?.id || null)
    })()
  }, [road])

  useEffect(() => {
    if (!sectionId) { setLayers(null); return }
    const section = sectionList.find(s => s.id === sectionId)
    if (!section) { setLayers(null); return }
    const start = section.startKm
    const end   = section.endKm

    const slice = (arr = []) => arr
      .filter(r => r.sectionId === section.id)
      .map(r => ({
        ...r,
        startKm: Math.max(r.startKm, start) - start,
        endKm: Math.min(r.endKm, end) - start,
      }))
      .sort((a, b) => a.startKm - b.startKm)

    const slicePosts = (arr = []) => arr
      .filter(p => p.sectionId === section.id)
      .map(p => ({ ...p, chainageKm: p.chainageKm - start }))
      .sort((a, b) => a.chainageKm - b.chainageKm)

    if (allLayers) {
      setLayers({
        surface: mergeRanges(slice(allLayers.surface), 'surface'),
        aadt: mergeRanges(slice(allLayers.aadt), 'aadt'),
        status: mergeRanges(slice(allLayers.status), 'status'),
        quality: mergeRanges(slice(allLayers.quality), 'quality'),
        lanes: mergeRanges(slice(allLayers.lanes), 'lanes'),
        rowWidth: mergeRanges(slice(allLayers.rowWidth), 'rowWidthM'),
        municipality: mergeRanges(slice(allLayers.municipality), 'name'),
        bridges: slice(allLayers.bridges),
        kmPosts: slicePosts(allLayers.kmPosts),
      })
    }
  }, [sectionId, sectionList, allLayers])

  useEffect(() => {
    if (!sectionId) return
    const section = sectionList.find(s => s.id === sectionId)
    if (!section) return
    const length = section.endKm - section.startKm
    setFromKm(0)
    setToKm(length)
  }, [sectionId, sectionList])

  useEffect(() => {
    if (guideKm == null) return
    const section = sectionList.find(s => s.id === sectionId)
    if (!section) return
    const length = section.endKm - section.startKm
    let from = guideKm - 0.5
    let to = guideKm + 0.5
    if (from < 0) {
      to = Math.min(length, to - from)
      from = 0
    }
    if (to > length) {
      from = Math.max(0, from - (to - length))
      to = length
    }
    setFromKm(from)
    setToKm(to)
  }, [guideKm, sectionId, sectionList])

  const onSearch = () => {
    const kmVal = lrpToChainageKm(q, allLayers?.kmPosts)
    if (kmVal == null) return
    const sec = sectionList.find(s => kmVal >= s.startKm && kmVal <= s.endKm)
    if (sec) {
      setGuideKm(kmVal - sec.startKm)
      setSectionId(sec.id)
      setShowGuide(true)
    }
  }

  const toggleGuide = () => {
    if (guideKm != null) {
      setGuideKm(null)
      setShowGuide(true)
    } else {
      setShowGuide(g => !g)
    }
  }

  // ✅ Forward the optional extras (like { edge: 'start' } for bridges)
  const handleMoveSeam = async (bandKey, leftId, rightId, km, extra = {}) => {
    if (!road) return
    await moveBandSeam(road.id, bandKey, leftId, rightId, km, extra)
    const ly = await fetchLayers(road.id)
    setAllLayers(ly)
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
              placeholder="Search chainage…"
              onKeyDown={(e)=>{ if(e.key==='Enter') onSearch() }}
              style={{ width: 260 }}
            />
            <button onClick={onSearch}>Search</button>
            <select
              value={road?.id || ''}
              onChange={(e)=>{ const next = roads.find(r=>r.id===e.target.value); setRoad(next||null) }}
            >
              {roads.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select
              value={sectionId || ''}
              onChange={(e)=>setSectionId(e.target.value)}
            >
              {sectionList.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>
          </div>
        </div>

        <ControlBar
          road={currentRoad}
          domain={domain}
          onDomainChange={(a,b)=>{ setFromKm(a); setToKm(b) }}
          showGuide={showGuide}
          onToggleGuide={toggleGuide}
        />

        <SLDCanvasV2
          road={currentRoad}
          layers={layers}
          domain={domain}
          onDomainChange={(a,b)=>{ setFromKm(a); setToKm(b) }}
          bands={bands}
          onMoveSeam={handleMoveSeam}
          showGuide={showGuide}
          guideKm={guideKm}
        />
      </div>
    </div>
  )
}
