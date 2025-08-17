import React, { useEffect, useRef, useState, useMemo } from 'react'

const SURFACE_COLORS = { Asphalt:'#4caf50', Concrete:'#2196f3', Gravel:'#8d6e63' }
const QUALITY_COLORS = { Poor:'#e53935', Fair:'#fb8c00', Good:'#43a047', Excellent:'#1e88e5' }
const STATUS_COLORS  = { Open:'#9e9e9e', Closed:'#d32f2f' }

const BAND_DEF = [
  { key:'surface', title:'Surface', color:(s)=>SURFACE_COLORS[s.surface]||'#bdbdbd' },
  { key:'sidewalk', title:'Sidewalk', color:(s)=> (s.sidewalk ? '#66bb6a' : '#212121') },
  { key:'quality', title:'Quality', color:(s)=>QUALITY_COLORS[s.quality]||'#bdbdbd' },
  { key:'status',  title:'Status',  color:(s)=>STATUS_COLORS[s.status]||'#bdbdbd' }
]

const HEIGHT_PER_BAND = 26
const TOP_PAD = 24
const LEFT_PAD = 60
const RIGHT_PAD = 16
const HANDLE_HIT_PX = 6

export default function StraightLineCanvas({ road, segments = [], highlightRange, onResizeSegment }) {
  const canvasRef = useRef(null)
  const [panX, setPanX] = useState(0)
  const [zoom, setZoom] = useState(80)
  const [drag, setDrag] = useState(null)
  const [hoverHandle, setHoverHandle] = useState(null)

  const lengthKm = Number(road?.lengthKm ?? 0)
  const totalBands = BAND_DEF.length
  const canvasHeight = TOP_PAD + totalBands*HEIGHT_PER_BAND + 24

  const kmToX = (km) => LEFT_PAD + panX + km*zoom
  const xToKm = (x) => (x - LEFT_PAD - panX) / zoom

  const getCanvasWH = () => {
    const el = canvasRef.current
    if (!el) return { w: 1200, h: canvasHeight }
    const w = el.clientWidth || 1200
    const h = el.clientHeight || canvasHeight
    return { w, h }
  }

  const visibleKm = useMemo(()=>{
    const { w } = getCanvasWH()
    const startKm = Math.max(0, xToKm(LEFT_PAD))
    const endKm = Math.min(lengthKm, xToKm(w - RIGHT_PAD))
    return { startKm, endKm }
  }, [panX, zoom, lengthKm])

  useEffect(()=>{
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { w: cw, h: ch } = getCanvasWH()
    const dpr = window.devicePixelRatio || 1
    canvas.width = cw * dpr
    canvas.height = ch * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.clearRect(0,0,cw,ch)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0,0,cw,ch)

    BAND_DEF.forEach((band, i)=>{
      const y = TOP_PAD + i*HEIGHT_PER_BAND
      ctx.fillStyle = '#424242'
      ctx.font = '12px system-ui'
      ctx.fillText(band.title, 4, y+14)

      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(LEFT_PAD, y, cw - LEFT_PAD - RIGHT_PAD, 16)

      for (const s of segments) {
        if (s == null) continue
        const sStart = Number(s.startKm ?? 0), sEnd = Number(s.endKm ?? 0)
        if (sEnd < visibleKm.startKm || sStart > visibleKm.endKm) continue
        const x = kmToX(Math.max(sStart, 0))
        const x2 = kmToX(Math.min(sEnd, lengthKm))
        const width = Math.max(1, x2 - x)
        ctx.fillStyle = band.color(s)
        ctx.fillRect(x, y, width, 16)
      }

      if (highlightRange?.start != null && highlightRange?.end != null) {
        const hx = kmToX(highlightRange.start)
        const hw = kmToX(highlightRange.end) - kmToX(highlightRange.start)
        if (hw >= 0) {
          ctx.strokeStyle = '#ff4081'
          ctx.setLineDash([6,4])
          ctx.lineWidth = 2
          ctx.strokeRect(hx, y, hw, 16)
          ctx.setLineDash([])
        }
      }
    })

    ctx.strokeStyle = '#9e9e9e'
    ctx.fillStyle = '#616161'
    ctx.lineWidth = 1
    ctx.font = '10px system-ui'
    const minKm = Math.max(0, Math.floor(visibleKm.startKm))
    const maxKm = Math.min(lengthKm, Math.ceil(visibleKm.endKm))
    for (let k = minKm; k <= maxKm; k++) {
      const x = kmToX(k)
      ctx.beginPath()
      ctx.moveTo(x, TOP_PAD + totalBands*HEIGHT_PER_BAND + 2)
      ctx.lineTo(x, TOP_PAD + totalBands*HEIGHT_PER_BAND + 6)
      ctx.stroke()
      ctx.fillText(String(k), x-2, TOP_PAD + totalBands*HEIGHT_PER_BAND + 18)
    }
    ctx.fillText('km', cw-22, TOP_PAD + totalBands*HEIGHT_PER_BAND + 18)

    const firstBandY = TOP_PAD
    ctx.fillStyle = '#00000088'
    for (const s of segments) {
      if (!s) continue
      const sStart = Number(s.startKm ?? 0), sEnd = Number(s.endKm ?? 0)
      if (sEnd < visibleKm.startKm || sStart > visibleKm.endKm) continue
      const hsx = kmToX(sStart)
      ctx.fillRect(hsx - 1, firstBandY, 2, 16)
      const hex = kmToX(sEnd)
      ctx.fillRect(hex - 1, firstBandY, 2, 16)
    }
  }, [segments, panX, zoom, highlightRange, lengthKm, visibleKm])

  const onWheel = (e) => {
    e.preventDefault()
    const { offsetX } = e.nativeEvent
    const mouseKm = xToKm(offsetX)
    const delta = Math.sign(e.deltaY)
    const factor = delta > 0 ? 0.9 : 1.1
    const newZoom = Math.min(500, Math.max(10, zoom * factor))
    const newPanX = LEFT_PAD + (panX + mouseKm*zoom) - (LEFT_PAD + mouseKm*newZoom)
    setZoom(newZoom); setPanX(newPanX)
  }

  const hitHandle = (x, y) => {
    const firstBandY = TOP_PAD
    if (y < firstBandY || y > firstBandY+16) return null
    for (const s of segments) {
      if (!s) continue
      const sStart = Number(s.startKm ?? 0), sEnd = Number(s.endKm ?? 0)
      const sx = kmToX(sStart); if (Math.abs(x - sx) <= HANDLE_HIT_PX) return { segId: s.id, edge:'start', km: sStart }
      const ex = kmToX(sEnd);   if (Math.abs(x - ex) <= HANDLE_HIT_PX) return { segId: s.id, edge:'end',   km: sEnd }
    }
    return null
  }

  const onMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hh = hitHandle(x, y)
    if (hh) { setDrag({ type:'handle', segId: hh.segId, edge: hh.edge, startMouseX: x, origPanX: panX, origKm: hh.km }); return }
    setDrag({ type:'pan', startMouseX: x, origPanX: panX })
  }
  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setHoverHandle(hitHandle(x, y))
    if (!drag) return
    if (drag.type === 'pan') setPanX(drag.origPanX + (x - drag.startMouseX))
  }
  const onMouseUp = async (e) => {
    if (!drag) return
    if (drag.type === 'handle') {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const dropKm = Math.min(Math.max(0, xToKm(x)), lengthKm)
      if (dropKm !== drag.origKm) {
        if (drag.edge === 'start') await onResizeSegment?.(drag.segId, { newStartKm: dropKm })
        else await onResizeSegment?.(drag.segId, { newEndKm: dropKm })
      }
    }
    setDrag(null)
  }

  return (
    <div style={{ border:'1px solid #e0e0e0', borderRadius:8, background:'#fff', padding:8 }}>
      <div style={{ fontWeight:700, marginBottom:8 }}>
        {road?.name ?? 'Road'} — Straight Line Diagram (canvas)
      </div>
      <canvas
        ref={canvasRef}
        style={{ width:'100%', height: canvasHeight, display:'block',
                 cursor: hoverHandle ? 'ew-resize' : (drag?.type==='pan' ? 'grabbing' : 'grab') }}
        width={1200}
        height={canvasHeight}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />
      <div style={{ fontSize:12, color:'#616161', marginTop:6 }}>
        Wheel to zoom, drag to pan. Drag thin black bars (segment edges) to resize.
      </div>
    </div>
  )
}
