-- AlterTable
ALTER TABLE "b_model_availability" ADD COLUMN     "pricing_synced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricing_synced_at" TIMESTAMPTZ(6),
ADD COLUMN     "tags_synced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags_synced_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "b_model_pricing" ADD COLUMN     "data_source" VARCHAR(20) NOT NULL DEFAULT 'manual',
ADD COLUMN     "source_url" VARCHAR(500);

-- CreateIndex
CREATE INDEX "b_model_availability_pricing_synced_idx" ON "b_model_availability"("pricing_synced");

-- CreateIndex
CREATE INDEX "b_model_availability_tags_synced_idx" ON "b_model_availability"("tags_synced");
