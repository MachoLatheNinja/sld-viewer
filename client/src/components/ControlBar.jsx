import React, { useMemo } from 'react'
import { formatLRP } from '../lrp'

export default function ControlBar({ road, domain, onDomainChange, showGuide, onToggleGuide, editSeams, onToggleEditSeams, kmPosts = [] }) {
  const lengthKm = Number(road?.lengthKm || 0)
  const from = domain?.fromKm ?? 0
  const to   = domain?.toKm ?? Math.max(10, lengthKm)

  const span = useMemo(()=> Math.max(0.001, to - from), [from, to])

  const jump = (delta) => {
    const newFrom = Math.max(0, from + delta)
    const newTo   = Math.min(lengthKm, to + delta)
    if (newTo > newFrom) onDomainChange(newFrom, newTo)
  }

  const zoom = (factor) => {
    const center = (from + to) / 2
    const newSpan = Math.min(lengthKm, Math.max(0.1, span * factor))
    const newFrom = Math.max(0, center - newSpan/2)
    const newTo   = Math.min(lengthKm, center + newSpan/2)
    if (newTo > newFrom) onDomainChange(newFrom, newTo)
  }

  const fromLabel = formatLRP(from, kmPosts)
  const toLabel   = formatLRP(to, kmPosts)

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, margin:'8px 0' }}>
      <div><b>LRM</b>: {fromLabel} - {toLabel}</div>
      <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
        <button onClick={onToggleGuide} title="Toggle guide" style={{ fontSize:16, background: showGuide ? '#ffd54f' : undefined }}>
          📏
        </button>
        <button onClick={onToggleEditSeams} title="Toggle seam edit" style={{ fontSize:16, background: editSeams ? '#ffd54f' : undefined }}>
          ✂️
        </button>
        <button onClick={()=>jump(-1)}>◀ Pan 1km</button>
        <button onClick={()=>jump(+1)}>Pan 1km ▶</button>
        <button onClick={()=>zoom(0.8)}>Zoom In</button>
        <button onClick={()=>zoom(1.25)}>Zoom Out</button>
      </div>
    </div>
  )
}
