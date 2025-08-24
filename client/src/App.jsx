import React, { useEffect, useMemo, useState } from 'react'
import { fetchRoads, fetchLayers, moveBandSeam } from './api'
import ControlBar from './components/ControlBar'
import SLDCanvasV2 from './components/SLDCanvasV2'
import { DEFAULT_BAND_GROUPS } from './bands'
import BandAccordion from './components/BandAccordion'
import { lrpToChainageKm, formatLRP } from './lrp'

const EPS = 1e-6

function formatAADT(n){ return n==null ? '' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }
function formatChainage(m){ return (m==null)? '' : String(m).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }

function bandArrayByKey(layers, key){
  if (!layers) return []
  if (key.startsWith('miow_')){
    const year = key.split('_')[1]
    return layers.miow?.[year] || []
  }
  switch(key){
    case 'surface': return layers.surface || []
    case 'aadt': return layers.aadt || []
    case 'status': return layers.status || []
    case 'quality': return layers.quality || []
    case 'lanes': return layers.lanes || []
    case 'rowWidth': return layers.rowWidth || []
    case 'carriagewayWidth': return layers.carriagewayWidth || []
    case 'municipality': return layers.municipality || []
    case 'bridges': return layers.bridges || []
    default: return []
  }
}

function bandValue(key, r){
  if (key.startsWith('miow_')) return r.typeOfWork
  switch(key){
    case 'surface': return r.surface
    case 'aadt': return formatAADT(r.aadt)
    case 'status': return r.status
    case 'quality': return r.quality
    case 'lanes': return `${r.lanes} lanes`
    case 'rowWidth': return `${r.rowWidthM} m`
    case 'carriagewayWidth': return `${r.carriagewayWidthM} m`
    case 'municipality': return r.name
    case 'bridges': return r.name
    default: return ''
  }
}

function bandValueAt(layers, key, km){
  const arr = bandArrayByKey(layers, key)
  for (const r of arr){
    if (km >= r.startKm - EPS && km <= r.endKm + EPS){
      return bandValue(key, r)
    }
  }
  return null
}

