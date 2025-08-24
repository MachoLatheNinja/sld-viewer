import React, { useState } from 'react'

export default function BandAccordion({ groups = [] }) {
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
            <div style={{ padding:'4px 12px 8px 24px' }}>
              {g.bands.map(b => (
                <div key={b.key} style={{ display:'flex', alignItems:'center', margin:'4px 0', border:'1px solid #e0e0e0', borderRadius:4, background:'#fafafa' }}>
                  <div style={{ width:4, alignSelf:'stretch', background:'#90caf9' }} />
                  <div style={{ padding:'4px 8px' }}>{b.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
