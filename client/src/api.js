import axios from 'axios'
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function fetchRoads(q = '') {
  const { data } = await axios.get(`${API}/api/roads`, { params: { q } })
  return data.map((r) => ({ ...r, lengthKm: (r.lengthM || 0) / 1000 }))
}

export async function fetchLayers(roadId) {
  const { data } = await axios.get(`${API}/api/roads/${roadId}/layers`)
  const road = data.road ? { ...data.road, lengthKm: (data.road.lengthM || 0) / 1000 } : null
  const conv = (arr) => (arr || []).map((r) => ({ ...r, startKm: r.startM / 1000, endKm: r.endM / 1000 }))
  const convMiow = (arr) => (arr || []).map((r) => ({ ...r, startKm: r.startM / 1000, endKm: r.endM / 1000 }))
  const kmPosts = (data.kmPosts || []).map((p) => ({ ...p, chainageKm: p.chainageM / 1000 }))
  const sections = conv(data.sections)
  return {
    road,
    sections,
    surface: conv(data.surface),
    aadt: conv(data.aadt),
    status: conv(data.status),
    quality: conv(data.quality),
    lanes: conv(data.lanes),
    rowWidth: conv(data.rowWidth),
    carriagewayWidth: conv(data.carriagewayWidth),
    municipality: conv(data.municipality),
    bridges: conv(data.bridges),
    kmPosts,
    miow: convMiow(data.miow),
  }
}

export async function fetchTrack(roadId) {
  const { data } = await axios.get(`${API}/api/roads/${roadId}/track`)
  return Array.isArray(data) ? data : []
}

// ✅ Forward arbitrary extras (e.g., { edge: 'start' } for bridges)
export async function moveBandSeam(roadId, bandKey, leftId, rightId, km, extra = {}) {
  const { data } = await axios.post(
    `${API}/api/roads/${roadId}/bands/${bandKey}/move-seam`,
    { leftId, rightId, m: km * 1000, ...extra }
  )
  return data
}
