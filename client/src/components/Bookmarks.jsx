import React, { useState } from 'react'

export default function Bookmarks({ items, onAdd, onDelete, onGoto }) {
  const [m, setM] = useState('')
  const [label, setLabel] = useState('')

  return (
    <div style={{ border:'1px solid #e0e0e0', borderRadius:8, background:'#fff', overflow:'hidden' }}>
      <div style={{ padding:'10px 12px', fontWeight:700, borderBottom:'1px solid #eee' }}>Bookmarks</div>
      <div style={{ padding:12, display:'flex', gap:8 }}>
        <input value={m} onChange={(e)=>setM(e.target.value)} placeholder="Meters (e.g., 4250)" style={{ flex:'0 0 120px' }}/>
        <input value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="Label" />
        <button
          type="button"
          onClick={()=>{ const v=Number(m); if(!isNaN(v)) { onAdd?.(v/1000, label||undefined); setM(''); setLabel('') } }}
        >
          Add
        </button>
      </div>
      <div style={{ maxHeight:180, overflowY:'auto' }}>
        {items.map(b=>(
          <div key={b.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderTop:'1px solid #f5f5f5' }}>
            <button
              type="button"
              onClick={()=>onGoto?.(b.km)}
              style={{ border:'none', background:'transparent', cursor:'pointer', textAlign:'left', flex:1 }}
            >
              <div style={{ fontSize:13, fontWeight:600 }}>{b.label}</div>
              <div style={{ fontSize:12, color:'#9e9e9e' }}>M {Math.round(b.km * 1000)}</div>
            </button>
            <button type="button" onClick={()=>onDelete?.(b.id)}>🗑️</button>
          </div>
        ))}
        {items.length===0 && <div style={{ padding:12, fontSize:12, color:'#9e9e9e' }}>No bookmarks yet.</div>}
      </div>
    </div>
  )
}