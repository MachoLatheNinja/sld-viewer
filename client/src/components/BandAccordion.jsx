import React, { useState } from 'react'
import BandTrack from './BandTrack'

const LABEL_W = 60

export default function BandAccordion({ groups = [], layers, domain, activeKm, guideLeft, contentRef }) {
  const [open, setOpen] = useState(() => new Set(groups.map(g => g.key)))

  const toggle = (key) => {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div>
      {groups.map(g => (
        <div key={g.key} style={{ border:'1px solid #ccc', borderRadius:4, marginBottom:8, background:'#fff' }}>
          <div
            style={{ display:'flex', alignItems:'center', cursor:'pointer', padding:'8px 12px' }}
            onClick={() => toggle(g.key)}
          >
            <span
              style={{
                display:'inline-block',
                transition:'transform 0.2s',
                transform: open.has(g.key) ? 'rotate(90deg)' : 'rotate(0deg)'
              }}
            >
              ❯
            </span>
            <span style={{ marginLeft:8, fontWeight:'bold' }}>{g.title}</span>
          </div>
          {open.has(g.key) && (
            <div style={{ padding:'4px 8px 8px 8px' }}>
              {g.bands.map(b => {
                const h = Math.max(18, Math.min(20, b.height || 20))
                return (
                  <div key={b.key} style={{ margin:'2px 0' }}>
                    <div style={{ display:'flex', height:h, border:'1px solid #e0e0e0', borderRadius:4, overflow:'visible' }}>
                      <div
                        style={{
                          position:'sticky',
                          left:0,
                          display:'flex',
                          alignItems:'center',
                          background:'#fafafa',
                          zIndex:1,
                          flex:`0 0 ${LABEL_W}px`
                        }}
                      >
                        <div style={{ width:4, alignSelf:'stretch', background:'#90caf9' }} />
                        <div style={{ padding:'0 8px', fontSize:12, whiteSpace:'nowrap' }}>{b.title}</div>
                      </div>
                      <div style={{ flex:1, position:'relative', overflow:'visible' }}>
                        <BandTrack
                          band={{ ...b, height:h }}
                          layers={layers}
                          domain={domain}
                          activeKm={activeKm}
                          guideLeft={guideLeft}
                          contentRef={contentRef}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
