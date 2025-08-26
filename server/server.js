const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')
require('dotenv').config({ path: './.env' })

const { PrismaClient, Prisma } = require('@prisma/client')
const prisma = new PrismaClient()

;(async () => {
  try {
    const info = await prisma.$queryRaw`SELECT current_database() AS db, current_schema() AS sch`
    console.log('[DB]', info[0])
  } catch (e) {
    console.error('DB info error:', e)
  }
})()

const app = express()
app.use(cors())
app.use(bodyParser.json())

// Log all incoming requests to help debug proxy issues
app.use((req, _res, next) => {
  console.log('[API]', req.method, req.originalUrl)
  next()
})

const PORT = process.env.PORT || 4000
const EPS = 1e-3
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)) // used for non-bridge bands

// ---------- helpers ----------
const BAND_META = {
  surface:      { client: (tx)=>tx.surfaceBand,      valueFields: ['surface','surfacePerLane'] },
  aadt:         { client: (tx)=>tx.aadtBand,         valueField: 'aadt'       },
  status:       { client: (tx)=>tx.statusBand,       valueField: 'status'     },
  quality:      { client: (tx)=>tx.qualityBand,      valueField: 'quality'    },
  lanes:        { client: (tx)=>tx.lanesBand,        valueField: 'lanes'      },
  rowWidth:     { client: (tx)=>tx.rowWidthBand,     valueField: 'rowWidthM'  },
  carriagewayWidth: { client: (tx)=>tx.carriagewayWidthBand, valueField: 'carriagewayWidthM' },
  municipality: { client: (tx)=>tx.municipalityBand, valueField: 'name'       },
  bridges:      { client: (tx)=>tx.bridgeBand,       valueField: 'name'       },
}

function eqVal(a,b){
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a-b) < EPS
  return a === b
}

function eqRow(a = {}, b = {}, meta = {}){
  const fields = meta.valueFields || (meta.valueField ? [meta.valueField] : [])
  return fields.every(f => eqVal(a[f], b[f]))
}

// ---------- health ----------
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// ---------- roads ----------
app.get('/api/roads', async (req, res) => {
  const q = (req.query.q ?? '').toString().trim()
  const roads = await prisma.road.findMany({
    where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
    orderBy: { id: 'asc' },
  })
  res.json(roads)
})

// all layers (per-band tables)
app.get('/api/roads/:id/layers', async (req, res) => {
  const roadId = req.params.id
  const road = await prisma.road.findUnique({ where: { id: roadId } })
  if (!road) return res.status(404).json({ error: 'Road not found' })
  const sections = await prisma.section.findMany({ where: { roadId }, orderBy: [{ startM: 'asc' }, { id: 'asc' }] })
  const sectionIds = sections.map(s => s.id)

  const [
    surface, aadt, status, quality, lanes, rowWidth, carriagewayWidth, municipality, bridges, kmPosts, miow
  ] = await Promise.all([
    prisma.surfaceBand.findMany({ where: { sectionId: { in: sectionIds } }, orderBy: [{ startM:'asc' }, { id:'asc' }] }),
    prisma.aadtBand.findMany({ where: { sectionId: { in: sectionIds } }, orderBy: [{ startM:'asc' }, { id:'asc' }] }),
    prisma.statusBand.findMany({ where: { sectionId: { in: sectionIds } }, orderBy: [{ startM:'asc' }, { id:'asc' }] }),
    prisma.qualityBand.findMany({ where: { sectionId: { in: sectionIds } }, orderBy: [{ startM:'asc' }, { id:'asc' }] }),
    prisma.lanesBand.findMany({ where: { sectionId: { in: sectionIds } }, orderBy: [{ startM:'asc' }, { id:'asc' }] }),
    prisma.rowWidthBand.findMany({ where: { sectionId: { in: sectionIds } }, orderBy: [{ startM:'asc' }, { id:'asc' }] }),
    prisma.carriagewayWidthBand.findMany({ where: { sectionId: { in: sectionIds } }, orderBy: [{ startM:'asc' }, { id:'asc' }] }),
    prisma.municipalityBand.findMany({ where: { sectionId: { in: sectionIds } }, orderBy: [{ startM:'asc' }, { id:'asc' }] }),
    prisma.bridgeBand.findMany({ where: { sectionId: { in: sectionIds } }, orderBy: [{ startM:'asc' }, { id:'asc' }] }),
    prisma.kmPost.findMany({ where: { sectionId: { in: sectionIds } }, orderBy: [{ chainageM:'asc' }, { id:'asc' }] }),
    prisma.$queryRaw`SELECT * FROM public.gaa_miow WHERE infra_id IN (${Prisma.join(sectionIds)}) ORDER BY infra_year DESC, start_chainage ASC`,
  ])

  const miowBands = miow.map(r => ({
    id: r.id,
    sectionId: r.infra_id,
    startM: parseFloat(r.start_chainage) || 0,
    endM: parseFloat(r.end_chainage) || 0,
    year: r.infra_year ? Number(r.infra_year) : null,
    typeOfWork: r.type_of_work,
  }))

  res.json({ road, sections, surface, aadt, status, quality, lanes, rowWidth, carriagewayWidth, municipality, bridges, kmPosts, miow: miowBands })
})

