/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedForRoad(road) {
  const rid = road.id

  // Legacy segments (optional, keeps the lane diagram fallback alive)
  const segments = [
    { startM:    0,  endM:  4000, lanesLeft: 1, lanesRight: 1, surface: 'Asphalt',  status:'Open',  quality:'Good',      sidewalk:true,  aadt: 18000 },
    { startM: 4000,  endM:  8000, lanesLeft: 1, lanesRight: 1, surface: 'Concrete', status:'Open',  quality:'Fair',      sidewalk:false, aadt: 26500 },
    { startM: 8000,  endM: 12500, lanesLeft: 2, lanesRight: 1, surface: 'Concrete', status:'Open',  quality:'Fair',      sidewalk:false, aadt: 28000 },
    { startM:12500,  endM: 20000, lanesLeft: 2, lanesRight: 2, surface: 'Asphalt',  status:'Closed',quality:'Excellent', sidewalk:true,  aadt: 31000 },
  ]
  for (const s of segments) await prisma.segment.create({ data: { roadId: rid, ...s } })

  await prisma.section.createMany({
    data: [
      { roadId: rid, startM:    0, endM: 10000 },
      { roadId: rid, startM:10000, endM: 20000 },
    ]
  })

  // Independent range bands
  await prisma.surfaceBand.createMany({
    data: [
      { roadId: rid, startM:    0, endM:  6000, surface: 'Asphalt'  },
      { roadId: rid, startM: 6000, endM: 12000, surface: 'Concrete' },
      { roadId: rid, startM:12000, endM: 20000, surface: 'Gravel'   },
    ]
  })

  await prisma.aadtBand.createMany({
    data: [
      { roadId: rid, startM:    0, endM:  5000, aadt: 16000 },
      { roadId: rid, startM: 5000, endM: 12000, aadt: 27000 },
      { roadId: rid, startM:12000, endM: 20000, aadt: 32000 },
    ]
  })

  await prisma.statusBand.createMany({
    data: [
      { roadId: rid, startM:    0, endM: 14000, status: 'Open'   },
      { roadId: rid, startM:14000, endM: 20000, status: 'Closed' },
    ]
  })

  await prisma.qualityBand.createMany({
    data: [
      { roadId: rid, startM:    0, endM:  4000, quality: 'Good'      },
      { roadId: rid, startM: 4000, endM: 10000, quality: 'Fair'      },
      { roadId: rid, startM:10000, endM: 20000, quality: 'Excellent' },
    ]
  })

  await prisma.lanesBand.createMany({
    data: [
      { roadId: rid, startM:    0, endM:  6000, lanes: 2 },
      { roadId: rid, startM: 6000, endM: 12000, lanes: 3 },
      { roadId: rid, startM:12000, endM: 20000, lanes: 4 },
    ]
  })

  await prisma.rowWidthBand.createMany({
    data: [
      { roadId: rid, startM:    0, endM:  8000, rowWidthM: 20 },
      { roadId: rid, startM: 8000, endM: 20000, rowWidthM: 30 },
    ]
  })

  await prisma.municipalityBand.createMany({
    data: [
      { roadId: rid, startM:    0, endM:  7500, name: 'San Isidro'     },
      { roadId: rid, startM: 7500, endM: 14000, name: 'Sta. Maria'     },
      { roadId: rid, startM:14000, endM: 20000, name: 'San Rafael'     },
    ]
  })

  await prisma.bridgeBand.createMany({
    data: [
      { roadId: rid, startM:  3200, endM:  3500, name: 'Mabini Bridge'  },
      { roadId: rid, startM: 11000, endM: 11200, name: 'Carmelita Br.'  },
    ]
  })

  await prisma.kmPost.createMany({
    data: [
      { roadId: rid, chainageM:    0, lrp: 'KM 0'  },
      { roadId: rid, chainageM: 1000, lrp: 'KM 1'  },
      { roadId: rid, chainageM: 2000, lrp: 'KM 2'  },
      { roadId: rid, chainageM: 5000, lrp: 'KM 5'  },
      { roadId: rid, chainageM:10000, lrp: 'KM 10' },
      { roadId: rid, chainageM:15000, lrp: 'KM 15' },
      { roadId: rid, chainageM:20000, lrp: 'KM 20' },
    ]
  })
}

async function main() {
  let road = await prisma.road.findFirst()
  if (!road) {
    road = await prisma.road.create({ data: { name: 'NH-12 Demo Corridor', lengthM: 20000 } })
    await seedForRoad(road)
    console.log('🌱 Seeded NH-12 with independent bands + km posts')
  } else {
    // ensure at least some bands exist
    const counts = await Promise.all([
      prisma.surfaceBand.count({ where: { roadId: road.id } }),
      prisma.lanesBand.count({ where: { roadId: road.id } }),
    ])
    if (counts[0] === 0 || counts[1] === 0) {
      await seedForRoad(road)
      console.log('🌱 Backfilled bands for existing road')
    } else {
      console.log('✅ Seed skipped: data present')
    }
  }
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
