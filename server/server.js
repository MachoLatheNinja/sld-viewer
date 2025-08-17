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

// ---------- helpers ----------
const BAND_META = {
  surface:      { client: (tx)=>tx.surfaceBand,      valueField: 'surface'    },
  aadt:         { client: (tx)=>tx.aadtBand,         valueField: 'aadt'       },
  status:       { client: (tx)=>tx.statusBand,       valueField: 'status'     },
  quality:      { client: (tx)=>tx.qualityBand,      valueField: 'quality'    },
  lanes:        { client: (tx)=>tx.lanesBand,        valueField: 'lanes'      },
  rowWidth:     { client: (tx)=>tx.rowWidthBand,     valueField: 'rowWidthM'  },
  municipality: { client: (tx)=>tx.municipalityBand, valueField: 'name'       },
  bridges:      { client: (tx)=>tx.bridgeBand,       valueField: 'name'       },
}

function eqVal(a,b){
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a-b) < EPS
  return a === b
}

// ---------- health ----------
app.get('/health', (_req, res) => res.json({ ok: true }))

// ---------- roads ----------
app.get('/api/roads', async (req, res) => {
  const q = (req.query.q ?? '').toString().trim()
  const roads = await prisma.road.findMany({
    where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
    orderBy: { id: 'asc' },
  })
  res.json(roads)
})

// legacy segments (optional)
app.get('/api/roads/:id/segments', async (req, res) => {
  const roadId = Number(req.params.id)
  const road = await prisma.road.findUnique({ where: { id: roadId } })
  if (!road) return res.status(404).json({ error: 'Road not found' })
  const segments = await prisma.segment.findMany({
    where: { roadId },
    orderBy: [{ startKm:'asc' }, { id:'asc' }],
  })
  res.json({ road, segments })
})

// all layers (per-band tables)
app.get('/api/roads/:id/layers', async (req, res) => {
  const roadId = Number(req.params.id)
  const road = await prisma.road.findUnique({ where: { id: roadId } })
  if (!road) return res.status(404).json({ error: 'Road not found' })

  const [
    surface, aadt, status, quality, lanes, rowWidth, municipality, bridges, kmPosts
  ] = await Promise.all([
    prisma.surfaceBand.findMany({ where: { roadId }, orderBy: [{ startKm:'asc' }, { id:'asc' }] }),
    prisma.aadtBand.findMany({ where: { roadId }, orderBy: [{ startKm:'asc' }, { id:'asc' }] }),
    prisma.statusBand.findMany({ where: { roadId }, orderBy: [{ startKm:'asc' }, { id:'asc' }] }),
    prisma.qualityBand.findMany({ where: { roadId }, orderBy: [{ startKm:'asc' }, { id:'asc' }] }),
    prisma.lanesBand.findMany({ where: { roadId }, orderBy: [{ startKm:'asc' }, { id:'asc' }] }),
    prisma.rowWidthBand.findMany({ where: { roadId }, orderBy: [{ startKm:'asc' }, { id:'asc' }] }),
    prisma.municipalityBand.findMany({ where: { roadId }, orderBy: [{ startKm:'asc' }, { id:'asc' }] }),
    prisma.bridgeBand.findMany({ where: { roadId }, orderBy: [{ startKm:'asc' }, { id:'asc' }] }),
    prisma.kmPost.findMany({ where: { roadId }, orderBy: [{ km:'asc' }, { id:'asc' }] }),
  ])

  res.json({ road, surface, aadt, status, quality, lanes, rowWidth, municipality, bridges, kmPosts })
})

/**
 * Generic seam move:
 * - Default bands (non-bridges): keep gap-free by tying both sides to the same seam.
 * - Bridges: allow gaps. You can move either edge:
 *     body: { edge: 'start' | 'end' }
 *   For 'end': update only left.endKm, no overlap with next.startKm (if exists).
 *   For 'start': update only right.startKm, no overlap with prev.endKm (if exists).
 *
 * POST /api/roads/:id/bands/:band/move-seam
 * body:
 *   non-bridges: { leftId:number, rightId:number, km:number }
 *   bridges:     { leftId?:number, rightId?:number, km:number, edge:'start'|'end' }
 */