app.get('/api/roads/:id/track', async (req, res) => {
  const roadId = req.params.id
  try {
    const sections = await prisma.section.findMany({
      where: { roadId },
      select: { id: true }
    })
    if (!sections.length) return res.json([])

    const ids = sections.map(s => s.id)
    const rows = await prisma.$queryRaw`
      SELECT
        ST_Length(
          ST_LineSubstring(line, 0, ST_LineLocatePoint(line, pt.geom))::geography
        ) / 1000 AS km,
        ST_Y(pt.geom) AS lat,
        ST_X(pt.geom) AS lng
      FROM (
        SELECT ST_LineMerge(ST_Union(geom)) AS line
        FROM public."LRS"
        WHERE section_id IN (${Prisma.join(ids)})
      ) AS m
      CROSS JOIN LATERAL ST_DumpPoints(m.line) AS pt
      ORDER BY km
    `

    const track = rows.map(r => ({
      km: Number(r.km) || 0,
      lat: Number(r.lat) || 0,
      lng: Number(r.lng) || 0,
    }))

    res.json(track)
  } catch (err) {
    console.error('track error:', err)
    res.status(500).json({ error: 'Failed to load track' })
  }
})

// ---- map endpoints ----
const sqlRoute = Prisma.sql`
WITH r AS (
  SELECT ST_LineMerge(ST_UnaryUnion(geom)) AS geom
  FROM public."LRS"
  WHERE lower(trim(section_id)) = lower(trim($1))
)
SELECT
  ST_AsGeoJSON(geom) AS geojson,
  ST_Length(geography(geom)) AS len,
  (SELECT COUNT(*) FROM public."LRS" WHERE lower(trim(section_id)) = lower(trim($1))) AS cnt
FROM r
WHERE geom IS NOT NULL;
`

const sqlPoint = Prisma.sql`
WITH r AS (
  SELECT ST_LineMerge(ST_UnaryUnion(geom)) AS geom
  FROM public."LRS"
  WHERE lower(trim(section_id)) = lower(trim($1))
), d AS (
  SELECT geom, NULLIF(ST_Length(geography(geom)),0) AS len_m
  FROM r WHERE geom IS NOT NULL
)
SELECT ST_AsGeoJSON(
  ST_LineInterpolatePoint(
    geom,
    GREATEST(0, LEAST(1, $2/len_m))
  )
) AS geojson
FROM d;
`

app.get('/api/map/:sectionId/route', async (req, res) => {
  const { sectionId } = req.params
  console.log('[route] sectionId =', JSON.stringify(sectionId))
  try {
    const r = await prisma.$queryRaw(sqlRoute, sectionId)
    const row = r[0]
    if (!r.length || !row.geojson) {
      const near = await prisma.$queryRaw`
        SELECT section_id, length(section_id) AS len
        FROM public."LRS"
        WHERE section_id ILIKE '%' || ${sectionId} || '%'
        GROUP BY section_id ORDER BY section_id LIMIT 5
      `
      return res.status(404).json({
        error: 'route not found',
        sectionId,
        matchesTried: row?.cnt ?? 0,
        nearMatches: near,
      })
    }
    res.json({ type: 'Feature', geometry: JSON.parse(row.geojson), properties: { len: Number(row.len) || 0 } })
  } catch (e) {
    console.error('route error:', e)
    res.status(500).json({ error: 'Failed to load route' })
  }
})

