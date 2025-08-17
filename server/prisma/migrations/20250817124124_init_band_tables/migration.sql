-- CreateTable
CREATE TABLE "Road" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "lengthKm" DECIMAL(12,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Road_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_surface" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DECIMAL(12,3) NOT NULL,
    "endKm" DECIMAL(12,3) NOT NULL,
    "surface" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "road_surface_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_aadt" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DECIMAL(12,3) NOT NULL,
    "endKm" DECIMAL(12,3) NOT NULL,
    "aadtValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "road_aadt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_lanes" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DECIMAL(12,3) NOT NULL,
    "endKm" DECIMAL(12,3) NOT NULL,
    "lanesLeft" INTEGER,
    "lanesRight" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "road_lanes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_quality" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DECIMAL(12,3) NOT NULL,
    "endKm" DECIMAL(12,3) NOT NULL,
    "quality" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "road_quality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_status" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DECIMAL(12,3) NOT NULL,
    "endKm" DECIMAL(12,3) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "road_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_sidewalk" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DECIMAL(12,3) NOT NULL,
    "endKm" DECIMAL(12,3) NOT NULL,
    "hasSidewalk" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "road_sidewalk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Road_name_idx" ON "Road"("name");

-- CreateIndex
CREATE INDEX "road_surface_roadId_startKm_endKm_idx" ON "road_surface"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "road_aadt_roadId_startKm_endKm_idx" ON "road_aadt"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "road_lanes_roadId_startKm_endKm_idx" ON "road_lanes"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "road_quality_roadId_startKm_endKm_idx" ON "road_quality"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "road_status_roadId_startKm_endKm_idx" ON "road_status"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "road_sidewalk_roadId_startKm_endKm_idx" ON "road_sidewalk"("roadId", "startKm", "endKm");

-- AddForeignKey
ALTER TABLE "road_surface" ADD CONSTRAINT "road_surface_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_aadt" ADD CONSTRAINT "road_aadt_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_lanes" ADD CONSTRAINT "road_lanes_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_quality" ADD CONSTRAINT "road_quality_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_status" ADD CONSTRAINT "road_status_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_sidewalk" ADD CONSTRAINT "road_sidewalk_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE CASCADE ON UPDATE CASCADE;
