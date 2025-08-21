-- Connect band tables to Section instead of Road

-- SurfaceBand
ALTER TABLE "SurfaceBand" DROP CONSTRAINT "SurfaceBand_roadId_fkey";
ALTER TABLE "SurfaceBand" RENAME COLUMN "roadId" TO "section_id";
ALTER TABLE "SurfaceBand" ADD CONSTRAINT "SurfaceBand_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "SurfaceBand_roadId_startM_endM_idx" RENAME TO "SurfaceBand_section_id_startM_endM_idx";

-- AadtBand
ALTER TABLE "AadtBand" DROP CONSTRAINT "AadtBand_roadId_fkey";
ALTER TABLE "AadtBand" RENAME COLUMN "roadId" TO "section_id";
ALTER TABLE "AadtBand" ADD CONSTRAINT "AadtBand_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "AadtBand_roadId_startM_endM_idx" RENAME TO "AadtBand_section_id_startM_endM_idx";

-- StatusBand
ALTER TABLE "StatusBand" DROP CONSTRAINT "StatusBand_roadId_fkey";
ALTER TABLE "StatusBand" RENAME COLUMN "roadId" TO "section_id";
ALTER TABLE "StatusBand" ADD CONSTRAINT "StatusBand_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "StatusBand_roadId_startM_endM_idx" RENAME TO "StatusBand_section_id_startM_endM_idx";

-- QualityBand
ALTER TABLE "QualityBand" DROP CONSTRAINT "QualityBand_roadId_fkey";
ALTER TABLE "QualityBand" RENAME COLUMN "roadId" TO "section_id";
ALTER TABLE "QualityBand" ADD CONSTRAINT "QualityBand_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "QualityBand_roadId_startM_endM_idx" RENAME TO "QualityBand_section_id_startM_endM_idx";

-- LanesBand
ALTER TABLE "LanesBand" DROP CONSTRAINT "LanesBand_roadId_fkey";
ALTER TABLE "LanesBand" RENAME COLUMN "roadId" TO "section_id";
ALTER TABLE "LanesBand" ADD CONSTRAINT "LanesBand_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "LanesBand_roadId_startM_endM_idx" RENAME TO "LanesBand_section_id_startM_endM_idx";

-- RowWidthBand
ALTER TABLE "RowWidthBand" DROP CONSTRAINT "RowWidthBand_roadId_fkey";
ALTER TABLE "RowWidthBand" RENAME COLUMN "roadId" TO "section_id";
ALTER TABLE "RowWidthBand" ADD CONSTRAINT "RowWidthBand_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "RowWidthBand_roadId_startM_endM_idx" RENAME TO "RowWidthBand_section_id_startM_endM_idx";

-- MunicipalityBand
ALTER TABLE "MunicipalityBand" DROP CONSTRAINT "MunicipalityBand_roadId_fkey";
ALTER TABLE "MunicipalityBand" RENAME COLUMN "roadId" TO "section_id";
ALTER TABLE "MunicipalityBand" ADD CONSTRAINT "MunicipalityBand_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "MunicipalityBand_roadId_startM_endM_idx" RENAME TO "MunicipalityBand_section_id_startM_endM_idx";

-- BridgeBand
ALTER TABLE "BridgeBand" DROP CONSTRAINT "BridgeBand_roadId_fkey";
ALTER TABLE "BridgeBand" RENAME COLUMN "roadId" TO "section_id";
ALTER TABLE "BridgeBand" ADD CONSTRAINT "BridgeBand_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "BridgeBand_roadId_startM_endM_idx" RENAME TO "BridgeBand_section_id_startM_endM_idx";

-- KmPost
ALTER TABLE "KmPost" DROP CONSTRAINT "KmPost_roadId_fkey";
ALTER TABLE "KmPost" RENAME COLUMN "roadId" TO "section_id";
ALTER TABLE "KmPost" ADD CONSTRAINT "KmPost_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "KmPost_road_chainageM_idx" RENAME TO "KmPost_section_chainageM_idx";

