import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// roads & segments
export async function fetchRoads(q='') {
  const { data } = await axios.get(`${API}/api/roads`, { params: { q }})
  return data
}
export async function fetchSegments(roadId) {
  const { data } = await axios.get(`${API}/api/roads/${roadId}/segments`)
  return data
}

/**
 * Resize a segment boundary on the server.
 * If your server doesn’t have this endpoint wired yet, this function will
 * simply refetch segments so the UI remains consistent.
 */
export async function resizeSegment(segmentId, payload) {
  try {
    const { data } = await axios.post(`${API}/api/segments/${segmentId}/resize`, payload)
    return data
  } catch {
    // fallback: refetch road 1 (adjust if needed)
    const { data } = await axios.get(`${API}/api/roads/1/segments`)
    return data
  }
}
