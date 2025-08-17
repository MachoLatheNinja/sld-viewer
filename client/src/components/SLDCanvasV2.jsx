import React, { useEffect, useMemo, useRef, useState } from 'react'

// Surface colors for both lane pavement and the "Surface" band
const SURFACE_COLORS = { Asphalt:'#282828', Concrete:'#a1a1a1', Gravel:'#8d6e63' }
const QUALITY_COLORS = { Poor:'#e53935', Fair:'#fb8c00', Good:'#43a047', Excellent:'#1e88e5' }
const STATUS_COLORS  = { Open:'#9e9e9e', Closed:'#d32f2f' }

// --- layout (tripled lane thickness) ---
const LANE_ROW_H = 126      // each direction block height
const LANE_UNIT  = 24       // each lane = 24px tall
const SHOULDER_T = 3        // shoulder line thickness
const MARK_THICK = 3        // dashed line thickness

const GAP = 8
const TOP_PAD = 24
const LEFT_PAD = 60
const RIGHT_PAD = 16
const AXIS_H = 20

const MIN_BAND_H = 20
const MAX_BAND_H = 120
const HANDLE_HIT = 6
const EPS = 1e-6

function deriveAADT(seg){
  if (seg.aadt != null) return Number(seg.aadt)
  if (seg.surface === 'Asphalt')  return 36000
  if (seg.surface === 'Concrete') return 28000
  return 12000
}
function formatAADT(n){ return (n==null)? '' : n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') }

function bandValue(seg, key){
  switch (key) {
    case 'surface':  return seg.surface ?? ''
    case 'status':   return seg.status ?? ''
    case 'quality':  return seg.quality ?? ''
    case 'sidewalk': return !!seg.sidewalk
    case 'aadt':     return seg.aadt != null ? Number(seg.aadt) : deriveAADT(seg)
    default:         return null
  }
}

const BAND_RENDERERS = {
  surface:  { color:(s)=>SURFACE_COLORS[s.surface]||'#bdbdbd',   label:(s)=>s.surface||'' },
  aadt:     { color:()=> '#6a1b9a',                              label:(s)=>formatAADT(deriveAADT(s)) },
  status:   { color:(s)=>STATUS_COLORS[s.status]||'#bdbdbd',      label:(s)=>s.status||'' },
  quality:  { color:(s)=>QUALITY_COLORS[s.quality]||'#bdbdbd',    label:(s)=>s.quality||'' },
  sidewalk: { color:(s)=> (s.sidewalk ? '#66bb6a' : '#212121'),   label:(s)=> s.sidewalk? 'Yes':'No' },
}

export default function SLDCanvasV2({
  road,
  segments = [],
  domain,
  onDomainChange,
  bands,
  onBandsChange,
  // (segmentId, {newStartKm?|newEndKm?})
  onResizeEdge,
}) {
  const canvasRef = useRef(null)
  const [panX, setPanX] = useState(0)      // derived from domain
  const [zoom, setZoom] = useState(80)     // derived from domain

  const rafRef      = useRef(0)
  const segsRef     = useRef(segments)
  const dragRef     = useRef(null)
  const lastArgsRef = useRef(null)
  const helpersRef  = useRef({ kmToX:(km)=>km, xToKm:(x)=>x })

  useEffect(()=>{ segsRef.current = segments }, [segments])

  const lengthKm = Number(road?.lengthKm || 0)
  const fromKm = Math.max(0, domain?.fromKm ?? 0)
  const toKm   = Math.min(lengthKm, domain?.toKm ?? lengthKm)

  const layout = useMemo(()=>{
    let y = TOP_PAD
    const lanesTop = y; y += LANE_ROW_H
    const lanesBot = y; y += LANE_ROW_H
    y += GAP
    const bandBoxes = bands.map((b) => {
      const h = Math.max(MIN_BAND_H, Math.min(MAX_BAND_H, Number(b.height)||28))
      const box = { y, h, key: b.key, title: b.title }
      y += h
      return box
    })
    const axisY = y + 2
    const totalH = axisY + AXIS_H + 10
    return { lanesTop, lanesBot, bandBoxes, axisY, totalH }
  }, [bands])

  // Keep zoom/pan in sync with the domain (single source of truth)
  useEffect(()=>{
    const el = canvasRef.current; if(!el) return
    const w = el.clientWidth || 1200
    const desiredZoom = (w - LEFT_PAD - RIGHT_PAD) / Math.max(0.001, (toKm - fromKm))
    setZoom(desiredZoom)
    setPanX(LEFT_PAD - fromKm * desiredZoom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKm, toKm, lengthKm])

  // Merge same-value segments within the current window (used for bands)
  function buildMergedRangesForBand(segs, key, fromKm, toKm) {
    const S = segs
      .filter(s => s.endKm > fromKm && s.startKm < toKm)
      .slice()
      .sort((a,b)=> a.startKm - b.startKm || a.id - b.id)

    const merged = []
    for (const s of S) {
      const val = bandValue(s, key)
      const start = Math.max(fromKm, s.startKm)
      const end   = Math.min(toKm, s.endKm)
      if (end - start <= 0) continue

      if (merged.length === 0) {
        merged.push({ startKm: start, endKm: end, value: val, sampleSeg: s, segId: s.id })
      } else {
        const last = merged[merged.length - 1]
        const equalVal = (val === last.value) || (Number.isFinite(val) && Number.isFinite(last.value) && Math.abs(val - last.value) < EPS)
        const contiguous = Math.abs(start - last.endKm) < EPS || start <= last.endKm + EPS
        if (equalVal && contiguous) {
          last.endKm = Math.max(last.endKm, end)
        } else {
          merged.push({ startKm: start, endKm: end, value: val, sampleSeg: s, segId: s.id })
        }
      }
    }
    return merged
  }

  // dashed line using filled rectangles (continuous/broken)
  function drawDashes(ctx, x1, x2, y, dashLen = 12, gapLen = 10, thickness = MARK_THICK) {
    const usableStart = x1 + 6
    const usableEnd   = x2 - 6
    if (usableEnd <= usableStart) return
    const width = usableEnd - usableStart
    const period = dashLen + gapLen
    const count = Math.ceil(width / period)
    let xi = usableStart
    for (let i = 0; i < count; i++) {
      const w = Math.min(dashLen, usableEnd - xi)
      if (w <= 0) break
      ctx.fillRect(xi, Math.round(y - thickness/2) + 0.5, w, thickness)
      xi += period
    }
  }

  // --------- drawing ---------
  const draw = (args) => {
    const { segs, fromKm, toKm, panX, zoom, layout } = args
    const prev = lastArgsRef.current
    if (prev &&
        prev.segs === segs &&
        prev.fromKm === fromKm && prev.toKm === toKm &&
        prev.panX === panX && prev.zoom === zoom &&
        prev.layout === layout) {
      return
    }
    lastArgsRef.current = args

    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.clientWidth || 1200
    const h = layout.totalH
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr,0,0,dpr,0,0)

    const kmToX = (km) => LEFT_PAD + panX + km*zoom
    const xToKm = (x) => (x - LEFT_PAD - panX) / zoom
    helpersRef.current = { kmToX, xToKm }

    // background
    ctx.fillStyle = '#efe9d5'
    ctx.fillRect(0,0,w,h)

    // -------- LANE ROWS (draw outward from centerline; colored by segment.surface) --------
    const pxOverlap = 0.5

    const drawLaneRow = (dir, yBase) => {
      const rowH = LANE_ROW_H - 6
      const innerY = (dir === 'L')
        ? (yBase + rowH - SHOULDER_T) // inner edge near divider (bottom of top row)
        : (yBase + SHOULDER_T)        // inner edge near divider (top of bottom row)

      for (const s of segs) {
        if (s.endKm < fromKm || s.startKm > toKm) continue
        const x1 = kmToX(Math.max(s.startKm, fromKm))
        const x2 = kmToX(Math.min(s.endKm, toKm))
        const ww = Math.max(1, x2 - x1)

        const lanes = Math.max(1, dir==='L' ? (s.lanesLeft ?? 2) : (s.lanesRight ?? 2))
        const paveH = Math.min(rowH - 2*SHOULDER_T, lanes * LANE_UNIT)
        const baseY = (dir === 'L') ? (innerY - paveH) : innerY

        const surfaceColor = SURFACE_COLORS[s.surface] || '#707070'
        ctx.fillStyle = surfaceColor
        ctx.fillRect(x1 - pxOverlap, baseY, ww + 2*pxOverlap, paveH)

        // shoulders (horizontal only)
        ctx.fillStyle = '#1b1b1b'
        // inner fixed
        ctx.fillRect(x1 - pxOverlap, innerY - (dir==='L'?1:0), ww + 2*pxOverlap, 1)
        // outer depends on lanes
        const outerY = (dir==='L') ? (baseY) : (baseY + paveH - 1)
        ctx.fillRect(x1 - pxOverlap, outerY, ww + 2*pxOverlap, 1)

        // dashed separators per lane
        ctx.fillStyle = '#ffd54f'
        for (let i = 1; i <= lanes - 1; i++) {
          const y = (dir === 'L') ? (innerY - i * LANE_UNIT) : (innerY + i * LANE_UNIT)
          drawDashes(ctx, x1, x2, y, 12, 10, MARK_THICK)
        }
      }
    }

    drawLaneRow('L', layout.lanesTop)
    drawLaneRow('R', layout.lanesBot)

    // subtle divider between directions (horizontal only)
    ctx.strokeStyle = '#b0bec5'
    ctx.setLineDash([6,4])
    ctx.beginPath()
    ctx.moveTo(LEFT_PAD, layout.lanesBot-3)
    ctx.lineTo(w-RIGHT_PAD, layout.lanesBot-3)
    ctx.stroke()
    ctx.setLineDash([])

    // -------- BANDS (merged segments with same value) --------
    for (const box of layout.bandBoxes) {
      const renderer = BAND_RENDERERS[box.key] || { color:()=> '#bdbdbd', label:()=> '' }

      // title
      ctx.fillStyle = '#424242'
      ctx.font = '12px system-ui'
      ctx.fillText(box.title, 4, box.y + Math.min(16, box.h-6))

      // track background
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(LEFT_PAD, box.y, w - LEFT_PAD - RIGHT_PAD, box.h - 6)

      // merged bands
      const merged = buildMergedRangesForBand(segs, box.key, fromKm, toKm)
      for (const mr of merged) {
        const x1 = kmToX(mr.startKm)
        const x2 = kmToX(mr.endKm)
        const ww = Math.max(1, x2 - x1)
        const sample = mr.sampleSeg
        ctx.fillStyle = renderer.color(sample)
        ctx.fillRect(x1, box.y, ww, box.h - 6)

        const label = renderer.label ? renderer.label(sample) : ''
        if (label) {
          ctx.fillStyle = '#fff'
          ctx.font = '11px system-ui'
          ctx.textAlign = 'center'
          ctx.fillText(label, x1 + ww/2, box.y + (box.h/2) + 3)
          ctx.textAlign = 'left'
        }
      }

      // simple visual seam lines to hint at editable edges (between merged ranges)
      ctx.fillStyle = '#00000044'
      for (const mr of merged) {
        const xx = kmToX(mr.endKm)
        if (mr.endKm < toKm - EPS) ctx.fillRect(xx - 1, box.y, 2, box.h - 6)
      }

      // bottom guide
      ctx.fillStyle = '#9e9e9e88'
      ctx.fillRect(LEFT_PAD, box.y + box.h - 2, w - LEFT_PAD - RIGHT_PAD, 2)
    }

    // -------- Axis --------
    ctx.strokeStyle = '#9e9e9e'
    ctx.fillStyle = '#616161'
    ctx.lineWidth = 1
    ctx.font = '10px system-ui'
    const step = niceStep(Math.max(0.001, toKm - fromKm))
    const startTick = Math.ceil(fromKm / step) * step
    for(let k=startTick; k<=toKm+1e-9; k+=step){
      const x = kmToX(k)
      ctx.beginPath()
      ctx.moveTo(x, layout.axisY)
      ctx.lineTo(x, layout.axisY+6)
      ctx.stroke()
      ctx.fillText(k.toFixed(2), x-8, layout.axisY+18)
    }
    ctx.fillText('km', w-26, layout.axisY+18)
  }

  const scheduleDraw = () => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      draw({ segs: segsRef.current, fromKm, toKm, panX, zoom, layout })
    })
  }

  useEffect(() => { scheduleDraw() }, [fromKm, toKm, panX, zoom, layout])
  useEffect(() => { scheduleDraw() }, [segments])

  // ----- hit test for resize handles (between merged ranges) -----
  const hitEdgeAt = (x, y) => {
    const { kmToX } = helpersRef.current
    let bandKey = null
    for (const box of layout.bandBoxes) {
      if (y >= box.y && y <= box.y + box.h) { bandKey = box.key; break }
    }
    if (!bandKey) return null

    // Find a segment boundary near X by comparing adjacent original segments
    // and return the segment id of the right segment (to adjust its start) or
    // left segment (to adjust its end). This is a simplified handler.
    const km = helpersRef.current.xToKm(x)
    // pick closest seam (endKm) in view
    let best = null
    for (const s of segsRef.current) {
      if (s.endKm <= km + 0.02 && s.endKm >= km - 0.02 && s.endKm > domain.fromKm + EPS && s.endKm < domain.toKm - EPS) {
        const px = kmToX(s.endKm)
        if (Math.abs(px - x) <= HANDLE_HIT) {
          best = { segmentId: s.id, km: s.endKm }
          break
        }
      }
    }
    return best
  }

  // ----- interactions -----
  const onWheel = (e) => {
    e.preventDefault()
    const { xToKm } = helpersRef.current
    const { offsetX } = e.nativeEvent
    const mouseKm = xToKm(offsetX)

    const zoomIn = e.deltaY < 0
    const factor = zoomIn ? 0.9 : 1.1

    const currSpan = Math.max(0.001, toKm - fromKm)
    let newSpan = Math.min(lengthKm, Math.max(0.05, currSpan * factor))

    const leftFrac = (mouseKm - fromKm) / currSpan
    let newFrom = mouseKm - leftFrac * newSpan
    let newTo = newFrom + newSpan

    if (newFrom < 0) { newTo -= newFrom; newFrom = 0 }
    if (newTo > lengthKm) { newFrom -= (newTo - lengthKm); newTo = lengthKm }
    if (newTo <= newFrom) return

    onDomainChange(newFrom, newTo)
  }

  const onMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const edge = hitEdgeAt(x, y)
    if (edge) { dragRef.current = { type:'edge', ...edge }; return }
    dragRef.current = { type:'pan', startX:x, startFrom: fromKm, startTo: toKm }
  }

  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const overEdge = hitEdgeAt(x, y)
    e.currentTarget.style.cursor = overEdge ? 'ew-resize' : (dragRef.current?.type==='pan' ? 'grabbing' : 'grab')

    const drag = dragRef.current
    if (!drag) return

    if (drag.type === 'pan') {
      const deltaPx = x - drag.startX
      const deltaKm = deltaPx / Math.max(1e-6, zoom)
      let nf = drag.startFrom - deltaKm
      let nt = drag.startTo   - deltaKm
      if (nf < 0) { nt -= nf; nf = 0 }
      if (nt > lengthKm) { nf -= (nt - lengthKm); nt = lengthKm }
      if (nt <= nf) return
      onDomainChange(nf, nt)
      return
    }

    if (drag.type === 'edge') {
      // just show cursor; we don't do live preview of the band yet
    }
  }

  const onMouseUp = async (e) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return

    if (drag.type === 'edge') {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const { xToKm } = helpersRef.current
      const dropKm = Math.min(Math.max(0, xToKm(x)), lengthKm)
      const changed = Math.abs(dropKm - drag.km) >= 1e-6
      if (changed) {
        // Persist by telling server to move the boundary near original s.endKm to dropKm
        const payload = (dropKm > drag.km) ? { newEndKm: dropKm } : { newEndKm: dropKm }
        await onResizeEdge?.(drag.segmentId, payload)
      }
    }
  }

  return (
    <div style={{ border:'1px solid #e0e0e0', borderRadius:8, background:'#fff', padding:8 }}>
      <div style={{ fontWeight:700, marginBottom:6 }}>
        {road?.name ?? 'Road'} — Lane Diagram & Attribute Bands
      </div>
      <canvas
        ref={canvasRef}
        style={{ width:'100%', height: layout.totalH, display:'block', cursor:'grab' }}
        width={1200}
        height={layout.totalH}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />
      <div style={{ fontSize:12, color:'#616161', marginTop:6 }}>
        Lanes are prominent (each lane is {LANE_UNIT}px). Pavement color shows the current segment surface.
      </div>
    </div>
  )
}

function niceStep(span){
  if (span <= 0.5) return 0.05
  if (span <= 1)   return 0.1
  if (span <= 2)   return 0.2
  if (span <= 5)   return 0.5
  if (span <= 10)  return 1
  if (span <= 20)  return 2
  if (span <= 50)  return 5
  return 10
}
