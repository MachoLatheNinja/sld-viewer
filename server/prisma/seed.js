/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedDemo() {
  const road = await prisma.road.create({
    data: { name: 'Demo Corridor A', lengthKm: 20 },
  })

  const base = [
    { startKm: 0.0,  endKm: 4.0,  lanesLeft: 2, lanesRight: 2, surface: 'Asphalt',  status:'Open',   quality:'Good',      sidewalk:true,  aadt: 18000 },
    { startKm: 4.0,  endKm: 8.0,  lanesLeft: 2, lanesRight: 2, surface: 'Concrete', status:'Open',   quality:'Fair',      sidewalk:false, aadt: 26500 },
    { startKm: 8.0,  endKm:12.5,  lanesLeft: 3, lanesRight: 3, surface: 'Concrete', status:'Open',   quality:'Fair',      sidewalk:false, aadt: 28000 },
    { startKm:12.5,  endKm:20.0, lanesLeft: 3, lanesRight: 3, surface: 'Asphalt',  status:'Closed', quality:'Excellent', sidewalk:true,  aadt: 31000 },
  ]
  for (const s of base) {
    await prisma.segment.create({ data: { roadId: road.id, ...s } })
  }
  console.log('🌱 Seeded demo road + segments')
}

async function main() {
  const count = await prisma.road.count()
  if (count === 0) {
    await seedDemo()
  } else {
    console.log('✅ Seed: roads already present; skipping')
  }
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
