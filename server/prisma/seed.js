// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create one road
  const road = await prisma.road.create({
    data: {
      name: "Maharlika Highway",
      lengthM: 10000,
      sections: {
        create: [
          {
            startM: 0,
            endM: 10000,
            // all bands, kmPosts, etc. will be linked to this one section
            surfaceBands: {
              create: [
                { startM: 0, endM: 5000, surface: "Asphalt" },
                { startM: 5000, endM: 10000, surface: "Concrete" },
              ],
            },
            aadtBands: {
              create: [
                { startM: 0, endM: 5000, aadt: 12000 },
                { startM: 5000, endM: 10000, aadt: 8000 },
              ],
            },
            statusBands: {
              create: [
                { startM: 0, endM: 10000, status: "Good" },
              ],
            },
            qualityBands: {
              create: [
                { startM: 0, endM: 10000, quality: "Very Good" },
              ],
            },
            lanesBands: {
              create: [
                { startM: 0, endM: 10000, lanes: 2, sideBias: "TOP" },
              ],
            },
            rowWidthBands: {
              create: [
                { startM: 0, endM: 10000, rowWidthM: 20 },
              ],
            },
            municipalityBands: {
              create: [
                { startM: 0, endM: 5000, name: "Lucena City" },
                { startM: 5000, endM: 10000, name: "Sariaya" },
              ],
            },
            bridgeBands: {
              create: [
                { startM: 2000, endM: 2100, name: "Lopez Bridge" },
              ],
            },
            kmPosts: {
              create: [
                { chainageM: 0, lrp: "K0000+000" },
                { chainageM: 1000, lrp: "K0001+000" },
                { chainageM: 2000, lrp: "K0002+000" },
              ],
            },
          },
        ],
      },
      segments: {
        create: [
          { startM: 0, endM: 5000, surface: "Asphalt", lanesLeft: 1, lanesRight: 1, status: "Good", quality: "Very Good" },
          { startM: 5000, endM: 10000, surface: "Concrete", lanesLeft: 1, lanesRight: 1, status: "Good", quality: "Good" },
        ],
      },
    },
    include: { sections: true },
  });

  console.log("Seeded road with one section:", road);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
