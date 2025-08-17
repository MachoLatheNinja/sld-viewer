/*
  Warnings:

  - You are about to alter the column `lengthKm` on the `Road` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,3)` to `DoublePrecision`.
  - You are about to drop the `road_aadt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `road_lanes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `road_quality` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `road_sidewalk` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `road_status` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `road_surface` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `lengthKm` on table `Road` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "road_aadt" DROP CONSTRAINT "road_aadt_roadId_fkey";

-- DropForeignKey
ALTER TABLE "road_lanes" DROP CONSTRAINT "road_lanes_roadId_fkey";

-- DropForeignKey
ALTER TABLE "road_quality" DROP CONSTRAINT "road_quality_roadId_fkey";

-- DropForeignKey
ALTER TABLE "road_sidewalk" DROP CONSTRAINT "road_sidewalk_roadId_fkey";

-- DropForeignKey
ALTER TABLE "road_status" DROP CONSTRAINT "road_status_roadId_fkey";

-- DropForeignKey
ALTER TABLE "road_surface" DROP CONSTRAINT "road_surface_roadId_fkey";

-- DropIndex
DROP INDEX "Road_name_idx";

-- AlterTable
ALTER TABLE "Road" ALTER COLUMN "lengthKm" SET NOT NULL,
ALTER COLUMN "lengthKm" SET DATA TYPE DOUBLE PRECISION;

-- DropTable
DROP TABLE "road_aadt";

-- DropTable
DROP TABLE "road_lanes";

-- DropTable
DROP TABLE "road_quality";

-- DropTable
DROP TABLE "road_sidewalk";

-- DropTable
DROP TABLE "road_status";

-- DropTable
DROP TABLE "road_surface";

-- CreateTable
CREATE TABLE "Segment" (
    "id" SERIAL NOT NULL,
    "roadId" INTEGER NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "lanesLeft" INTEGER,
    "lanesRight" INTEGER,
    "surface" TEXT,
    "status" TEXT,
    "quality" TEXT,
    "sidewalk" BOOLEAN,
    "aadt" INTEGER,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Segment_roadId_startKm_endKm_idx" ON "Segment"("roadId", "startKm", "endKm");

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
