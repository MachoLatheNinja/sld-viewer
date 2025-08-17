-- CreateTable
CREATE TABLE "road_analyzer"."Road" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "lengthKm" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Road_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_analyzer"."Segment" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "surface" TEXT NOT NULL,
    "sidewalk" BOOLEAN NOT NULL,
    "quality" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_analyzer"."Project" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_analyzer"."Bookmark" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Segment_roadId_startKm_endKm_idx" ON "road_analyzer"."Segment"("roadId", "startKm", "endKm");

-- CreateIndex
CREATE INDEX "Project_roadId_date_idx" ON "road_analyzer"."Project"("roadId", "date");

-- CreateIndex
CREATE INDEX "Bookmark_roadId_km_idx" ON "road_analyzer"."Bookmark"("roadId", "km");

-- AddForeignKey
ALTER TABLE "road_analyzer"."Segment" ADD CONSTRAINT "Segment_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "road_analyzer"."Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_analyzer"."Project" ADD CONSTRAINT "Project_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "road_analyzer"."Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_analyzer"."Bookmark" ADD CONSTRAINT "Bookmark_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "road_analyzer"."Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
