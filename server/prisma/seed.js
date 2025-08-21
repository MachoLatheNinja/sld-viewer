/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const road = await prisma.road.create({
    data: { name: 'NH-12 Demo Corridor', lengthM: 20000 },
  })

  const [section1, section2] = await Promise.all([
    prisma.section.create({ data: { roadId: road.id, startM: 0, endM: 10000 } }),
    prisma.section.create({ data: { roadId: road.id, startM: 10000, endM: 20000 } }),
  ])

  const sec = (m) => (m < 10000 ? section1.id : section2.id)

  await prisma.surfaceBand.createMany({
    data: [
      { sectionId: sec(0), startM: 0, endM: 6000, surface: 'Asphalt' },
      { sectionId: sec(6000), startM: 6000, endM: 12000, surface: 'Concrete' },
      { sectionId: sec(12000), startM: 12000, endM: 20000, surface: 'Gravel' },
    ],
  })

  await prisma.aadtBand.createMany({
    data: [
      { sectionId: sec(0), startM: 0, endM: 5000, aadt: 16000 },
      { sectionId: sec(5000), startM: 5000, endM: 12000, aadt: 27000 },
      { sectionId: sec(12000), startM: 12000, endM: 20000, aadt: 32000 },
    ],
  })

  await prisma.statusBand.createMany({
    data: [
      { sectionId: sec(0), startM: 0, endM: 14000, status: 'Open' },
      { sectionId: sec(14000), startM: 14000, endM: 20000, status: 'Closed' },
    ],
  })

  await prisma.qualityBand.createMany({
    data: [
      { sectionId: sec(0), startM: 0, endM: 4000, quality: 'Good' },
      { sectionId: sec(4000), startM: 4000, endM: 10000, quality: 'Fair' },
      { sectionId: sec(10000), startM: 10000, endM: 20000, quality: 'Excellent' },
    ],
  })

  await prisma.lanesBand.createMany({
    data: [
      { sectionId: sec(0), startM: 0, endM: 6000, lanes: 2 },
      { sectionId: sec(6000), startM: 6000, endM: 12000, lanes: 3 },
      { sectionId: sec(12000), startM: 12000, endM: 20000, lanes: 4 },
    ],
  })

  await prisma.rowWidthBand.createMany({
    data: [
      { sectionId: sec(0), startM: 0, endM: 8000, rowWidthM: 20 },
      { sectionId: sec(8000), startM: 8000, endM: 20000, rowWidthM: 30 },
    ],
  })

  await prisma.municipalityBand.createMany({
    data: [
      { sectionId: sec(0), startM: 0, endM: 7500, name: 'San Isidro' },
      { sectionId: sec(7500), startM: 7500, endM: 14000, name: 'Sta. Maria' },
      { sectionId: sec(14000), startM: 14000, endM: 20000, name: 'San Rafael' },
    ],
  })

  await prisma.bridgeBand.createMany({
    data: [
      { sectionId: sec(3200), startM: 3200, endM: 3500, name: 'Mabini Bridge' },
      { sectionId: sec(11000), startM: 11000, endM: 11200, name: 'Carmelita Br.' },
    ],
  })

  await prisma.kmPost.createMany({
    data: [
      { sectionId: sec(0), chainageM: 0, lrp: 'KM 0' },
      { sectionId: sec(1000), chainageM: 1000, lrp: 'KM 1' },
      { sectionId: sec(2000), chainageM: 2000, lrp: 'KM 2' },
      { sectionId: sec(5000), chainageM: 5000, lrp: 'KM 5' },
      { sectionId: sec(10000), chainageM: 10000, lrp: 'KM 10' },
      { sectionId: sec(15000), chainageM: 15000, lrp: 'KM 15' },
      { sectionId: sec(20000), chainageM: 20000, lrp: 'KM 20' },
    ],
  })

  console.log('🌱 Seeded NH-12 with section-based bands and km posts')
}

main()
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
