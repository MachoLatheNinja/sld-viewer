import React from 'react'

export default function ProjectList({ projects = [], onSelect }) {
  return (
     <div style={{ border:'1px solid #e0e0e0', borderRadius:8, background:'#fff', overflow:'hidden' }}>
      <div style={{ padding:'10px 12px', fontWeight:700, borderBottom:'1px solid #eee' }}>
        Project History
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {projects.length === 0 && <div style={{ padding: 12, fontSize: 12, color: '#9e9e9e' }}>No projects.</div>}
        {projects.map((p, i) => {
          const startKm = Number(p.startKm ?? p.start ?? 0);
          const endKm = Number(p.endKm ?? p.end ?? 0);
          const d = p.date ? new Date(p.date) : null;
          const year = d && !isNaN(d) ? d.getFullYear() : '—';
          const key = p.id ?? p.projectId ?? `${year}-${startKm}-${endKm}-${i}`;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelect?.(p)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px',
                border: 'none', background: 'transparent', cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{year} — {p.type ?? 'Project'}</div>
              <div style={{ fontSize: 12, color: '#616161' }}>{p.details ?? ''}</div>
              <div style={{ fontSize: 12, color: '#9e9e9e' }}>
                {(startKm * 1000).toFixed(0)}–{(endKm * 1000).toFixed(0)} m
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}