import React, { useEffect, useRef } from 'react'
import { bandValue, bandSegmentsAt } from '../bands'
const SURFACE_COLORS = { Asphalt:'#282828', Concrete:'#a1a1a1', Gravel:'#8d6e63' }
const QUALITY_COLORS = { Poor:'#ffb54c', Fair:'#f8d66d', Good:'#7abd7e', Bad:'#ff6961' }
const STATUS_COLORS  = { Open:'#9e9e9e', Closed:'#d32f2f' }

function laneColor(lanes) {
  const min = 2, max = 8
  const t = Math.min(1, Math.max(0, (lanes - min) / (max - min)))
  const start = [0x9E, 0xCA, 0xE1]
  const end = [0x08, 0x30, 0x6B]
  const [r, g, b] = start.map((s, i) => Math.round(s + t * (end[i] - s)))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

function formatAADT(n){
  return n==null ? '' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function BandTrack({ band, layers, domain, guides = [], contentRef, scale }) {
  const canvasRef = useRef(null)
  const trackRef = useRef(null)
  const height = Math.max(18, Math.min(20, Number(band.height) || 20))

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !scale) return
    const ctx = canvas.getContext('2d')
    const w = canvas.clientWidth || 1200
    const h = height
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr,0,0,dpr,0,0)
    ctx.clearRect(0,0,w,h)

    const fromKm = domain?.fromKm ?? 0
    const toKm = domain?.toKm ?? 1

    const drawRanges = (ranges, colorFn, labelFn) => {
      ctx.font = '12px system-ui'
      ctx.textBaseline = 'middle'
      ;(ranges || []).forEach(r => {
        if (r.endKm < fromKm || r.startKm > toKm) return
        const { x, w:segW } = scale.rectPx(
          Math.max(r.startKm, fromKm) * 1000,
          Math.min(r.endKm, toKm) * 1000
        )
        if (segW <= 0) return
        const color = colorFn(r)
        ctx.fillStyle = color
        ctx.fillRect(x, 0, segW, h)
        const label = labelFn ? labelFn(r) : ''
        if (label) {
          const textW = ctx.measureText(label).width
          if (segW >= textW + 4) {
            ctx.fillStyle = '#fff'
            ctx.textAlign = 'center'
            ctx.fillText(label, x + segW / 2, h / 2)
            ctx.textAlign = 'left'
          }
        }
      })

      if (band.key !== 'bridges') {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        for (let i = 0; i < (ranges || []).length - 1; i++) {
          const seamKm = ranges[i].endKm
          if (seamKm <= fromKm || seamKm >= toKm) continue
          const x = scale.strokeXFromM(seamKm * 1000)
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, h)
          ctx.stroke()
        }
      }
    }

    switch (band.key) {
      case 'surface':
        drawRanges(layers?.surface, r => SURFACE_COLORS[r.surface]||'#bdbdbd', r => r.surfacePerLane || r.surface)
        break
      case 'aadt':
        drawRanges(layers?.aadt, () => '#6a1b9a', r => formatAADT(r.aadt))
        break
      case 'status':
        drawRanges(layers?.status, r => STATUS_COLORS[r.status]||'#bdbdbd', r => r.status)
        break
      case 'quality':
        drawRanges(layers?.quality, r => QUALITY_COLORS[r.quality]||'#bdbdbd', r => r.quality)
        break
      case 'rowWidth':
        drawRanges(layers?.rowWidth, () => '#1565c0', r => `${r.rowWidthM} m`)
        break
      case 'carriagewayWidth':
        drawRanges(layers?.carriagewayWidth, () => '#f57c00', r => `${r.carriagewayWidthM} m`)
        break
      case 'lanes':
        drawRanges(layers?.lanes, r => laneColor(r.lanes), r => `${r.lanes} lanes`)
        break
      case 'municipality':
        drawRanges(layers?.municipality, () => '#00796b', r => r.name)
        break
      case 'bridges':
        drawRanges(layers?.bridges, () => '#5d4037', r => r.name)
        break
      default:
        if (band.key.startsWith('miow_')) {
          const year = band.key.split('_')[1]
          drawRanges(layers?.miow?.[year], () => '#1976d2', r => r.typeOfWork || '')
        }
        break
    }
  }, [band, layers, domain, height, scale])

  let guideData = []
  if (contentRef?.current && trackRef.current) {
    const trackRect = trackRef.current.getBoundingClientRect()
    const contentRect = contentRef.current.getBoundingClientRect()
    guideData = guides.map(g => {
      const left = g.left != null ? g.left - trackRect.left + contentRect.left : null
      const segs = g.km != null ? bandSegmentsAt(layers, band.key, g.km) : []
      return { left, segs }
    }).filter(g => g.left != null && g.segs.length > 0)
  }

  return (
    <div ref={trackRef} data-band-key={band.key} style={{ position:'relative', height, overflow:'visible' }}>
      <canvas ref={canvasRef} style={{ width:'100%', height }} />
      {guideData.map((g, gIdx) => g.segs.map((seg, idx) => {
        const lbl = bandValue(band.key, seg)
        if (!lbl) return null
        let transform = 'translate(-50%, -50%)'
        if (g.segs.length === 2) {
          transform = idx === 0
            ? 'translate(calc(-100% - 2px), -50%)'
            : 'translate(2px, -50%)'
        }
        const style = {
          position: 'absolute',
          left: g.left,
          top: '50%',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          borderRadius: 9999,
          padding: '0 6px',
          fontSize: 11,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 40,
          transform,
        }
        return (
          <div key={`${gIdx}-${idx}`} style={style}>
            {lbl}
          </div>
        )
      }))}
    </div>
  )
}
