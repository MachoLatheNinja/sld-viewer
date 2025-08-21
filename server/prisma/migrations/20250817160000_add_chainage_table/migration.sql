-- CreateTable
CREATE TABLE "Chainage" (
    "id" SERIAL PRIMARY KEY,
    "section_id" INTEGER NOT NULL,
    "km_post_id" INTEGER NOT NULL,
    "chainage" DOUBLE PRECISION NOT NULL,
    "lrp" TEXT NOT NULL,
    CONSTRAINT "Chainage_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "Segment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Chainage_km_post_id_fkey" FOREIGN KEY ("km_post_id") REFERENCES "KmPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Chainage_section_km_chainage_idx" ON "Chainage"("section_id", "km_post_id", "chainage");
