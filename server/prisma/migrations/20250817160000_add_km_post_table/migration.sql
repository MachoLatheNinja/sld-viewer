-- CreateTable
CREATE TABLE "KmPost" (
    "id" SERIAL PRIMARY KEY,
    "section_id" INTEGER NOT NULL,
    "chainage" DOUBLE PRECISION NOT NULL,
    "lrp" TEXT NOT NULL,
    CONSTRAINT "KmPost_roadId_fkey" FOREIGN KEY ("section_id") REFERENCES "Road"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "KmPost_road_chainage_idx" ON "KmPost"("section_id", "chainage");