app.get('/api/map/:sectionId/point', async (req, res) => {
  const { sectionId } = req.params
  const m = Number(req.query.m ?? '0')
  console.log('[point] sectionId =', JSON.stringify(sectionId), 'm =', m)
  if (!Number.isFinite(m)) return res.status(400).json({ error: 'm is required' })
  try {
    const r = await prisma.$queryRaw(sqlPoint, sectionId, m)
    const row = r[0]
    if (!r.length || !row.geojson) {
      return res.status(404).json({ error: 'point not found', sectionId, m })
    }
    res.json({ type: 'Feature', geometry: JSON.parse(row.geojson), properties: {} })
  } catch (e) {
    console.error('point error:', e)
    res.status(500).json({ error: 'Failed to locate point' })
  }
})

app.get('/api/map/:sectionId/highlight', async (req, res) => {
  const sectionId = req.params.sectionId
  const from = Number(req.query.from)
  const to = Number(req.query.to)
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return res.status(400).json({ error: 'from and to are required' })
  }
  const a = Math.min(from, to)
  const b = Math.max(from, to)
  try {
    const rows = await prisma.$queryRaw`
      WITH r AS (
        SELECT ST_LineMerge(ST_UnaryUnion(geom)) AS geom
        FROM public."LRS"
        WHERE lower(trim(section_id)) = lower(trim(${sectionId}))
      ), d AS (
        SELECT geom, NULLIF(ST_Length(geography(geom)),0) AS len_m
        FROM r WHERE geom IS NOT NULL
      )
      SELECT ST_AsGeoJSON(
        ST_LineSubstring(
          geom,
          GREATEST(0, LEAST(1, ${a} / len_m)),
          GREATEST(0, LEAST(1, ${b} / len_m))
        )
      ) AS geojson
      FROM d
    `
    const row = rows[0]
    if (!row || !row.geojson) return res.status(404).json({ error: 'segment not found', sectionId, from: a, to: b })
    res.json({ type: 'Feature', geometry: JSON.parse(row.geojson), properties: {} })
  } catch (e) {
    console.error('highlight error:', e)
    res.status(500).json({ error: 'Failed to locate segment' })
  }
})

/**
 * Generic seam move:
 * - Default bands (non-bridges): keep gap-free by tying both sides to the same seam (clamped between neighbors).
 * - Bridges: NO snapping/clamping to neighbors or road ends. We only ensure the row stays valid:
 *       edge='end'   -> endM = m (but minimally > startM)
 *       edge='start' -> startM = m (but minimally < endM)
 *
 * POST /api/roads/:id/bands/:band/move-seam
 * body:
 *   non-bridges: { leftId:number, rightId:number, m:number }
 *   bridges:     { leftId?:number, rightId?:number, m:number, edge:'start'|'end' }
 */
