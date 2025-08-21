-- Switch measurement units to meters and add Section table

ALTER TABLE "Road" RENAME COLUMN "lengthKm" TO "lengthM";

ALTER TABLE "Segment" RENAME COLUMN "startKm" TO "startM";
ALTER TABLE "Segment" RENAME COLUMN "endKm" TO "endM";
ALTER INDEX "Segment_roadId_startKm_endKm_idx" RENAME TO "Segment_roadId_startM_endM_idx";

CREATE TABLE "Section" (
    "id" SERIAL PRIMARY KEY,
    "roadId" INTEGER NOT NULL,
    "startM" DOUBLE PRECISION NOT NULL,
    "endM" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Section_roadId_fkey" FOREIGN KEY ("roadId") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Section_roadId_startM_endM_idx" ON "Section"("roadId", "startM", "endM");

ALTER TABLE "SurfaceBand" RENAME COLUMN "startKm" TO "startM";
ALTER TABLE "SurfaceBand" RENAME COLUMN "endKm" TO "endM";
ALTER INDEX "SurfaceBand_roadId_startKm_endKm_idx" RENAME TO "SurfaceBand_roadId_startM_endM_idx";

ALTER TABLE "AadtBand" RENAME COLUMN "startKm" TO "startM";
ALTER TABLE "AadtBand" RENAME COLUMN "endKm" TO "endM";
ALTER INDEX "AadtBand_roadId_startKm_endKm_idx" RENAME TO "AadtBand_roadId_startM_endM_idx";

ALTER TABLE "StatusBand" RENAME COLUMN "startKm" TO "startM";
ALTER TABLE "StatusBand" RENAME COLUMN "endKm" TO "endM";
ALTER INDEX "StatusBand_roadId_startKm_endKm_idx" RENAME TO "StatusBand_roadId_startM_endM_idx";

ALTER TABLE "QualityBand" RENAME COLUMN "startKm" TO "startM";
ALTER TABLE "QualityBand" RENAME COLUMN "endKm" TO "endM";
ALTER INDEX "QualityBand_roadId_startKm_endKm_idx" RENAME TO "QualityBand_roadId_startM_endM_idx";

ALTER TABLE "LanesBand" RENAME COLUMN "startKm" TO "startM";
ALTER TABLE "LanesBand" RENAME COLUMN "endKm" TO "endM";
ALTER INDEX "LanesBand_roadId_startKm_endKm_idx" RENAME TO "LanesBand_roadId_startM_endM_idx";

ALTER TABLE "RowWidthBand" RENAME COLUMN "startKm" TO "startM";
ALTER TABLE "RowWidthBand" RENAME COLUMN "endKm" TO "endM";
ALTER INDEX "RowWidthBand_roadId_startKm_endKm_idx" RENAME TO "RowWidthBand_roadId_startM_endM_idx";

ALTER TABLE "MunicipalityBand" RENAME COLUMN "startKm" TO "startM";
ALTER TABLE "MunicipalityBand" RENAME COLUMN "endKm" TO "endM";
ALTER INDEX "MunicipalityBand_roadId_startKm_endKm_idx" RENAME TO "MunicipalityBand_roadId_startM_endM_idx";

ALTER TABLE "BridgeBand" RENAME COLUMN "startKm" TO "startM";
ALTER TABLE "BridgeBand" RENAME COLUMN "endKm" TO "endM";
ALTER INDEX "BridgeBand_roadId_startKm_endKm_idx" RENAME TO "BridgeBand_roadId_startM_endM_idx";

ALTER TABLE "KmPost" RENAME COLUMN "chainage" TO "chainageM";
ALTER INDEX "KmPost_road_chainage_idx" RENAME TO "KmPost_road_chainageM_idx";
