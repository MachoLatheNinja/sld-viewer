/*
  Warnings:

  - You are about to drop the column `section_id` on the `AadtBand` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `BridgeBand` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `LanesBand` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `MunicipalityBand` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `QualityBand` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `RowWidthBand` table. All the data in the column will be lost.
  - You are about to alter the column `rowWidthM` on the `RowWidthBand` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `aadt` on the `Segment` table. All the data in the column will be lost.
  - You are about to drop the column `sidewalk` on the `Segment` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `StatusBand` table. All the data in the column will be lost.
  - You are about to drop the column `section_id` on the `SurfaceBand` table. All the data in the column will be lost.
  - Added the required column `roadId` to the `AadtBand` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roadId` to the `BridgeBand` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roadId` to the `LanesBand` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roadId` to the `MunicipalityBand` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roadId` to the `QualityBand` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roadId` to the `RowWidthBand` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Segment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roadId` to the `StatusBand` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roadId` to the `SurfaceBand` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SideBias" AS ENUM ('TOP', 'BOTTOM');

-- DropForeignKey
ALTER TABLE "AadtBand" DROP CONSTRAINT "AadtBand_section_id_fkey";

-- DropForeignKey
ALTER TABLE "BridgeBand" DROP CONSTRAINT "BridgeBand_section_id_fkey";

-- DropForeignKey
ALTER TABLE "KmPost" DROP CONSTRAINT "KmPost_section_id_fkey";

-- DropForeignKey
ALTER TABLE "LanesBand" DROP CONSTRAINT "LanesBand_section_id_fkey";

-- DropForeignKey
ALTER TABLE "MunicipalityBand" DROP CONSTRAINT "MunicipalityBand_section_id_fkey";

-- DropForeignKey
ALTER TABLE "QualityBand" DROP CONSTRAINT "QualityBand_section_id_fkey";

-- DropForeignKey
ALTER TABLE "RowWidthBand" DROP CONSTRAINT "RowWidthBand_section_id_fkey";

-- DropForeignKey
ALTER TABLE "StatusBand" DROP CONSTRAINT "StatusBand_section_id_fkey";

-- DropForeignKey
ALTER TABLE "SurfaceBand" DROP CONSTRAINT "SurfaceBand_section_id_fkey";

-- DropIndex
DROP INDEX "AadtBand_section_id_startM_endM_idx";

-- DropIndex
DROP INDEX "BridgeBand_section_id_startM_endM_idx";

-- DropIndex
DROP INDEX "LanesBand_section_id_startM_endM_idx";

-- DropIndex
DROP INDEX "MunicipalityBand_section_id_startM_endM_idx";

-- DropIndex
DROP INDEX "QualityBand_section_id_startM_endM_idx";

-- DropIndex
DROP INDEX "RowWidthBand_section_id_startM_endM_idx";

-- DropIndex
DROP INDEX "StatusBand_section_id_startM_endM_idx";

-- DropIndex
DROP INDEX "SurfaceBand_section_id_startM_endM_idx";

-- AlterTable
ALTER TABLE "AadtBand" DROP COLUMN "section_id",
ADD COLUMN     "roadId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "BridgeBand" DROP COLUMN "section_id",
ADD COLUMN     "roadId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "LanesBand" DROP COLUMN "section_id",
ADD COLUMN     "roadId" INTEGER NOT NULL,
ADD COLUMN     "sideBias" "SideBias" NOT NULL DEFAULT 'TOP';

-- AlterTable
ALTER TABLE "MunicipalityBand" DROP COLUMN "section_id",
ADD COLUMN     "roadId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "QualityBand" DROP COLUMN "section_id",
ADD COLUMN     "roadId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "RowWidthBand" DROP COLUMN "section_id",
ADD COLUMN     "roadId" INTEGER NOT NULL,
ALTER COLUMN "rowWidthM" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Section" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Segment" DROP COLUMN "aadt",
DROP COLUMN "sidewalk",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "StatusBand" DROP COLUMN "section_id",
ADD COLUMN     "roadId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SurfaceBand" DROP COLUMN "section_id",
ADD COLUMN     "roadId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "AadtBand_roadId_startM_endM_idx" ON "AadtBand"("roadId", "startM", "endM");

-- CreateIndex
CREATE INDEX "BridgeBand_roadId_startM_endM_idx" ON "BridgeBand"("roadId", "startM", "endM");

-- CreateIndex
CREATE INDEX "LanesBand_roadId_startM_endM_idx" ON "LanesBand"("roadId", "startM", "endM");

-- CreateIndex
CREATE INDEX "MunicipalityBand_roadId_startM_endM_idx" ON "MunicipalityBand"("roadId", "startM", "endM");

-- CreateIndex
CREATE INDEX "QualityBand_roadId_startM_endM_idx" ON "QualityBand"("roadId", "startM", "endM");

-- CreateIndex
CREATE INDEX "RowWidthBand_roadId_startM_endM_idx" ON "RowWidthBand"("roadId", "startM", "endM");

-- CreateIndex
CREATE INDEX "StatusBand_roadId_startM_endM_idx" ON "StatusBand"("roadId", "startM", "endM");

-- CreateIndex
CREATE INDEX "SurfaceBand_roadId_startM_endM_idx" ON "SurfaceBand"("roadId", "startM", "endM");

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
ALTER TABLE "KmPost" ADD CONSTRAINT "KmPost_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "KmPost_section_chainageM_idx" RENAME TO "KmPost_section_id_chainageM_idx";