app.post('/api/roads/:id/bands/:band/move-seam', async (req, res) => {
  const roadId = Number(req.params.id)
  const band = String(req.params.band)
  const meta = BAND_META[band]
  if (!meta) return res.status(400).json({ error: 'Unknown band' })

  const road = await prisma.road.findUnique({ where: { id: roadId } })
  if (!road) return res.status(404).json({ error: 'Road not found' })

  const { leftId, rightId, km, edge } = req.body || {}
  if (!Number.isFinite(km)) return res.status(400).json({ error: 'km is required' })

  try {
    const rows = await prisma.$transaction(async (tx) => {
      const T = meta.client(tx)

      if (band === 'bridges') {
        // allow gaps, allow moving either edge; rightId/leftId may be missing
        if (edge === 'end') {
          if (!Number.isFinite(leftId)) throw new Error('leftId required for edge=end')
          const left = await T.findUnique({ where: { id: leftId } })
          if (!left || left.roadId !== roadId) throw new Error('left row missing/mismatch')

          // find the first row that starts after this left row (if any)
          const next = await T.findFirst({
            where: { roadId, startKm: { gt: left.startKm + EPS } },
            orderBy: { startKm: 'asc' }
          })

          const minKm = left.startKm + 0.0001
          const maxKm = next ? next.startKm - 0.0001 : (road.lengthKm - 0.0001)
          const newKm = clamp(km, minKm, maxKm)
          await T.update({ where: { id: left.id }, data: { endKm: newKm } })

          // optional merge with left neighbor if same value
          const leftNeighbor = await T.findFirst({
            where: { roadId, endKm: { gte: left.startKm - EPS, lte: left.startKm + EPS } },
            orderBy: { endKm: 'desc' }
          })
          const leftAfter = await T.findUnique({ where: { id: left.id } })
          if (leftNeighbor && Math.abs(leftNeighbor.endKm - leftAfter.startKm) < EPS &&
              eqVal(leftNeighbor[meta.valueField], leftAfter[meta.valueField])) {
            await T.delete({ where: { id: leftNeighbor.id } })
            await T.update({ where: { id: leftAfter.id }, data: { startKm: leftNeighbor.startKm } })
          }

        } else if (edge === 'start') {
          if (!Number.isFinite(rightId)) throw new Error('rightId required for edge=start')
          const right = await T.findUnique({ where: { id: rightId } })
          if (!right || right.roadId !== roadId) throw new Error('right row missing/mismatch')

          // find the last row that ends before this right row (if any)
          const prev = await T.findFirst({
            where: { roadId, endKm: { lt: right.endKm + EPS } },
            orderBy: { endKm: 'desc' }
          })

          const minKm = prev ? prev.endKm + 0.0001 : 0.0001
          const maxKm = right.endKm - 0.0001
          const newKm = clamp(km, minKm, maxKm)
          await T.update({ where: { id: right.id }, data: { startKm: newKm } })

          // optional merge with right neighbor if same value
          const rightNeighbor = await T.findFirst({
            where: { roadId, startKm: { gte: right.endKm - EPS, lte: right.endKm + EPS } },
            orderBy: { startKm: 'asc' }
          })
          const rightAfter = await T.findUnique({ where: { id: right.id } })
          if (rightNeighbor && Math.abs(rightNeighbor.startKm - rightAfter.endKm) < EPS &&
              eqVal(rightNeighbor[meta.valueField], rightAfter[meta.valueField])) {
            await T.delete({ where: { id: rightNeighbor.id } })
            await T.update({ where: { id: rightAfter.id }, data: { endKm: rightNeighbor.endKm } })
          }
        } else {
          throw new Error("edge must be 'start' or 'end' for bridges")
        }

      } else {
        // default bands: keep gap-free by tying both sides to same seam
        if (!Number.isFinite(leftId) || !Number.isFinite(rightId)) {
          throw new Error('leftId and rightId are required for this band')
        }
        let left = await T.findUnique({ where: { id: leftId } })
        let right = await T.findUnique({ where: { id: rightId } })
        if (!left || !right) throw new Error('Seam rows not found')
        if (left.roadId !== roadId || right.roadId !== roadId) throw new Error('Road mismatch')

        // enforce ordering
        if (left.startKm > right.startKm) { const tmp = left; left = right; right = tmp }

        const minKm = left.startKm + 0.0001
        const maxKm = right.endKm - 0.0001
        const newKm = clamp(km, minKm, maxKm)

        await T.update({ where: { id: left.id },  data: { endKm:   newKm } })
        await T.update({ where: { id: right.id }, data: { startKm: newKm } })

        // merge neighbors if equal
        const leftNeighbor = await T.findFirst({
          where: { roadId, endKm: { gte: left.startKm - EPS, lte: left.startKm + EPS } },
          orderBy: { endKm: 'desc' }
        })
        const leftAfter = await T.findUnique({ where: { id: left.id } })
        if (leftNeighbor && Math.abs(leftNeighbor.endKm - leftAfter.startKm) < EPS &&
            eqVal(leftNeighbor[meta.valueField], leftAfter[meta.valueField])) {
          await T.delete({ where: { id: leftNeighbor.id } })
          await T.update({ where: { id: leftAfter.id }, data: { startKm: leftNeighbor.startKm } })
        }

        const rightNeighbor = await T.findFirst({
          where: { roadId, startKm: { gte: right.endKm - EPS, lte: right.endKm + EPS } },
          orderBy: { startKm: 'asc' }
        })
        const rightAfter = await T.findUnique({ where: { id: right.id } })
        if (rightNeighbor && Math.abs(rightNeighbor.startKm - rightAfter.endKm) < EPS &&
            eqVal(rightNeighbor[meta.valueField], rightAfter[meta.valueField])) {
          await T.delete({ where: { id: rightNeighbor.id } })
          await T.update({ where: { id: rightAfter.id }, data: { endKm: rightNeighbor.endKm } })
        }
      }

      // return fresh rows for this band
      const fresh = await T.findMany({
        where: { roadId },
        orderBy: [{ startKm:'asc' }, { id:'asc' }]
      })
      return fresh
    })

    res.json({ band, rows })
  } catch (e) {
    console.error('move-seam error:', e)
    res.status(400).json({ error: String(e.message || e) })
  }
})

app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`)
})