function mergeRanges(arr = [], props) {
  if (!arr.length) return []
  const getKey = (r) => {
    const fields = Array.isArray(props) ? props : [props]
    return fields.map((p) => r[p]).join('|')
  }
  const out = [{ ...arr[0] }]
  for (let i = 1; i < arr.length; i++) {
    const prev = out[out.length - 1]
    const cur = arr[i]
    if (getKey(prev) === getKey(cur) && Math.abs(prev.endKm - cur.startKm) < EPS) {
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
  const [hoverKm, setHoverKm] = useState(null)
  const [kmToX, setKmToX] = useState(null)
  const [roadLayout, setRoadLayout] = useState({ axisY:0, totalH:0 })

  const [fromKm, setFromKm] = useState(0)
  const [toKm, setToKm] = useState(10)

  const [showGuide, setShowGuide] = useState(false)
  const [editSeams, setEditSeams] = useState(false)

  const [bandGroups, setBandGroups] = useState(DEFAULT_BAND_GROUPS)
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
      const miowByYear = {}
      const miowSlice = slice(allLayers.miow)
      for (const r of miowSlice) {
        const y = r.year
        if (!miowByYear[y]) miowByYear[y] = []
        miowByYear[y].push(r)
      }
      setLayers({
        surface: mergeRanges(slice(allLayers.surface), ['surface','surfacePerLane']),
        aadt: mergeRanges(slice(allLayers.aadt), 'aadt'),
        status: mergeRanges(slice(allLayers.status), 'status'),
        quality: mergeRanges(slice(allLayers.quality), 'quality'),
        lanes: mergeRanges(slice(allLayers.lanes), 'lanes'),
        rowWidth: mergeRanges(slice(allLayers.rowWidth), 'rowWidthM'),
        carriagewayWidth: mergeRanges(slice(allLayers.carriagewayWidth), 'carriagewayWidthM'),
        municipality: mergeRanges(slice(allLayers.municipality), 'name'),
        bridges: slice(allLayers.bridges),
        kmPosts: slicePosts(allLayers.kmPosts),
        miow: miowByYear,
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

  useEffect(() => {
    const years = Array.from(new Set((allLayers?.miow || []).map(r => r.year))).sort((a,b) => b - a)
    const next = DEFAULT_BAND_GROUPS.map(g => ({ ...g, bands:[...g.bands] }))
    const hist = next.find(g => g.key === 'historical')
    if (hist) {
      hist.bands = years.map(y => ({ key:`miow_${y}`, title:String(y), height:20 }))
    }
    setBandGroups(next)
  }, [allLayers])

  const onSearch = () => {
    const kmVal = lrpToChainageKm(q, allLayers?.kmPosts)
    if (kmVal != null) {
      const sec = sectionList.find(s => kmVal >= s.startKm && kmVal <= s.endKm)
      if (sec) {
        setGuideKm(kmVal - sec.startKm)
        setSectionId(sec.id)
        setShowGuide(true)
      }
      return
    }

    const bridge = allLayers?.bridges?.find(
      b => b.name?.toLowerCase().includes(q.trim().toLowerCase())
    )
    if (bridge) {
      const sec = sectionList.find(s => s.id === bridge.sectionId)
      if (sec) {
        setGuideKm(bridge.startKm - sec.startKm)
        setSectionId(sec.id)
        setShowGuide(true)
      }
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

  const activeKm = guideKm ?? (showGuide ? hoverKm : null)
  const hoverX = activeKm != null && kmToX ? kmToX(activeKm) : null
  const bandValues = useMemo(() => {
    if (activeKm == null) return []
    const out = []
    for (const g of bandGroups) {
      for (const b of g.bands) {
        const v = bandValueAt(layers, b.key, activeKm)
        if (v) out.push({ title:b.title, value:v })
      }
    }
    return out
  }, [bandGroups, layers, activeKm])

  return (
    <div style={{ fontFamily:'Inter, system-ui, Arial', background:'#f0f2f5', minHeight:'100vh' }}>
      <div style={{ maxWidth: 1400, margin:'0 auto', padding:'16px' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:8 }}>
          <h2 style={{ margin:0 }}>Road Analyzer — SLD</h2>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Search chainage or bridge…"
              onKeyDown={(e)=>{ if(e.key==='Enter') onSearch() }}
              style={{ width: 260 }}
            />
            <button type="button" onClick={onSearch}>Search</button>
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
          editSeams={editSeams}
          onToggleEditSeams={()=>setEditSeams(e=>!e)}
          kmPosts={layers?.kmPosts}
        />

        <div style={{ border:'1px solid #e0e0e0', borderRadius:8, background:'#fff', padding:8, marginTop:8 }}>
          <div style={{ fontWeight:700, marginBottom:6 }}>
            {currentRoad?.name ?? 'Road'} — Editable Independent Bands
          </div>
          <div style={{ position:'relative' }}>
            <SLDCanvasV2
              road={currentRoad}
              layers={layers}
              domain={domain}
              onDomainChange={(a,b)=>{ setFromKm(a); setToKm(b) }}
              bands={[]}
              onMoveSeam={handleMoveSeam}
              canEditSeams={editSeams}
              showGuide={showGuide}
              onHoverKm={setHoverKm}
              onKmToX={(fn) => setKmToX(() => fn)}
              onLayout={setRoadLayout}
            />
            <BandAccordion groups={bandGroups} layers={layers} domain={domain} />
            {activeKm != null && hoverX != null && (
              <>
                <div
                  style={{ position:'absolute', top:0, bottom:0, left:hoverX, width:1, background:'#FFC107', pointerEvents:'none', zIndex:10 }}
                />
                <div
                  style={{
                    position:'absolute',
                    left:hoverX,
                    top: roadLayout.axisY - 8,
                    transform:'translate(-50%, -100%)',
                    background:'rgba(0,0,0,0.7)',
                    color:'#fff',
                    borderRadius:4,
                    padding:'2px 4px',
                    fontSize:11,
                    pointerEvents:'none',
                    zIndex:10,
                    whiteSpace:'nowrap'
                  }}
                >
                  <div>{formatLRP(activeKm, layers?.kmPosts)}</div>
                  <div>{formatChainage(Math.round(activeKm * 1000))}</div>
                  {bandValues.map(b => (
                    <div key={b.title}>{b.title}: {b.value}</div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ fontSize:12, color:'#616161', marginTop:6 }}>
            Drag seams to edit. Bridges allow gaps and support dragging either edge. Pan by dragging; scroll to zoom.
          </div>
        </div>
      </div>
    </div>
  )
}
