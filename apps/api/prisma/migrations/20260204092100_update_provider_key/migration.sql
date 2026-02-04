/*
  Warnings:

  - A unique constraint covering the columns `[created_by_id,label]` on the table `b_provider_key` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "b_provider_key_created_by_id_label_key" ON "b_provider_key"("created_by_id", "label");
