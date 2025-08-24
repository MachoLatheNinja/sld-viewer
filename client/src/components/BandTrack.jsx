import React, { useEffect, useRef } from 'react'

const LEFT_PAD = 0
const RIGHT_PAD = 16
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

export default function BandTrack({ band, layers, domain }) {
  const canvasRef = useRef(null)
  const height = Math.max(18, Math.min(20, Number(band.height) || 20))

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
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
    const spanKm = Math.max(0.0001, toKm - fromKm)
    const scale = (w - LEFT_PAD - RIGHT_PAD) / spanKm
    const kmToX = km => LEFT_PAD + (km - fromKm) * scale

    const drawRanges = (ranges, colorFn, labelFn) => {
      ctx.font = '12px system-ui'
      ctx.textBaseline = 'middle'
      ;(ranges || []).forEach(r => {
        if (r.endKm < fromKm || r.startKm > toKm) return
        const x1 = kmToX(Math.max(r.startKm, fromKm))
        const x2 = kmToX(Math.min(r.endKm, toKm))
        const segW = Math.max(0, x2 - x1)
        const color = colorFn(r)
        ctx.fillStyle = color
        ctx.fillRect(x1, 0, segW, h)
        const label = labelFn ? labelFn(r) : ''
        if (label) {
          const textW = ctx.measureText(label).width
          if (segW >= textW + 4) {
            ctx.fillStyle = '#000'
            ctx.textAlign = 'left'
            ctx.fillText(label, x1 + 2, h / 2)
          }
        }
      })
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
  }, [band, layers, domain, height])

  return <canvas ref={canvasRef} style={{ width:'100%', height }} />
}
