/*
  Warnings:

  - Made the column `label` on table `b_provider_key` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "b_provider_key" ADD COLUMN     "api_type" VARCHAR(50),
ALTER COLUMN "label" SET NOT NULL;

-- CreateIndex
CREATE INDEX "b_provider_key_api_type_idx" ON "b_provider_key"("api_type");
