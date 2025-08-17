import axios from 'axios'
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function fetchRoads(q='') {
  const { data } = await axios.get(`${API}/api/roads`, { params: { q } })
  return data
}

export async function fetchSegments(roadId) {
  const { data } = await axios.get(`${API}/api/roads/${roadId}/segments`)
  return data
}

export async function fetchLayers(roadId) {
  const { data } = await axios.get(`${API}/api/roads/${roadId}/layers`)
  return data
}

// ✅ Forward arbitrary extras (e.g., { edge: 'start' } for bridges)
export async function moveBandSeam(roadId, bandKey, leftId, rightId, km, extra = {}) {
  const { data } = await axios.post(
    `${API}/api/roads/${roadId}/bands/${bandKey}/move-seam`,
    { leftId, rightId, km, ...extra }
  )
  return data
}
