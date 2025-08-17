const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
require('dotenv').config({ path: './.env' })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const app = express()
app.use(cors())
app.use(bodyParser.json())

const PORT = process.env.PORT || 4000
const EPS = 1e-6
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// ----- demo helpers -----
async function createDemoSegments(roadId) {
  const demo = [
    { startKm: 0.0,  endKm: 4.0,  lanesLeft: 2, lanesRight: 2, surface: 'Asphalt',  status:'Open',   quality:'Good',      sidewalk:true,  aadt: 18000 },
    { startKm: 4.0,  endKm: 8.0,  lanesLeft: 2, lanesRight: 2, surface: 'Concrete', status:'Open',   quality:'Fair',      sidewalk:false, aadt: 26500 },
    { startKm: 8.0,  endKm:12.5,  lanesLeft: 3, lanesRight: 3, surface: 'Concrete', status:'Open',   quality:'Fair',      sidewalk:false, aadt: 28000 },
    { startKm:12.5,  endKm:20.0, lanesLeft: 3, lanesRight: 3, surface: 'Asphalt',  status:'Closed', quality:'Excellent', sidewalk:true,  aadt: 31000 },
  ]
  for (const s of demo) await prisma.segment.create({ data: { roadId, ...s } })
}

async function ensureRoadAndSegments() {
  // if no road exists, create one with demo segments
  const roads = await prisma.road.findMany({ orderBy: { id: 'asc' } })
  if (roads.length === 0) {
    const road = await prisma.road.create({ data: { name: 'NH-12 Demo Corridor', lengthKm: 20 } })
    await createDemoSegments(road.id)
    return
  }
  // if a road exists but has no segments, seed segments for it
  for (const r of roads) {
    const count = await prisma.segment.count({ where: { roadId: r.id } })
    if (count === 0) await createDemoSegments(r.id)
  }
}

// health check
app.get('/health', (req, res) => res.json({ ok: true }))

// ----- roads -----
app.get('/api/roads', async (req, res) => {
  await ensureRoadAndSegments()
  const q = (req.query.q ?? '').toString().trim()
  const roads = await prisma.road.findMany({
    where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
    orderBy: { id: 'asc' },
  })
  res.json(roads)
})

// ----- segments for a road -----
app.get('/api/roads/:id/segments', async (req, res) => {
  const roadId = Number(req.params.id)
  const road = await prisma.road.findUnique({ where: { id: roadId } })
  if (!road) return res.status(404).json({ error: 'Road not found' })

  // self-heal if no segments
  const segCount = await prisma.segment.count({ where: { roadId } })
  if (segCount === 0) await createDemoSegments(roadId)

  const segments = await prisma.segment.findMany({
    where: { roadId },
    orderBy: [{ startKm: 'asc' }, { id: 'asc' }],
  })
  res.json({ road, segments })
})

/**
 * Resize a segment boundary (keeps neighbors continuous where possible)
 * POST /api/segments/:id/resize
 * body: { newStartKm?: number, newEndKm?: number }
 */
app.post('/api/segments/:id/resize', async (req, res) => {
  const id = Number(req.params.id)
  const seg = await prisma.segment.findUnique({ where: { id } })
  if (!seg) return res.status(404).json({ error: 'Segment not found' })

  const road = await prisma.road.findUnique({ where: { id: seg.roadId } })
  if (!road) return res.status(404).json({ error: 'Road not found' })

  let { newStartKm, newEndKm } = req.body || {}
  const hasStart = Number.isFinite(newStartKm)
  const hasEnd   = Number.isFinite(newEndKm)
  if (!hasStart && !hasEnd) return res.status(400).json({ error: 'Provide newStartKm or newEndKm' })

  const siblings = await prisma.segment.findMany({
    where: { roadId: seg.roadId },
    orderBy: [{ startKm: 'asc' }, { id: 'asc' }],
  })
  const idx = siblings.findIndex(s => s.id === seg.id)
  const prev = idx > 0 ? siblings[idx - 1] : null
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null

  let startKm = seg.startKm
  let endKm   = seg.endKm

  if (hasStart) {
    newStartKm = clamp(Number(newStartKm), 0, road.lengthKm)
    startKm = Math.min(newStartKm, endKm - 0.0005)
  }
  if (hasEnd) {
    newEndKm = clamp(Number(newEndKm), 0, road.lengthKm)
    endKm = Math.max(newEndKm, startKm + 0.0005)
  }

  if (prev) startKm = Math.max(startKm, prev.startKm + 0.0005)
  if (next) endKm   = Math.min(endKm,   next.endKm   - 0.0005)
  if (endKm <= startKm) return res.status(400).json({ error: 'Resize would invert or eliminate segment' })

  await prisma.$transaction(async (tx) => {
    await tx.segment.update({ where: { id: seg.id }, data: { startKm, endKm } })
    if (hasEnd && next && Math.abs(next.startKm - seg.endKm) < 0.01) {
      await tx.segment.update({ where: { id: next.id }, data: { startKm: endKm } })
    }
    if (hasStart && prev && Math.abs(prev.endKm - seg.startKm) < 0.01) {
      await tx.segment.update({ where: { id: prev.id }, data: { endKm: startKm } })
    }
  })

  const fresh = await prisma.segment.findMany({
    where: { roadId: seg.roadId },
    orderBy: [{ startKm: 'asc' }, { id: 'asc' }],
  })
  res.json({ road, segments: fresh })
})

app.listen(PORT, async () => {
  console.log(`API http://localhost:${PORT}`)
  try {
    await ensureRoadAndSegments()
  } catch (e) {
    console.error('⚠️ ensureRoadAndSegments failed:', e?.message || e)
  }
})
