import axios from 'axios'

// Use a relative base URL by default so Vite's dev proxy can forward
// /api requests to the backend. In environments without the proxy, the
// origin can be supplied via VITE_API_BASE_URL.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
})

export async function fetchRoads(q = '') {
  const { data } = await api.get('/api/roads', { params: { q } })
  return data.map((r) => ({ ...r, lengthKm: (r.lengthM || 0) / 1000 }))
}

export async function fetchLayers(roadId) {
  const { data } = await api.get(`/api/roads/${roadId}/layers`)
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

export async function fetchRoute(sectionId) {
  const { data } = await api.get(`/api/map/${sectionId}/route`)
  return data
}

export async function fetchPoint(sectionId, m) {
  const { data } = await api.get(`/api/map/${sectionId}/point`, { params: { m } })
  return data
}

export async function fetchHighlight(sectionId, fromM, toM) {
  const { data } = await api.get(`/api/map/${sectionId}/highlight`, { params: { from: fromM, to: toM } })
  return data
}

// ✅ Forward arbitrary extras (e.g., { edge: 'start' } for bridges)
export async function moveBandSeam(roadId, bandKey, leftId, rightId, km, extra = {}) {
  const { data } = await api.post(
    `/api/roads/${roadId}/bands/${bandKey}/move-seam`,
    { leftId, rightId, m: km * 1000, ...extra }
  )
  return data
}