app.post('/api/roads/:id/bands/:band/move-seam', async (req, res) => {
  const roadId = req.params.id
  const band = String(req.params.band)
  const meta = BAND_META[band]
  if (!meta) return res.status(400).json({ error: 'Unknown band' })

  const road = await prisma.road.findUnique({ where: { id: roadId } })
  if (!road) return res.status(404).json({ error: 'Road not found' })

  const sectionIds = (await prisma.section.findMany({ where: { roadId }, select: { id: true } })).map(s => s.id)
  const sectionSet = new Set(sectionIds)

  const { leftId, rightId, m, edge } = req.body || {}
  if (!Number.isFinite(m)) return res.status(400).json({ error: 'm is required' })

  try {
    const rows = await prisma.$transaction(async (tx) => {
      const T = meta.client(tx)

      if (band === 'bridges') {
        // ===== Bridges: no snapping/clamping to neighbors or road bounds =====
        if (edge === 'end') {
          if (!Number.isFinite(leftId)) throw new Error('leftId required for edge=end')
          const left = await T.findUnique({ where: { id: leftId } })
          if (!left || !sectionSet.has(left.sectionId)) throw new Error('left row missing/mismatch')

          // keep row valid (end > start) with minimal epsilon; otherwise use raw m
          let newM = m
          if (!(newM > left.startM + EPS)) newM = left.startM + 0.1
          await T.update({ where: { id: left.id }, data: { endM: newM } })

          // Optional: merge with left neighbor if identical value and contiguous
          const leftNeighbor = await T.findFirst({
            where: { sectionId: { in: sectionIds }, endM: { gte: left.startM - EPS, lte: left.startM + EPS } },
            orderBy: { endM: 'desc' }
          })
          const leftAfter = await T.findUnique({ where: { id: left.id } })
          if (leftNeighbor && leftNeighbor.id !== leftAfter.id &&
              Math.abs(leftNeighbor.endM - leftAfter.startM) < EPS &&
              eqRow(leftNeighbor, leftAfter, meta)) {
            await T.delete({ where: { id: leftNeighbor.id } })
            await T.update({ where: { id: leftAfter.id }, data: { startM: leftNeighbor.startM } })
          }

        } else if (edge === 'start') {
          if (!Number.isFinite(rightId)) throw new Error('rightId required for edge=start')
          const right = await T.findUnique({ where: { id: rightId } })
          if (!right || !sectionSet.has(right.sectionId)) throw new Error('right row missing/mismatch')

          // keep row valid (start < end) with minimal epsilon; otherwise use raw m
          let newM = m
          if (!(newM < right.endM - EPS)) newM = right.endM - 0.1
          await T.update({ where: { id: right.id }, data: { startM: newM } })

          // Optional: merge with right neighbor if identical value and contiguous
          const rightNeighbor = await T.findFirst({
            where: { sectionId: { in: sectionIds }, startM: { gte: right.endM - EPS, lte: right.endM + EPS } },
            orderBy: { startM: 'asc' }
          })
          const rightAfter = await T.findUnique({ where: { id: right.id } })
          if (rightNeighbor && rightNeighbor.id !== rightAfter.id &&
              Math.abs(rightNeighbor.startM - rightAfter.endM) < EPS &&
              eqRow(rightNeighbor, rightAfter, meta)) {
            await T.delete({ where: { id: rightNeighbor.id } })
            await T.update({ where: { id: rightAfter.id }, data: { endM: rightNeighbor.endM } })
          }
        } else {
          throw new Error("edge must be 'start' or 'end' for bridges")
        }

      } else {
        // ===== Default bands: keep gap-free by tying both rows to same seam (with clamping) =====
        if (!Number.isFinite(leftId) || !Number.isFinite(rightId)) {
          throw new Error('leftId and rightId are required for this band')
        }
        let left = await T.findUnique({ where: { id: leftId } })
        let right = await T.findUnique({ where: { id: rightId } })
        if (!left || !right) throw new Error('Seam rows not found')
        if (!sectionSet.has(left.sectionId) || !sectionSet.has(right.sectionId)) throw new Error('Road mismatch')

        if (left.startM > right.startM) { const tmp = left; left = right; right = tmp }

        const minM = left.startM + 0.1
        const maxM = right.endM - 0.1
        const newM = clamp(m, minM, maxM)

        await T.update({ where: { id: left.id },  data: { endM:   newM } })
        await T.update({ where: { id: right.id }, data: { startM: newM } })

        // merge neighbors if equal
        const leftNeighbor = await T.findFirst({
          where: { sectionId: { in: sectionIds }, endM: { gte: left.startM - EPS, lte: left.startM + EPS } },
          orderBy: { endM: 'desc' }
        })
        const leftAfter = await T.findUnique({ where: { id: left.id } })
        if (leftNeighbor && leftNeighbor.id !== leftAfter.id &&
            Math.abs(leftNeighbor.endM - leftAfter.startM) < EPS &&
            eqRow(leftNeighbor, leftAfter, meta)) {
          await T.delete({ where: { id: leftNeighbor.id } })
          await T.update({ where: { id: leftAfter.id }, data: { startM: leftNeighbor.startM } })
        }

        const rightNeighbor = await T.findFirst({
          where: { sectionId: { in: sectionIds }, startM: { gte: right.endM - EPS, lte: right.endM + EPS } },
          orderBy: { startM: 'asc' }
        })
        const rightAfter = await T.findUnique({ where: { id: right.id } })
        if (rightNeighbor && rightNeighbor.id !== rightAfter.id &&
            Math.abs(rightNeighbor.startM - rightAfter.endM) < EPS &&
            eqRow(rightNeighbor, rightAfter, meta)) {
          await T.delete({ where: { id: rightNeighbor.id } })
          await T.update({ where: { id: rightAfter.id }, data: { endM: rightNeighbor.endM } })
        }
      }

      // return fresh rows for this band
      const fresh = await T.findMany({
        where: { sectionId: { in: sectionIds } },
        orderBy: [{ startM:'asc' }, { id:'asc' }]
      })
      return fresh
    })

    res.json({ band, rows })
  } catch (e) {
    console.error('move-seam error:', e)
    res.status(400).json({ error: String(e.message || e) })
  }
})

// static files AFTER api routes
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')))

// distinctive JSON 404 for anything else
app.use((req, res) => {
  res
    .status(404)
    .type('application/json')
    .send(JSON.stringify({ api404: true, method: req.method, path: req.path }))
})

app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`)
})
