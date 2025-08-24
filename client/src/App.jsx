import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchRoads, fetchLayers, moveBandSeam } from './api'
import ControlBar from './components/ControlBar'
import SLDCanvasV2 from './components/SLDCanvasV2'
import { DEFAULT_BAND_GROUPS, bandArrayByKey } from './bands'
import BandAccordion, { LABEL_W } from './components/BandAccordion'
import { lrpToChainageKm, formatLRP } from './lrp'

const EPS = 1e-6
const SNAP_PX = 6 // px tolerance for snapping guide to seams

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

function formatChainage(m) {
  return m == null ? '' : String(Math.round(m)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
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
  const [hoverLeft, setHoverLeft] = useState(null)
  const [scale, setScale] = useState(null)
  const hoverClientX = useRef(null)
  const hoverBandKey = useRef(null)
  const contentRef = useRef(null)

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
  const guideTrackLeft = guideKm != null
    ? (scale ? scale.strokeXFromM(guideKm * 1000) : null)
    : hoverLeft
  const guideLeft = guideTrackLeft != null ? LABEL_W + guideTrackLeft : null

  const handlePanelMouseMove = (e) => {
    if (!scale) return
    hoverClientX.current = e.clientX
    const rect = e.currentTarget.getBoundingClientRect()
    const a = scale.cssLeftFromM(0)
    const b = scale.pxPerM * 1000
    const len = currentRoad?.lengthKm || 0
    const rawX = e.clientX - rect.left - LABEL_W
    let px = Math.round(rawX)

    const bandEl = e.target.closest('[data-band-key]')
    const bandKey = bandEl?.getAttribute('data-band-key') || null
    hoverBandKey.current = bandKey

    let snappedKm = null
    if (showGuide && bandKey) {
      const arr = bandArrayByKey(layers, bandKey)
      let snapped = false
      for (const r of arr) {
        for (const seamKm of [r.startKm, r.endKm]) {
          if (seamKm <= fromKm || seamKm >= toKm) continue
          const seamPx = scale.strokeXFromM(seamKm * 1000)
          if (Math.abs(seamPx - rawX) <= SNAP_PX) {
            px = seamPx
            snappedKm = seamKm
            snapped = true
            break
          }
        }
        if (snapped) break
      }
    }

    let km = snappedKm != null ? snappedKm : (px - a) / b
    km = Math.max(0, Math.min(len, km))
    setHoverKm(km)
    setHoverLeft(px)
  }

  const handlePanelMouseLeave = () => {
    hoverClientX.current = null
    hoverBandKey.current = null
    setHoverKm(null)
    setHoverLeft(null)
  }

  const handlePanelScroll = (e) => {
    if (!scale || hoverClientX.current == null) return
    const rect = e.currentTarget.getBoundingClientRect()
    const a = scale.cssLeftFromM(0)
    const b = scale.pxPerM * 1000
    const len = currentRoad?.lengthKm || 0
    const rawX = hoverClientX.current - rect.left - LABEL_W
    let px = Math.round(rawX)

    const bandKey = hoverBandKey.current
    let snappedKm = null
    if (showGuide && bandKey) {
      const arr = bandArrayByKey(layers, bandKey)
      let snapped = false
      for (const r of arr) {
        for (const seamKm of [r.startKm, r.endKm]) {
          if (seamKm <= fromKm || seamKm >= toKm) continue
          const seamPx = scale.strokeXFromM(seamKm * 1000)
          if (Math.abs(seamPx - rawX) <= SNAP_PX) {
            px = seamPx
            snappedKm = seamKm
            snapped = true
            break
          }
        }
        if (snapped) break
      }
    }

    let km = snappedKm != null ? snappedKm : (px - a) / b
    km = Math.max(0, Math.min(len, km))
    setHoverKm(km)
    setHoverLeft(px)
  }

  const handlePanelWheel = useCallback((e) => {
    if (!scale) return
    e.preventDefault()
    const rect = (e.currentTarget || contentRef.current).getBoundingClientRect()
    const a = scale.cssLeftFromM(0)
    const b = scale.pxPerM * 1000
    const x = e.clientX - rect.left - LABEL_W
    const mouseKm = (x - a) / b
    const length = currentRoad?.lengthKm || 0
    const currSpan = Math.max(0.001, toKm - fromKm)
    const factor = Math.exp(e.deltaY * 0.001)
    let newSpan = Math.min(length, Math.max(0.05, currSpan * factor))
    const leftFrac = (mouseKm - fromKm) / currSpan
    let newFrom = mouseKm - leftFrac * newSpan
    let newTo = newFrom + newSpan
    if (newFrom < 0) { newTo -= newFrom; newFrom = 0 }
    if (newTo > length) { newFrom -= (newTo - length); newTo = length }
    if (newTo <= newFrom) return
    setFromKm(newFrom)
    setToKm(newTo)
  }, [scale, currentRoad, fromKm, toKm, setFromKm, setToKm])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    el.addEventListener('wheel', handlePanelWheel, { passive: false })
    return () => el.removeEventListener('wheel', handlePanelWheel)
  }, [handlePanelWheel])

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
          <div
            ref={contentRef}
            style={{ position:'relative', overflowX:'auto', overflowY:'visible' }}
            onMouseMove={handlePanelMouseMove}
            onMouseLeave={handlePanelMouseLeave}
            onScroll={handlePanelScroll}
          >
            <div style={{ display:'flex' }}>
              <div
                style={{
                  position:'sticky',
                  left:0,
                  flex:`0 0 ${LABEL_W}px`,
                  background:'#fafafa',
                  zIndex:1,
                  pointerEvents:'none'
                }}
              />
              <div style={{ flex:1 }}>
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
                  onScale={setScale}
                />
              </div>
            </div>
            <BandAccordion
              groups={bandGroups}
              layers={layers}
              domain={domain}
              activeKm={activeKm}
              guideLeft={guideLeft}
              contentRef={contentRef}
              scale={scale}
            />
            {activeKm != null && guideLeft != null && (
              <div
                style={{ position:'absolute', top:0, bottom:0, left:guideLeft, width:1, background:'#FFC107', pointerEvents:'none', zIndex:10 }}
              />
            )}
            {activeKm != null && guideLeft != null && (
              <div
                style={{
                  position:'absolute',
                  left:guideLeft,
                  top:0,
                  transform:'translate(-50%, -100%)',
                  background:'rgba(0,0,0,0.7)',
                  color:'#fff',
                  borderRadius:9999,
                  padding:'0 6px',
                  fontSize:12,
                  whiteSpace:'nowrap',
                  pointerEvents:'none',
                  zIndex:40,
                }}
              >
                {formatLRP(activeKm + (currentSection?.startKm || 0), layers?.kmPosts)} ({formatChainage((activeKm + (currentSection?.startKm || 0)) * 1000)} m)
              </div>
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
