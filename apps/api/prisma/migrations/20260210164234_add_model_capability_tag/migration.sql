-- CreateEnum
CREATE TYPE "model_type" AS ENUM ('llm', 'text-embedding', 'speech2text', 'tts', 'moderation', 'rerank', 'image', 'video');

-- AlterTable
ALTER TABLE "b_model_availability" ADD COLUMN     "model_pricing_id" UUID,
ADD COLUMN     "model_type" "model_type" NOT NULL DEFAULT 'llm';

-- CreateTable
CREATE TABLE "b_model_capability_tag" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "model_availability_id" UUID NOT NULL,
    "capability_tag_id" UUID NOT NULL,
    "match_source" VARCHAR(20) NOT NULL DEFAULT 'pattern',
    "confidence" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b_model_capability_tag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "b_model_capability_tag_model_availability_id_idx" ON "b_model_capability_tag"("model_availability_id");

-- CreateIndex
CREATE INDEX "b_model_capability_tag_capability_tag_id_idx" ON "b_model_capability_tag"("capability_tag_id");

-- CreateIndex
CREATE INDEX "b_model_capability_tag_match_source_idx" ON "b_model_capability_tag"("match_source");

-- CreateIndex
CREATE UNIQUE INDEX "b_model_capability_tag_model_availability_id_capability_tag_key" ON "b_model_capability_tag"("model_availability_id", "capability_tag_id");

-- CreateIndex
CREATE INDEX "b_model_availability_model_type_idx" ON "b_model_availability"("model_type");

-- CreateIndex
CREATE INDEX "b_model_availability_model_pricing_id_idx" ON "b_model_availability"("model_pricing_id");

-- AddForeignKey
ALTER TABLE "b_model_availability" ADD CONSTRAINT "b_model_availability_model_pricing_id_fkey" FOREIGN KEY ("model_pricing_id") REFERENCES "b_model_pricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b_model_capability_tag" ADD CONSTRAINT "b_model_capability_tag_model_availability_id_fkey" FOREIGN KEY ("model_availability_id") REFERENCES "b_model_availability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b_model_capability_tag" ADD CONSTRAINT "b_model_capability_tag_capability_tag_id_fkey" FOREIGN KEY ("capability_tag_id") REFERENCES "b_capability_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
