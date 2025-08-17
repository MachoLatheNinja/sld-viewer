-- CreateTable
CREATE TABLE "SurfaceBand" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "surface" TEXT NOT NULL,

    CONSTRAINT "SurfaceBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AadtBand" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "aadt" INTEGER NOT NULL,

    CONSTRAINT "AadtBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusBand" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "StatusBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityBand" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "quality" TEXT NOT NULL,

    CONSTRAINT "QualityBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanesBand" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "lanes" INTEGER NOT NULL,

    CONSTRAINT "LanesBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RowWidthBand" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "rowWidthM" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RowWidthBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MunicipalityBand" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MunicipalityBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BridgeBand" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BridgeBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KmPost" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "KmPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurfaceBand_roadId_startKm_endKm_idx" ON "SurfaceBand"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "AadtBand_roadId_startKm_endKm_idx" ON "AadtBand"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "StatusBand_roadId_startKm_endKm_idx" ON "StatusBand"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "QualityBand_roadId_startKm_endKm_idx" ON "QualityBand"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "LanesBand_roadId_startKm_endKm_idx" ON "LanesBand"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "RowWidthBand_roadId_startKm_endKm_idx" ON "RowWidthBand"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "MunicipalityBand_roadId_startKm_endKm_idx" ON "MunicipalityBand"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "BridgeBand_roadId_startKm_endKm_idx" ON "BridgeBand"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "KmPost_roadId_km_idx" ON "KmPost"("roadId", "km");

-- AddForeignKey
ALTER TABLE "SurfaceBand" ADD CONSTRAINT "SurfaceBand_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AadtBand" ADD CONSTRAINT "AadtBand_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusBand" ADD CONSTRAINT "StatusBand_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityBand" ADD CONSTRAINT "QualityBand_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanesBand" ADD CONSTRAINT "LanesBand_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RowWidthBand" ADD CONSTRAINT "RowWidthBand_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalityBand" ADD CONSTRAINT "MunicipalityBand_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BridgeBand" ADD CONSTRAINT "BridgeBand_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KmPost" ADD CONSTRAINT "KmPost_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
