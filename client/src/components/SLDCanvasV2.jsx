import React, { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_BANDS } from '../bands'
import { parseLrpKm, formatLRP } from '../lrp'

const SURFACE_COLORS = { Asphalt:'#282828', Concrete:'#a1a1a1', Gravel:'#8d6e63' }
const LANE_SURFACE_MAP = { A:'Asphalt', C:'Concrete', G:'Gravel' }
const QUALITY_COLORS = { Poor:'#ffb54c', Fair:'#f8d66d', Good:'#7abd7e', Bad:'#ff6961' }
const STATUS_COLORS  = { Open:'#9e9e9e', Closed:'#d32f2f' }

const LANE_ROW_H = 126
const LANE_UNIT  = 24
const MARK_THICK = 3

const KM_POST_H = 20
const KM_POST_LABEL_H = 14
const KM_POST_GAP = 4
const KM_POST_Y_OFFSET = -6

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

function formatChainage(m){
  return (m==null)? '' : String(m).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function laneColor(lanes) {
  const min = 2
  const max = 8
  const t = Math.min(1, Math.max(0, (lanes - min) / (max - min)))
  const start = [0x9E, 0xCA, 0xE1] // #9ecae1
  const end = [0x08, 0x30, 0x6B]   // #08306b
  const [r, g, b] = start.map((s, i) => Math.round(s + t * (end[i] - s)))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

function fillDiagonalStripes(ctx, x, y, w, h, light, dark, pitch = 20) {
  const stripe = pitch / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()

  ctx.fillStyle = light
  ctx.fillRect(x, y, w, h)

  const start = ((x - y) % pitch + pitch) % pitch
  for (let px = x - start - h; px < x + w + h; px += pitch) {
    ctx.beginPath()
    ctx.moveTo(px, y)
    ctx.lineTo(px + stripe, y)
    ctx.lineTo(px + stripe - h, y + h)
    ctx.lineTo(px - h, y + h)
    ctx.closePath()
    ctx.fillStyle = dark
    ctx.fill()
  }

  ctx.restore()
}

function fillCAAC(ctx, x, y, w, h) {
  const q = h / 4
  ctx.fillStyle = '#a1a1a1'
  ctx.fillRect(x, y, w, q)
  ctx.fillRect(x, y + 3 * q, w, q)
  ctx.fillStyle = '#282828'
  ctx.fillRect(x, y + q, w, h - 2 * q)
}


export default function SLDCanvasV2({
  road,
  layers,
  domain,
  onDomainChange,
  bands = DEFAULT_BANDS,
  onMoveSeam,        // (bandKey, leftId, rightId, km, extra={})
  showGuide,
  canEditSeams,
  onHoverKm,
  onKmToX,
  onLayout,
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
    setPanX(-fromKm * desiredZoom)
  }, [fromKm, toKm, lengthKm])

  const layout = useMemo(()=>{
    let y = TOP_PAD
    const lanesY = y; y += LANE_ROW_H
    // ruler sits just below the road visualization
    const axisY = y + 2
    const kmPostY = axisY + AXIS_H + KM_POST_GAP + KM_POST_Y_OFFSET
    y = kmPostY + KM_POST_H + KM_POST_LABEL_H + GAP
    const bandBoxes = bands.map((b) => {
      const h = Math.max(MIN_BAND_H, Math.min(MAX_BAND_H, Number(b.height)||28))
      const box = { y, h, key: b.key, title: b.title }
      y += h
      return box
    })
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
      const botW = 20
      const h = KM_POST_H
      const rectW = botW
      const rectH = KM_POST_LABEL_H
      const hatchLen = 4
      const cx = Math.round(x) + 0.5
      const color = '#FFC107'

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(cx - topW/2, y)
      ctx.lineTo(cx + topW/2, y)
      ctx.lineTo(cx + botW/2, y + h)
      ctx.lineTo(cx - botW/2, y + h)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect(cx - rectW/2, y + h, rectW, rectH)

      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(cx, y - hatchLen)
      ctx.lineTo(cx, y)
      ctx.moveTo(cx, y + h + rectH)
      ctx.lineTo(cx, y + h + rectH + hatchLen)
      ctx.stroke()

      ctx.fillStyle = '#000'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 8px system-ui'
      ctx.fillText('KM', cx, y + h/2)
      ctx.font = 'bold 10px system-ui'
      ctx.fillText(String(kmValue), cx, y + h + rectH/2)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }

  const biasIsTop = (bias) => {
    const b = String(bias).toUpperCase()
    return b === 'L/S' || b === 'LS' || b === 'TOP'
  }

  const laneInfoAt = (km) => {
    const arr = layers?.lanes || []
    for (const r of arr) {
      if (km >= r.startKm - EPS && km <= r.endKm + EPS) {
        return { lanes: Math.max(1, r.lanes), sideBias: r.sideBias }
      }
    }
    return { lanes: 2, sideBias: 'L/S' }
  }

  const surfaceAt = (km) => {
    const arr = layers?.surface || []
    for (const r of arr) if (km >= r.startKm - EPS && km <= r.endKm + EPS) return r
    return { surface: 'Asphalt' }
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
    onKmToX?.(kmToX)
    onLayout?.(layout)

    // background
    ctx.fillStyle = '#efe9d5'
    ctx.fillRect(0,0,w,h)

    // ROAD strip (no seam lines)
    const xStart = kmToX(fromKm), xEnd = kmToX(toKm)

    // Build breakpoints where lane count or surface changes to reduce
    // the amount of drawing work. This keeps panning responsive even on
    // long stretches of road.
    const bps = new Set([fromKm, toKm])
    const addRange = (r = {}) => {
      const s = Math.max(fromKm, r.startKm ?? fromKm)
      const e = Math.min(toKm,   r.endKm   ?? toKm)
      if (e > s) { bps.add(s); bps.add(e) }
    }
    ;(layers?.lanes || []).forEach(addRange)
    ;(layers?.surface || []).forEach(addRange)
    const kmPoints = Array.from(bps).sort((a, b) => a - b)
    const centerY = layout.lanesY + LANE_ROW_H / 2
    for (let i = 1; i < kmPoints.length; i++) {
      const startKm = kmPoints[i - 1]
      const endKm = kmPoints[i]
      const midKm = (startKm + endKm) / 2
      const { lanes, sideBias } = laneInfoAt(midKm)
      const thickness = Math.max(18, lanes * (LANE_UNIT * 0.9))
      const laneW = thickness / lanes
      const lanesTop = biasIsTop(sideBias) ? Math.ceil(lanes / 2) : Math.floor(lanes / 2)
      const lanesBottom = lanes - lanesTop
      const yTop = centerY - laneW * lanesTop
      const yBot = centerY + laneW * lanesBottom
      const { surface: surf, surfacePerLane } = surfaceAt(midKm)
      const x1 = kmToX(startKm)
      const x2 = kmToX(endKm)

      if (surfacePerLane && surfacePerLane.length >= lanes) {
        for (let lane = 0; lane < lanes; lane++) {
          const code = surfacePerLane[lane]
          const laneSurf = LANE_SURFACE_MAP[code] || surf
          const color = SURFACE_COLORS[laneSurf] || '#707070'
          const y1 = yTop + laneW * lane
          const y2 = y1 + laneW
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.moveTo(x1 - 0.5, Math.floor(y1) + 0.5)
          ctx.lineTo(x2 + 0.5, Math.floor(y1) + 0.5)
          ctx.lineTo(x2 + 0.5, Math.ceil(y2) + 0.5)
          ctx.lineTo(x1 - 0.5, Math.ceil(y2) + 0.5)
          ctx.closePath()
          ctx.fill()
        }
      } else {
        const color = SURFACE_COLORS[surf] || '#707070'
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(x1 - 0.5, Math.floor(yTop) + 0.5)
        ctx.lineTo(x2 + 0.5, Math.floor(yTop) + 0.5)
        ctx.lineTo(x2 + 0.5, Math.ceil(yBot) + 0.5)
        ctx.lineTo(x1 - 0.5, Math.ceil(yBot) + 0.5)
        ctx.closePath()
        ctx.fill()
      }
    }

    // center line
    ctx.fillStyle = '#ffd54f'
    ctx.fillRect(xStart, centerY - MARK_THICK / 2, xEnd - xStart, MARK_THICK)

    // dashed lane divisions for multi-lane roads
    for (let i = 1; i < kmPoints.length; i++) {
      const startKm = kmPoints[i - 1]
      const endKm = kmPoints[i]
      const midKm = (startKm + endKm) / 2
      const { lanes, sideBias } = laneInfoAt(midKm)
      if (lanes > 2) {
        const thickness = Math.max(18, lanes * (LANE_UNIT * 0.9))
        const laneW = thickness / lanes
        const lanesTop = biasIsTop(sideBias) ? Math.ceil(lanes / 2) : Math.floor(lanes / 2)
        const yTop = centerY - laneW * lanesTop
        const x1 = kmToX(startKm)
        const x2 = kmToX(endKm)
        for (let lane = 1; lane < lanes; lane++) {
          const y = yTop + laneW * lane
          if (Math.abs(y - centerY) < 0.1) continue
          ctx.fillStyle = '#ffd54f'
          drawDashes(ctx, x1, x2, y, 12, 10, MARK_THICK)
        }
      }
    }

    // bridge markers
    for (const r of layers?.bridges || []) {
      if (r.endKm < fromKm || r.startKm > toKm) continue
      const startKm = Math.max(fromKm, r.startKm)
      const endKm = Math.min(toKm, r.endKm)
      const x1 = kmToX(startKm)
      const x2 = kmToX(endKm)
      const midKm = (startKm + endKm) / 2
      const { lanes, sideBias } = laneInfoAt(midKm)
      const thickness = Math.max(18, lanes * (LANE_UNIT * 0.9))
      const laneW = thickness / lanes
      const lanesTop = biasIsTop(sideBias) ? Math.ceil(lanes / 2) : Math.floor(lanes / 2)
      const yTop = centerY - laneW * lanesTop
      ctx.strokeStyle = '#5d4037'
      ctx.lineWidth = 4

      // draw bridge symbol: two parallel lines with angled ends
      const topY = yTop - 8
      const bottomY = yTop + thickness + 8
      const flare = 10

      ctx.beginPath()
      // top deck with flared ends
      ctx.moveTo(x1 - flare, topY - flare)
      ctx.lineTo(x1, topY)
      ctx.lineTo(x2, topY)
      ctx.lineTo(x2 + flare, topY - flare)
      // bottom deck with flared ends
      ctx.moveTo(x1 - flare, bottomY + flare)
      ctx.lineTo(x1, bottomY)
      ctx.lineTo(x2, bottomY)
      ctx.lineTo(x2 + flare, bottomY + flare)
      ctx.stroke()
    }

        // KM labels / axis
    ctx.strokeStyle = '#9e9e9e'
    ctx.fillStyle = '#616161'
    ctx.lineWidth = 1
    const spanKm = toKm - fromKm
    const spanM = spanKm * 1000
    if (spanM <= 10000) {
      let stepM = 1000
      if (spanM < 100) stepM = 10
      else if (spanM < 500) stepM = 25
      else if (spanM < 1000) stepM = 50
      else if (spanM < 3000) stepM = 100
      const stepKm = stepM / 1000
      const showSub = stepKm < 1
      const kmPostsArr = (layers?.kmPosts || []).slice().sort((a, b) => a.chainageKm - b.chainageKm)
      const prev = kmPostsArr.filter(p => p.chainageKm < fromKm).slice(-1)[0]
      const next = kmPostsArr.find(p => p.chainageKm > toKm)
      const posts = kmPostsArr.filter(p => p.chainageKm >= fromKm && p.chainageKm <= toKm)
      if (prev) posts.unshift(prev)
      if (next) posts.push(next)
      ctx.textAlign = 'center'
      if (posts.length >= 2) {
        for (let i = 0; i < posts.length; i++) {
          const p = posts[i]
          const nextP = posts[i + 1]
          if (p.chainageKm >= fromKm && p.chainageKm <= toKm) {
            const x = kmToX(p.chainageKm)
            ctx.beginPath()
            ctx.moveTo(x, layout.axisY)
            ctx.lineTo(x, layout.axisY + 6)
            ctx.stroke()
          }
          if (showSub && nextP) {
            const startKm = Math.max(fromKm, p.chainageKm)
            const endKm = Math.min(toKm, nextP.chainageKm)
            let m = Math.ceil((startKm - p.chainageKm) / stepKm) * stepKm + p.chainageKm
            if (m <= p.chainageKm + 1e-9) m += stepKm
            for (; m < endKm - 1e-9 && m < nextP.chainageKm - 1e-9; m += stepKm) {
              const x = kmToX(m)
              ctx.beginPath()
              ctx.moveTo(x, layout.axisY)
              ctx.lineTo(x, layout.axisY + 4)
              ctx.stroke()
              const offsetM = Math.round((m - p.chainageKm) * 1000)
              ctx.font = '10px system-ui'
              ctx.fillText(String(offsetM), x, layout.axisY + 18)
            }
          }
        }
      } else {
        const step = showSub ? stepKm : 1
        const startTick = Math.ceil(fromKm / step) * step
        for (let k = startTick; k <= toKm + 1e-9; k += step) {
          const x = kmToX(k)
          const isWholeKm = Math.abs(k - Math.round(k)) < 1e-9
          ctx.beginPath()
          ctx.moveTo(x, layout.axisY)
          ctx.lineTo(x, layout.axisY + (showSub && !isWholeKm ? 4 : 6))
          ctx.stroke()
          let label
          if (showSub) {
            if (isWholeKm) {
              if (kmPostsArr.some(p => Math.abs(p.chainageKm - k) < 1e-9)) continue
              label = String(Math.round(k))
            } else {
              label = String(Math.round(k * 1000) % 1000)
            }
          } else {
            if (kmPostsArr.some(p => Math.abs(p.chainageKm - k) < 1e-9)) continue
            label = String(Math.round(k))
          }
          ctx.font = '10px system-ui'
          ctx.fillText(label, x, layout.axisY + 18)
        }
      }
      ctx.textAlign = 'left'
      ctx.fillText(showSub ? 'm' : 'km', w-16, layout.axisY+18)
    }

    // ----- BANDS -----
    const drawRanges = (box, ranges, colorFn, labelFn, textColorFn) => {
      if (!ranges) return
      const titleY = box.y + Math.min(16, box.h-6)
      const trackH = box.h - 6
      const trackW = w - LEFT_PAD - RIGHT_PAD
      const trackY = box.y

      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(LEFT_PAD, trackY, trackW, trackH)

      for (const r of ranges) {
        if (r.endKm < fromKm || r.startKm > toKm) continue
        const x1 = Math.round(kmToX(Math.max(r.startKm, fromKm)))
        const x2 = Math.round(kmToX(Math.min(r.endKm, toKm)))
        const ww = Math.max(1, x2 - x1)
        const fill = colorFn(r)
        if (fill && typeof fill === 'object') {
          if (fill.type === 'stripes') {
            fillDiagonalStripes(ctx, x1, trackY, ww, trackH, fill.light, fill.dark, fill.pitch)
          } else if (fill.type === 'caac') {
            fillCAAC(ctx, x1, trackY, ww, trackH)
          } else {
            ctx.fillStyle = '#bdbdbd'
            ctx.fillRect(x1, trackY, ww, trackH)
          }
        } else {
          ctx.fillStyle = fill || '#bdbdbd'
          ctx.fillRect(x1, trackY, ww, trackH)
        }

        const lbl = labelFn ? labelFn(r) : ''
        if (lbl) {
          ctx.font = '11px system-ui'
          const textW = ctx.measureText(lbl).width
          const padding = 2
          if (textW + padding * 2 <= ww) {
            ctx.fillStyle = textColorFn ? textColorFn(r) : '#fff'
            ctx.textAlign = 'center'
            ctx.fillText(lbl, x1 + ww / 2, trackY + (trackH / 2) + 3)
            ctx.textAlign = 'left'
          }
        }
      }

      if (box.key !== 'bridges') {
        ctx.fillStyle = '#fff'
        for (let i = 0; i < ranges.length - 1; i++) {
          const seamKm = ranges[i].endKm
          if (seamKm <= fromKm || seamKm >= toKm) continue
          const x = Math.round(kmToX(seamKm))
          ctx.fillRect(x, trackY, 1, trackH)
        }
      }

      ctx.fillStyle = '#424242'
      ctx.font = '12px system-ui'
      ctx.fillText(box.title, 4, titleY)
    }

    for (const box of layout.bandBoxes) {
      switch (box.key) {
        case 'surface':
          drawRanges(
            box,
            layers?.surface,
            r => (
              r.surfacePerLane === 'CAAC'
                ? { type: 'caac' }
                : (SURFACE_COLORS[r.surface] || '#bdbdbd')
            ),
            r => r.surfacePerLane || r.surface
          )
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
        case 'carriagewayWidth':
          drawRanges(box, layers?.carriagewayWidth, () => '#f57c00', r => `${r.carriagewayWidthM} m`)
          break
        case 'lanes':
          drawRanges(box, layers?.lanes, r => laneColor(r.lanes), r => `${r.lanes} lanes`)
          break
        case 'municipality':
          drawRanges(box, layers?.municipality, () => '#00796b', r => r.name)
          break
        case 'bridges':
          drawRanges(box, layers?.bridges, () => '#5d4037', r => r.name)
          break
        default:
          if (box.key.startsWith('miow_')) {
            const year = box.key.split('_')[1]
            drawRanges(box, layers?.miow?.[year], () => '#1976d2', r => r.typeOfWork || '')
          }
          break
      }
    }
    // kilometer posts from kmPost table (if any)
    let kmPosts = (layers?.kmPosts || [])
      .filter(p => p.chainageKm >= fromKm && p.chainageKm <= toKm)

    // When zoomed out beyond 10 km, trim posts to keep labels readable.
    if (spanM > 10000) {
      kmPosts = kmPosts.filter(p => {
        const kmVal = parseLrpKm(p.lrp)
        if (kmVal == null) return false
        const rounded = Math.round(kmVal)
        return spanM > 50000 ? rounded % 10 === 0 : rounded % 5 === 0
      })
    }

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
    if (key.startsWith('miow_')) {
      const year = key.split('_')[1]
      return layers.miow?.[year] || []
    }
    switch (key) {
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

  const bandValue = (key, r) => {
    if (key.startsWith('miow_')) return r.typeOfWork
    switch (key) {
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

  const valuesAt = (key, km) => {
    const arr = bandArrayByKey(key)
    for (let i = 0; i < arr.length; i++) {
      const r = arr[i]
      if (km >= r.startKm - EPS && km <= r.endKm + EPS) {
        if (key === 'bridges') {
          if (Math.abs(km - r.startKm) < EPS) {
            const prev = arr[i - 1]
            if (prev && Math.abs(prev.endKm - r.startKm) < EPS) {
              return { left: bandValue(key, prev), right: bandValue(key, r) }
            }
            return { right: bandValue(key, r) }
          }
          if (Math.abs(km - r.endKm) < EPS) {
            const next = arr[i + 1]
            if (next && Math.abs(next.startKm - r.endKm) < EPS) {
              return { left: bandValue(key, r), right: bandValue(key, next) }
            }
            return { left: bandValue(key, r) }
          }
          return { center: bandValue(key, r) }
        } else {
          if (Math.abs(km - r.endKm) < EPS && arr[i + 1]) {
            return { left: bandValue(key, r), right: bandValue(key, arr[i + 1]) }
          }
          if (Math.abs(km - r.startKm) < EPS && arr[i - 1]) {
            return { left: bandValue(key, arr[i - 1]), right: bandValue(key, r) }
          }
          return { center: bandValue(key, r) }
        }
      }
    }
    return {}
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
    const currSpan = Math.max(0.001, toKm - fromKm)
    // Use the wheel delta directly for smoother zooming instead of fixed steps.
    const factor = Math.exp(e.deltaY * 0.001)
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
    const seam = canEditSeams ? hitSeamAt(x, y) : null
    if (seam) {
      dragRef.current = { type:'seam', startX:x, startY:y, moved:false, ...seam }
      return
    }
    dragRef.current = { type:'pan', startX:x, startFrom: fromKm, startTo: toKm }
  }

  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const seam = hitSeamAt(x, y)
    e.currentTarget.style.cursor = (canEditSeams && seam) ? 'ew-resize' : (dragRef.current?.type==='pan' ? 'grabbing' : 'grab')
    const { xToKm } = helpersRef.current
    if (showGuide) {
      let km = xToKm(x)
      if (seam) {
        if (seam.bandKey === 'bridges') {
          km = seam.edge === 'start' ? seam.right.startKm : seam.left.endKm
        } else {
          km = seam.left.endKm
        }
      }
      onHoverKm?.(km)
    } else {
      onHoverKm?.(null)
    }

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
    } else if (drag.type === 'seam') {
      if (!drag.moved && Math.abs(x - drag.startX) > 2) drag.moved = true
    }
  }

  const onMouseUp = async (e) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || drag.type !== 'seam') return

    if (!drag.moved) {
      let currentKm
      if (drag.bandKey === 'bridges') {
        currentKm = drag.edge === 'start' ? drag.right.startKm : drag.left.endKm
      } else {
        currentKm = drag.left.endKm
      }
      const defaultVal = Math.round(currentKm * 1000)
      const inp = window.prompt('Enter new seam location (meters)', String(defaultVal))
      if (inp == null) return
      const num = Number(inp)
      if (!Number.isFinite(num)) return
      const newKm = num / 1000

      if (drag.bandKey === 'bridges') {
        if (drag.edge === 'end') {
          const next = drag.right || null
          await onMoveSeam?.('bridges', drag.left.id, next?.id ?? null, newKm, { edge:'end' })
        } else if (drag.edge === 'start') {
          const prev = drag.left || null
          await onMoveSeam?.('bridges', prev?.id ?? null, drag.right.id, newKm, { edge:'start' })
        }
      } else {
        await onMoveSeam?.(drag.bandKey, drag.left.id, drag.right.id, newKm)
      }
      return
    }

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

  const onMouseLeave = () => {
    onHoverKm?.(null)
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width:'100%', height: layout.totalH, display:'block', cursor:'grab' }}
      width={1200}
      height={layout.totalH}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    />
  )
}
