export const DEFAULT_BAND_GROUPS = [
  {
    key: 'carriageway',
    title: 'Carriageway Characteristics',
    bands: [
      { key: 'surface', title: 'Surface', height: 20 },
      { key: 'aadt', title: 'AADT', height: 20 },
      { key: 'status', title: 'Status', height: 20 },
      { key: 'quality', title: 'Condition', height: 20 },
      { key: 'rowWidth', title: 'ROW Width', height: 20 },
      { key: 'carriagewayWidth', title: 'CW Width', height: 20 },
      { key: 'lanes', title: 'NoL', height: 20 },
      { key: 'municipality', title: 'Municipality', height: 20 },
      { key: 'bridges', title: 'Bridges', height: 20 },
    ],
  },
  {
    key: 'historical',
    title: 'Historical Projects',
    bands: [],
  },
]

export const DEFAULT_BANDS = DEFAULT_BAND_GROUPS.flatMap(g => g.bands)

// Helpers for looking up band data and values
const EPS = 1e-6

function formatAADT(n) {
  return n == null ? '' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function bandArrayByKey(layers, key) {
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

export function bandValue(key, r) {
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

export function bandSegmentAt(layers, key, km) {
  const arr = bandArrayByKey(layers, key)
  for (const r of arr) {
    if (km >= r.startKm - EPS && km <= r.endKm + EPS) {
      return r
    }
  }
  return null
}

export function bandValueAt(layers, key, km) {
  const seg = bandSegmentAt(layers, key, km)
  return seg ? bandValue(key, seg) : null
}
