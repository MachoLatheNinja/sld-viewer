/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedForRoad(road) {
  const rid = road.id

  // Legacy segments (optional, keeps the lane diagram fallback alive)
  const segments = [
    { startKm: 0.0,  endKm: 4.0,  lanesLeft: 1, lanesRight: 1, surface: 'Asphalt',  status:'Open',  quality:'Good',      sidewalk:true,  aadt: 18000 },
    { startKm: 4.0,  endKm: 8.0,  lanesLeft: 1, lanesRight: 1, surface: 'Concrete', status:'Open',  quality:'Fair',      sidewalk:false, aadt: 26500 },
    { startKm: 8.0,  endKm:12.5,  lanesLeft: 2, lanesRight: 1, surface: 'Concrete', status:'Open',  quality:'Fair',      sidewalk:false, aadt: 28000 },
    { startKm:12.5,  endKm:20.0,  lanesLeft: 2, lanesRight: 2, surface: 'Asphalt',  status:'Closed',quality:'Excellent', sidewalk:true,  aadt: 31000 },
  ]
  for (const s of segments) await prisma.segment.create({ data: { roadId: rid, ...s } })

  // Independent range bands
  await prisma.surfaceBand.createMany({
    data: [
      { roadId: rid, startKm: 0.0,  endKm: 6.0,  surface: 'Asphalt'  },
      { roadId: rid, startKm: 6.0,  endKm: 12.0, surface: 'Concrete' },
      { roadId: rid, startKm: 12.0, endKm: 20.0, surface: 'Gravel'   },
    ]
  })

  await prisma.aadtBand.createMany({
    data: [
      { roadId: rid, startKm: 0.0,  endKm: 5.0,  aadt: 16000 },
      { roadId: rid, startKm: 5.0,  endKm: 12.0, aadt: 27000 },
      { roadId: rid, startKm: 12.0, endKm: 20.0, aadt: 32000 },
    ]
  })

  await prisma.statusBand.createMany({
    data: [
      { roadId: rid, startKm: 0.0,  endKm: 14.0, status: 'Open'   },
      { roadId: rid, startKm: 14.0, endKm: 20.0, status: 'Closed' },
    ]
  })

  await prisma.qualityBand.createMany({
    data: [
      { roadId: rid, startKm: 0.0,  endKm: 4.0,  quality: 'Good'      },
      { roadId: rid, startKm: 4.0,  endKm: 10.0, quality: 'Fair'      },
      { roadId: rid, startKm: 10.0, endKm: 20.0, quality: 'Excellent' },
    ]
  })

  await prisma.lanesBand.createMany({
    data: [
      { roadId: rid, startKm: 0.0,  endKm: 6.0,  lanes: 2 },
      { roadId: rid, startKm: 6.0,  endKm: 12.0, lanes: 3 },
      { roadId: rid, startKm: 12.0, endKm: 20.0, lanes: 4 },
    ]
  })

  await prisma.rowWidthBand.createMany({
    data: [
      { roadId: rid, startKm: 0.0,  endKm: 8.0,  rowWidthM: 20 },
      { roadId: rid, startKm: 8.0,  endKm: 20.0, rowWidthM: 30 },
    ]
  })

  await prisma.municipalityBand.createMany({
    data: [
      { roadId: rid, startKm: 0.0,  endKm: 7.5,  name: 'San Isidro'     },
      { roadId: rid, startKm: 7.5,  endKm: 14.0, name: 'Sta. Maria'     },
      { roadId: rid, startKm: 14.0, endKm: 20.0, name: 'San Rafael'     },
    ]
  })

  await prisma.bridgeBand.createMany({
    data: [
      { roadId: rid, startKm: 3.2,  endKm: 3.5,  name: 'Mabini Bridge'  },
      { roadId: rid, startKm: 11.0, endKm: 11.2, name: 'Carmelita Br.'  },
    ]
  })

  await prisma.kmPost.createMany({
    data: [
      { roadId: rid, km: 0.0,  label: 'KM 0'  },
      { roadId: rid, km: 1.0,  label: 'KM 1'  },
      { roadId: rid, km: 2.0,  label: 'KM 2'  },
      { roadId: rid, km: 5.0,  label: 'KM 5'  },
      { roadId: rid, km: 10.0, label: 'KM 10' },
      { roadId: rid, km: 15.0, label: 'KM 15' },
      { roadId: rid, km: 20.0, label: 'KM 20' },
    ]
  })
}

async function main() {
  let road = await prisma.road.findFirst()
  if (!road) {
    road = await prisma.road.create({ data: { name: 'NH-12 Demo Corridor', lengthKm: 20 } })
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
