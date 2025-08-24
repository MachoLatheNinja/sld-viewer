-- CreateTable
CREATE TABLE "CarriagewayWidthBand" (
    "id" SERIAL NOT NULL,
    "section_id" TEXT NOT NULL,
    "startM" DOUBLE PRECISION NOT NULL,
    "endM" DOUBLE PRECISION NOT NULL,
    "carriagewayWidthM" INTEGER NOT NULL,
    CONSTRAINT "CarriagewayWidthBand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarriagewayWidthBand_section_id_startM_endM_idx" ON "CarriagewayWidthBand"("section_id", "startM", "endM");

-- AddForeignKey
ALTER TABLE "CarriagewayWidthBand" ADD CONSTRAINT "CarriagewayWidthBand_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
