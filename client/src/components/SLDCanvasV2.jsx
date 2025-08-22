import React, { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_BANDS } from '../bands'

const SURFACE_COLORS = { Asphalt:'#282828', Concrete:'#a1a1a1', Gravel:'#8d6e63' }
const QUALITY_COLORS = { Poor:'#e53935', Fair:'#fb8c00', Good:'#43a047', Excellent:'#1e88e5' }
const STATUS_COLORS  = { Open:'#9e9e9e', Closed:'#d32f2f' }

const LANE_ROW_H = 126
const LANE_UNIT  = 24
const MARK_THICK = 3

const KM_POST_H = 20
const KM_POST_LABEL_H = 14
const KM_POST_GAP = 4

const GAP = 8
const TOP_PAD = 24
const LEFT_PAD = 60
const RIGHT_PAD = 16
const AXIS_H = 20

const MIN_BAND_H = 20
const MAX_BAND_H = 120
const HANDLE_HIT = 6
const EPS = 1e-6

function formatAADT(n){ return (n==null)? '' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }

export default function SLDCanvasV2({
  road,
  layers,
  domain,
  onDomainChange,
  bands = DEFAULT_BANDS,
  onMoveSeam,        // (bandKey, leftId, rightId, km, extra={})
}) {
  const canvasRef = useRef(null)
  const [panX, setPanX] = useState(0)
  const [zoom, setZoom] = useState(80)

  const rafRef      = useRef(0)
  const helpersRef  = useRef({ kmToX:(km)=>km, xToKm:(x)=>x })
  const dragRef     = useRef(null)

  const lengthKm = Number(road?.lengthKm || 0)
  const fromKm = Math.max(0, domain?.fromKm ?? 0)
  const toKm   = Math.min(lengthKm, domain?.toKm ?? lengthKm)

  useEffect(()=>{
    const el = canvasRef.current; if(!el) return
    const w = el.clientWidth || 1200
    const desiredZoom = (w - LEFT_PAD - RIGHT_PAD) / Math.max(0.001, (toKm - fromKm))
    setZoom(desiredZoom)
    setPanX(LEFT_PAD - fromKm * desiredZoom)
  }, [fromKm, toKm, lengthKm])

  const layout = useMemo(()=>{
    let y = TOP_PAD
    const lanesY = y; y += LANE_ROW_H
    // ruler sits just below the road visualization
    const axisY = y + 2
    y = axisY + AXIS_H + GAP
    const bandBoxes = bands.map((b) => {
      const h = Math.max(MIN_BAND_H, Math.min(MAX_BAND_H, Number(b.height)||28))
      const box = { y, h, key: b.key, title: b.title }
      y += h
      return box
    })
      const kmPostY = axisY - (KM_POST_H + KM_POST_LABEL_H + KM_POST_GAP)
      const totalH = y + 10
      return { lanesY, bandBoxes, axisY, kmPostY, totalH }

    }, [bands])

  function drawDashes(ctx, x1, x2, y, dashLen = 12, gapLen = 10, thickness = MARK_THICK) {
    const usableStart = x1 + 6
    const usableEnd   = x2 - 6
    if (usableEnd <= usableStart) return
    const period = dashLen + gapLen
    let xi = usableStart
    while (xi < usableEnd) {
      const w = Math.min(dashLen, usableEnd - xi)
      if (w <= 0) break
      ctx.fillRect(Math.round(xi)+0.5, Math.round(y - thickness/2)+0.5, w, thickness)
      xi += period
    }
  }

    function drawKmPost(ctx, x, y, kmValue) {
      const topW = 8
      const botW = 24
      const h = KM_POST_H
      const rectW = botW
      const rectH = KM_POST_LABEL_H
      ctx.fillStyle = '#FFC107'
      ctx.beginPath()
      ctx.moveTo(x - topW/2, y)
      ctx.lineTo(x + topW/2, y)
      ctx.lineTo(x + botW/2, y + h)
      ctx.lineTo(x - botW/2, y + h)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect(x - rectW/2, y + h, rectW, rectH)
      ctx.fillStyle = '#000'
      ctx.font = 'bold 10px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('KM', x, y + h/2)
      ctx.fillText(String(kmValue), x, y + h + rectH/2)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }

  const lanesAt = (km) => {
    const arr = layers?.lanes || []
    for (const r of arr) if (km >= r.startKm - EPS && km <= r.endKm + EPS) return Math.max(1, r.lanes)
    return 2
  }

  const surfaceAt = (km) => {
    const arr = layers?.surface || []
    for (const r of arr) if (km >= r.startKm - EPS && km <= r.endKm + EPS) return r.surface
    return 'Asphalt'
  }

    const draw = () => {
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

    // ROAD strip (no seam lines)
    const xStart = kmToX(fromKm), xEnd = kmToX(toKm)
    const sampleCount = Math.max(1, Math.floor((toKm - fromKm) * 30))
    let prevYTop=null, prevYBot=null, prevX=null

    for (let i=0;i<=sampleCount;i++){
      const t = i / sampleCount
      const km = fromKm + t * (toKm - fromKm)
      const x = kmToX(km)
      const lanes = lanesAt(km)
      const thickness = Math.max(18, lanes * (LANE_UNIT * 0.9))
      const yCenter = layout.lanesY + LANE_ROW_H/2
      const yTop = yCenter - thickness/2
      const yBot = yCenter + thickness/2
      const surf = surfaceAt(km)
      const color = SURFACE_COLORS[surf] || '#707070'

      if (prevX != null) {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(prevX-0.5, Math.floor(prevYTop)+0.5)
        ctx.lineTo(x+0.5,     Math.floor(yTop)+0.5)
        ctx.lineTo(x+0.5,     Math.ceil(yBot)+0.5)
        ctx.lineTo(prevX-0.5, Math.ceil(prevYBot)+0.5)
        ctx.closePath()
        ctx.fill()
      }
      prevX=x; prevYTop=yTop; prevYBot=yBot
    }

    // dashed center line
    ctx.fillStyle = '#ffd54f'
    const yCenter = layout.lanesY + LANE_ROW_H/2
    drawDashes(ctx, xStart, xEnd, yCenter, 12, 10, MARK_THICK)

        // KM labels / axis
    ctx.strokeStyle = '#9e9e9e'
    ctx.fillStyle = '#616161'
    ctx.lineWidth = 1
      const spanKm = toKm - fromKm
      // show 100m ticks when viewing 2 km or less of road
      const showHundred = spanKm <= 2
      const step = showHundred ? 0.1 : 1
      const startTick = Math.ceil(fromKm / step) * step
      ctx.textAlign = 'center'
      for (let k = startTick; k <= toKm + 1e-9; k += step) {
        const x = kmToX(k)
        ctx.beginPath()
        ctx.moveTo(x, layout.axisY)
        ctx.lineTo(x, layout.axisY + 6)
        ctx.stroke()
        let label
        if (showHundred) {
          const isWholeKm = Math.abs(k - Math.round(k)) < 1e-9
          label = isWholeKm ? String(Math.round(k)) : String(Math.round(k * 1000))
        } else {
          label = String(Math.round(k))
        }
        ctx.font = '10px system-ui'
        ctx.fillText(label, x, layout.axisY + 18)
      }
      ctx.textAlign = 'left'
      ctx.fillText(showHundred ? 'm' : 'km', w-16, layout.axisY+18)

    // ----- BANDS -----
    const drawRanges = (box, ranges, colorFn, labelFn) => {
      if (!ranges) return
      const titleY = box.y + Math.min(16, box.h-6)
      const trackH = box.h - 6
      const trackW = w - LEFT_PAD - RIGHT_PAD
      const trackY = box.y

      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(LEFT_PAD, trackY, trackW, trackH)

      for (const r of ranges) {
        if (r.endKm < fromKm || r.startKm > toKm) continue
        const x1 = kmToX(Math.max(r.startKm, fromKm))
        const x2 = kmToX(Math.min(r.endKm, toKm))
        const ww = Math.max(1, x2 - x1) + 1 // overlap to hide hairlines
        ctx.fillStyle = colorFn(r)
        ctx.fillRect(Math.floor(x1)-0.5, trackY, ww, trackH)

        const lbl = labelFn ? labelFn(r) : ''
        if (lbl) {
          ctx.fillStyle = '#fff'
          ctx.font = '11px system-ui'
          ctx.textAlign = 'center'
          ctx.fillText(lbl, x1 + ww/2 - 0.5, trackY + (trackH/2) + 3)
          ctx.textAlign = 'left'
        }
      }

      ctx.fillStyle = '#424242'
      ctx.font = '12px system-ui'
      ctx.fillText(box.title, 4, titleY)
    }

    for (const box of layout.bandBoxes) {
      switch (box.key) {
        case 'surface':
          drawRanges(box, layers?.surface, r => SURFACE_COLORS[r.surface]||'#bdbdbd', r => r.surface)
          break
        case 'aadt':
          drawRanges(box, layers?.aadt, () => '#6a1b9a', r => formatAADT(r.aadt))
          break
        case 'status':
          drawRanges(box, layers?.status, r => STATUS_COLORS[r.status]||'#bdbdbd', r => r.status)
          break
        case 'quality':
          drawRanges(box, layers?.quality, r => QUALITY_COLORS[r.quality]||'#bdbdbd', r => r.quality)
          break
        case 'rowWidth':
          drawRanges(box, layers?.rowWidth, () => '#1565c0', r => `${r.rowWidthM} m`)
          break
        case 'lanes':
          drawRanges(box, layers?.lanes, () => '#4e342e', r => `${r.lanes} lanes`)
          break
        case 'municipality':
          drawRanges(box, layers?.municipality, () => '#00796b', r => r.name)
          break
        case 'bridges':
          drawRanges(box, layers?.bridges, () => '#5d4037', r => r.name)
          break
        default:
          break
      }
    }
    // kilometer posts from kmPost table (if any)
    const kmPosts = (layers?.kmPosts || [])
      .filter(p => p.chainageKm >= fromKm && p.chainageKm <= toKm)
    for (const p of kmPosts) {
      const x = kmToX(p.chainageKm)
      const label = p.lrp?.replace(/^\s*KM\s*/i, '') ?? Math.round(p.chainageKm)
      drawKmPost(ctx, x, layout.kmPostY, label)
    }
    }

        useEffect(() => {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = requestAnimationFrame(() => draw())
        }, [fromKm, toKm, panX, zoom, layout, layers]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- interactions ----------
  const bandArrayByKey = (key) => {
    if (!layers) return []
    switch (key) {
      case 'surface': return layers.surface || []
      case 'aadt': return layers.aadt || []
      case 'status': return layers.status || []
      case 'quality': return layers.quality || []
      case 'lanes': return layers.lanes || []
      case 'rowWidth': return layers.rowWidth || []
      case 'municipality': return layers.municipality || []
      case 'bridges': return layers.bridges || []
      default: return []
    }
  }

  // hit seam/edge: for bridges, allow start & end edge handles; for others, only adjacent seams
  const hitSeamAt = (x, y) => {
    const { kmToX } = helpersRef.current
    let box = null
    for (const b of layout.bandBoxes) {
      if (y >= b.y && y <= b.y + b.h) { box = b; break }
    }
    if (!box) return null
    const arr = bandArrayByKey(box.key)

    if (box.key === 'bridges') {
      for (let i=0; i<arr.length; i++){
        const r = arr[i]
        const sx = kmToX(r.startKm)
        const ex = kmToX(r.endKm)
        if (Math.abs(ex - x) <= HANDLE_HIT) {
          // end edge handle
          const right = arr[i+1] || null
          return { bandKey: box.key, left: r, right, edge:'end' }
        }
        if (Math.abs(sx - x) <= HANDLE_HIT) {
          // start edge handle
          const left = arr[i-1] || null
          return { bandKey: box.key, left, right: r, edge:'start' }
        }
      }
      return null
    }

    // default bands: adjacent seam between i and i+1
    for (let i=0;i<arr.length-1;i++){
      const seamKm = arr[i].endKm
      if (seamKm <= fromKm || seamKm >= toKm) continue
      const px = kmToX(seamKm)
      if (Math.abs(px - x) <= HANDLE_HIT) {
        return { bandKey: box.key, left: arr[i], right: arr[i+1] }
      }
    }
    return null
  }

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
    const seam = hitSeamAt(x, y)
    if (seam) { dragRef.current = { type:'seam', ...seam }; return }
    dragRef.current = { type:'pan', startX:x, startFrom: fromKm, startTo: toKm }
  }

  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const seam = hitSeamAt(x, y)
    e.currentTarget.style.cursor = seam ? 'ew-resize' : (dragRef.current?.type==='pan' ? 'grabbing' : 'grab')

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
    }
  }

  const onMouseUp = async (e) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || drag.type !== 'seam') return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const { xToKm } = helpersRef.current
    const dropKm = xToKm(x)

    if (drag.bandKey === 'bridges') {
      if (drag.edge === 'end') {
        const next = drag.right || null
        // clamp will be done server-side; we just send what we dropped
        await onMoveSeam?.('bridges', drag.left.id, next?.id ?? null, dropKm, { edge:'end' })
      } else if (drag.edge === 'start') {
        const prev = drag.left || null
        await onMoveSeam?.('bridges', prev?.id ?? null, drag.right.id, dropKm, { edge:'start' })
      }
      return
    }

    // default bands (gap-free), seam is between left & right
    await onMoveSeam?.(drag.bandKey, drag.left.id, drag.right.id, dropKm)
  }

  return (
    <div style={{ border:'1px solid #e0e0e0', borderRadius:8, background:'#fff', padding:8 }}>
      <div style={{ fontWeight:700, marginBottom:6 }}>
        {road?.name ?? 'Road'} — Editable Independent Bands
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
        Drag seams to edit. Bridges allow gaps and support dragging either edge. Pan by dragging; scroll to zoom.
      </div>
    </div>
  )
}
